<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\PlanCatalog;
use App\Models\Venue;
use App\Models\VenueMember;
use App\Services\Billing;
use App\Support\ApiException;
use App\Support\Http;
use App\Support\JwtCookies;
use App\Support\Plans;
use App\Support\Slug;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        Http::rateLimit('reg:'.Http::clientIp($request), 10, 60);
        $body = Http::validate($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string|min:8',
            'venueName' => 'required|string|min:2|max:80',
            'slug' => 'required|string',
            'plan' => 'required|string|min:3|max:48',
        ]);
        $email = strtolower(trim($body['email']));
        $slug = Slug::assertValid($body['slug']);
        if (! preg_match(Plans::ID_REGEX, $body['plan'])) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Plano inválido.');
        }
        $chosen = PlanCatalog::query()->find($body['plan']);
        if (! $chosen || ! $chosen->listed) {
            throw new ApiException(400, 'PLAN_NOT_LISTED', 'Este plano não está à venda.');
        }
        if (Account::query()->where('email', $email)->exists()) {
            throw new ApiException(409, 'EMAIL_TAKEN', 'Este e-mail já tem conta.');
        }
        if (Venue::query()->where('slug', $slug)->exists()) {
            throw new ApiException(409, 'SLUG_TAKEN', 'Este slug já está em uso.');
        }

        $account = Account::query()->create([
            'email' => $email,
            'password_hash' => Hash::make($body['password']),
        ]);
        $venue = Venue::query()->create([
            'owner_account_id' => $account->id,
            'name' => trim($body['venueName']),
            'slug' => $slug,
            'public_id' => bin2hex(random_bytes(6)),
            'plan' => $chosen->id,
            'subscription_status' => 'trial',
            'accepts_orders' => Plans::allowsService((string) $chosen->kind),
            'trial_ends_at' => Billing::trialEndsAt(),
        ]);

        $token = JwtCookies::signVenue(['sub' => $account->id, 'venueId' => $venue->id, 'role' => 'owner']);

        return response()->json([
            'role' => 'owner',
            'redirectPath' => $this->redirect('owner', $venue->plan),
            'account' => ['id' => $account->id, 'email' => $account->email],
            'venue' => Billing::serializeVenue($venue),
        ])->cookie(JwtCookies::cookie((string) config('eaimesa.cookies.owner'), $token, (int) config('eaimesa.owner_jwt_ttl_hours') * 3600));
    }

    public function login(Request $request)
    {
        Http::rateLimit('login:'.Http::clientIp($request), 10, 60);
        $body = Http::validate($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);
        $account = Account::query()->where('email', strtolower(trim($body['email'])))->first();
        if (! $account || ! Hash::check($body['password'], $account->password_hash)) {
            throw new ApiException(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');
        }
        $owned = Venue::query()->where('owner_account_id', $account->id)->first();
        if ($owned) {
            $token = JwtCookies::signVenue(['sub' => $account->id, 'venueId' => $owned->id, 'role' => 'owner']);

            return response()->json([
                'role' => 'owner',
                'redirectPath' => $this->redirect('owner', $owned->plan),
                'account' => ['id' => $account->id, 'email' => $account->email],
                'venue' => Billing::serializeVenue($owned),
            ])->cookie(JwtCookies::cookie((string) config('eaimesa.cookies.owner'), $token, (int) config('eaimesa.owner_jwt_ttl_hours') * 3600));
        }
        $membership = VenueMember::query()
            ->with('venue')
            ->where('account_id', $account->id)
            ->where('active', true)
            ->first();
        if (! $membership || ! $membership->venue) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Conta sem acesso a um estabelecimento.');
        }
        $token = JwtCookies::signVenue([
            'sub' => $account->id,
            'venueId' => $membership->venue_id,
            'role' => 'staff',
            'memberId' => $membership->id,
        ]);

        return response()->json([
            'role' => 'staff',
            'redirectPath' => $this->redirect('staff'),
            'account' => ['id' => $account->id, 'email' => $account->email],
            'member' => ['id' => $membership->id, 'name' => $membership->name],
            'venue' => Billing::serializeVenue($membership->venue),
        ])->cookie(JwtCookies::cookie((string) config('eaimesa.cookies.owner'), $token, (int) config('eaimesa.owner_jwt_ttl_hours') * 3600));
    }

    public function logout()
    {
        return response()->json(['ok' => true])
            ->cookie(JwtCookies::forget((string) config('eaimesa.cookies.owner')));
    }

    public function me(Request $request)
    {
        $session = \App\Http\Middleware\RequireOwner::session($request);
        $account = Account::query()->find($session['sub']);
        $venue = Venue::query()->find($session['venueId']);
        if (! $account || ! $venue) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Sessão inválida.');
        }
        if ($session['role'] === 'owner') {
            if ($venue->owner_account_id !== $account->id) {
                throw new ApiException(401, 'UNAUTHORIZED', 'Sessão inválida.');
            }

            return [
                'role' => 'owner',
                'account' => ['id' => $account->id, 'email' => $account->email],
                'venue' => Billing::serializeVenue($venue),
            ];
        }
        $member = VenueMember::query()
            ->where('id', $session['memberId'] ?? '')
            ->where('account_id', $account->id)
            ->where('active', true)
            ->first();
        if (! $member) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Sessão inválida.');
        }

        return [
            'role' => 'staff',
            'account' => ['id' => $account->id, 'email' => $account->email],
            'member' => ['id' => $member->id, 'name' => $member->name],
            'venue' => Billing::serializeVenue($venue),
        ];
    }

    private function redirect(string $role, ?string $plan = null): string
    {
        if ($role === 'staff') {
            return '/garcom';
        }

        return Plans::allowsService(Billing::planKind($plan ?? '')) ? '/painel/pedidos' : '/painel/cardapio';
    }
}
