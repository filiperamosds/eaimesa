<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillingEvent;
use App\Models\PlanCatalog;
use App\Models\PlatformSetting;
use App\Models\PlatformUser;
use App\Models\Venue;
use App\Services\Billing;
use App\Support\ApiException;
use App\Support\Http;
use App\Support\JwtCookies;
use App\Support\Plans;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class PlatformController extends Controller
{
    public function login(Request $request)
    {
        Http::rateLimit('plat:'.Http::clientIp($request), 10, 60);
        $body = Http::validate($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);
        $user = PlatformUser::query()->where('email', strtolower(trim($body['email'])))->first();
        if (! $user || ! $user->active || ! Hash::check($body['password'], $user->password_hash)) {
            throw new ApiException(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');
        }
        $token = JwtCookies::signPlatform($user->id);

        return response()->json([
            'user' => ['id' => $user->id, 'email' => $user->email, 'name' => $user->name],
        ])->cookie(JwtCookies::cookie((string) config('eaimesa.cookies.platform'), $token, (int) config('eaimesa.platform_jwt_ttl_hours') * 3600));
    }

    public function logout()
    {
        return response()->json(['ok' => true])
            ->cookie(JwtCookies::forget((string) config('eaimesa.cookies.platform')));
    }

    public function me(Request $request)
    {
        $user = $request->attributes->get('platformUser');

        return ['user' => ['id' => $user->id, 'email' => $user->email, 'name' => $user->name]];
    }

    public function dashboard()
    {
        $venues = Venue::query()->get();
        $events = BillingEvent::query()->with('venue')->orderByDesc('created_at')->limit(20)->get();

        return [
            'kpis' => [
                'venues' => $venues->count(),
                'trial' => $venues->where('subscription_status', 'trial')->count(),
                'active' => $venues->where('subscription_status', 'active')->count(),
                'suspended' => $venues->where('subscription_status', 'suspended')->count(),
            ],
            'recentCheckouts' => $events->map(fn ($e) => [
                'id' => $e->id,
                'venueName' => $e->venue?->name,
                'plan' => $e->plan,
                'planName' => $e->plan_name,
                'amountCents' => $e->amount_cents,
                'method' => $e->method,
                'createdAt' => $e->created_at?->toIso8601String(),
            ])->all(),
        ];
    }

    public function venues(Request $request)
    {
        $q = Venue::query()->with('owner')->orderBy('name');
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $q->where(function ($w) use ($term) {
                $w->where('name', 'like', $term)->orWhere('slug', 'like', $term);
            });
        }
        if ($request->filled('plan')) {
            $q->where('plan', $request->string('plan'));
        }
        if ($request->filled('status')) {
            $q->where('subscription_status', $request->string('status'));
        }

        return [
            'venues' => $q->limit(200)->get()->map(fn (Venue $v) => array_merge(Billing::serializeVenue($v), [
                'ownerEmail' => $v->owner?->email,
            ]))->all(),
        ];
    }

    public function suspend(string $id)
    {
        $venue = Venue::query()->find($id);
        if (! $venue) {
            throw new ApiException(404, 'VENUE_NOT_FOUND', 'Estabelecimento não encontrado.');
        }
        $venue->update(['subscription_status' => 'suspended', 'accepts_orders' => false]);

        return Billing::serializeVenue($venue->fresh());
    }

    public function unsuspend(string $id)
    {
        $venue = Venue::query()->find($id);
        if (! $venue) {
            throw new ApiException(404, 'VENUE_NOT_FOUND', 'Estabelecimento não encontrado.');
        }
        $status = 'trial';
        if ($venue->current_period_ends_at && $venue->current_period_ends_at->gt(now())) {
            $status = 'active';
        } elseif ($venue->trial_ends_at && $venue->trial_ends_at->lt(now())) {
            $status = 'past_due';
        }
        $venue->update([
            'subscription_status' => $status,
            'accepts_orders' => Plans::allowsService(Billing::planKind($venue->plan)) && $status !== 'past_due',
        ]);

        return Billing::serializeVenue($venue->fresh());
    }

    public function plans()
    {
        return [
            'plans' => PlanCatalog::query()->orderBy('sort_order')->get()->map(fn ($p) => Billing::publicPlanPayload($p))->all(),
            'settings' => PlatformSetting::current()->only(['trial_days', 'paid_period_days']),
        ];
    }

    public function createPlan(Request $request)
    {
        if (PlanCatalog::query()->count() >= Plans::MAX_CATALOG) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Máximo de 12 planos.');
        }
        $body = Http::validate($request->all(), [
            'name' => 'required|string|min:2|max:80',
            'kind' => 'required|in:cardapio,auto_atendimento',
            'priceCents' => 'required|integer|min:0',
            'promoPriceCents' => 'nullable|integer|min:0',
            'blurb' => 'required|string|max:240',
            'features' => 'nullable|array',
            'listed' => 'nullable|boolean',
            'id' => 'nullable|string|min:3|max:48',
        ]);
        $id = $body['id'] ?? Plans::slugifyPlanId($body['name']);
        if (! preg_match(Plans::ID_REGEX, $id)) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'SKU inválido.');
        }
        if (PlanCatalog::query()->find($id)) {
            $id = $id.'-'.substr(bin2hex(random_bytes(2)), 0, 4);
        }
        $promo = $body['promoPriceCents'] ?? null;
        if ($promo !== null && $promo >= $body['priceCents']) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Promo precisa ser menor que o preço cheio.');
        }
        $max = (int) PlanCatalog::query()->max('sort_order');
        $row = PlanCatalog::query()->create([
            'id' => $id,
            'name' => $body['name'],
            'kind' => $body['kind'],
            'price_cents' => $body['priceCents'],
            'promo_price_cents' => $promo,
            'blurb' => $body['blurb'],
            'features' => $body['features'] ?? [],
            'listed' => $body['listed'] ?? true,
            'sort_order' => $max + 1,
            'updated_at' => now(),
        ]);

        return Billing::publicPlanPayload($row);
    }

    public function patchPlan(Request $request, string $id)
    {
        $row = PlanCatalog::query()->find($id);
        if (! $row) {
            throw new ApiException(404, 'VENUE_NOT_FOUND', 'Plano não encontrado.');
        }
        $patch = [];
        foreach (['name' => 'name', 'kind' => 'kind', 'blurb' => 'blurb'] as $in => $col) {
            if ($request->exists($in)) {
                $patch[$col] = $request->input($in);
            }
        }
        if ($request->exists('priceCents')) {
            $patch['price_cents'] = (int) $request->input('priceCents');
        }
        if ($request->exists('promoPriceCents')) {
            $patch['promo_price_cents'] = $request->input('promoPriceCents');
        }
        if ($request->exists('features')) {
            $patch['features'] = $request->input('features');
        }
        if ($request->exists('listed')) {
            $patch['listed'] = (bool) $request->input('listed');
        }
        $patch['updated_at'] = now();
        $row->update($patch);

        return Billing::publicPlanPayload($row->fresh());
    }

    public function patchSettings(Request $request)
    {
        $settings = PlatformSetting::current();
        if ($request->exists('trialDays')) {
            $settings->trial_days = (int) $request->input('trialDays');
        }
        if ($request->exists('paidPeriodDays')) {
            $settings->paid_period_days = (int) $request->input('paidPeriodDays');
        }
        $settings->updated_at = now();
        $settings->save();

        return ['trialDays' => $settings->trial_days, 'paidPeriodDays' => $settings->paid_period_days];
    }
}
