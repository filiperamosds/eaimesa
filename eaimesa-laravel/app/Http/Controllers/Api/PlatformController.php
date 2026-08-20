<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
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
            'role' => 'platform',
            'redirectPath' => '/admin',
            'account' => ['id' => $user->id, 'email' => $user->email, 'name' => $user->name],
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

        return [
            'role' => 'platform',
            'account' => ['id' => $user->id, 'email' => $user->email, 'name' => $user->name],
        ];
    }

    public function dashboard()
    {
        $catalog = PlanCatalog::query()->orderBy('sort_order')->get();
        $venues = Venue::query()->get();
        $now = now();
        $byStatus = ['trial' => 0, 'active' => 0, 'suspended' => 0, 'past_due' => 0];
        $byPlanCount = [];
        foreach ($catalog as $p) {
            $byPlanCount[$p->id] = 0;
        }
        $trialExpired = 0;
        $mrrCents = 0;
        $priceByPlan = $catalog->mapWithKeys(fn (PlanCatalog $p) => [
            $p->id => Plans::effectivePriceCents((int) $p->price_cents, $p->promo_price_cents),
        ]);
        $nameByPlan = $catalog->mapWithKeys(fn (PlanCatalog $p) => [$p->id => $p->name]);

        foreach ($venues as $v) {
            $byStatus[$v->subscription_status] = ($byStatus[$v->subscription_status] ?? 0) + 1;
            $byPlanCount[$v->plan] = ($byPlanCount[$v->plan] ?? 0) + 1;
            if ($v->subscription_status === 'trial' && $v->trial_ends_at && $v->trial_ends_at->lt($now)) {
                $trialExpired++;
            }
            if ($v->subscription_status === 'active' && (! $v->current_period_ends_at || $v->current_period_ends_at->gt($now))) {
                $mrrCents += $priceByPlan[$v->plan] ?? 0;
            }
        }

        $since = now()->subDays(30);
        $sales = BillingEvent::query()->where('status', 'success')->where('created_at', '>=', $since);
        $recent = BillingEvent::query()->with('venue')->orderByDesc('created_at')->limit(10)->get();

        return [
            'venues' => [
                'total' => $venues->count(),
                'byStatus' => $byStatus,
                'byPlan' => collect($byPlanCount)->map(fn ($count, $id) => [
                    'id' => $id,
                    'name' => $nameByPlan[$id] ?? $id,
                    'count' => $count,
                ])->values()->all(),
                'trialExpired' => $trialExpired,
            ],
            'mrrCents' => $mrrCents,
            'checkouts30d' => [
                'count' => (int) $sales->count(),
                'totalCents' => (int) (clone $sales)->sum('amount_cents'),
            ],
            'recent' => $recent->map(fn ($e) => [
                'id' => $e->id,
                'venueId' => $e->venue_id,
                'venueName' => $e->venue?->name,
                'venueSlug' => $e->venue?->slug,
                'plan' => $e->plan,
                'planName' => $e->plan_name,
                'method' => $e->method,
                'amountCents' => $e->amount_cents,
                'provider' => $e->provider,
                'status' => $e->status,
                'createdAt' => $e->created_at?->toIso8601String(),
            ])->all(),
        ];
    }

    public function venues(Request $request)
    {
        $q = Venue::query()->with('owner')->orderByDesc('created_at');
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
        $names = PlanCatalog::query()->pluck('name', 'id');

        return [
            'venues' => $q->limit(100)->get()->map(fn (Venue $v) => [
                'id' => $v->id,
                'name' => $v->name,
                'slug' => $v->slug,
                'plan' => $v->plan,
                'planName' => $names[$v->plan] ?? $v->plan,
                'subscriptionStatus' => $v->subscription_status,
                'acceptsOrders' => $v->accepts_orders,
                'trialEndsAt' => optional($v->trial_ends_at)?->toIso8601String(),
                'currentPeriodEndsAt' => optional($v->current_period_ends_at)?->toIso8601String(),
                'createdAt' => $v->created_at?->toIso8601String(),
                'ownerEmail' => $v->owner?->email,
            ])->all(),
        ];
    }

    public function suspend(string $id)
    {
        $venue = Venue::query()->find($id);
        if (! $venue) {
            throw new ApiException(404, 'VENUE_NOT_FOUND', 'Estabelecimento não encontrado.');
        }
        $venue->update(['subscription_status' => 'suspended']);

        return ['ok' => true, 'venueId' => $venue->id, 'subscriptionStatus' => 'suspended'];
    }

    public function unsuspend(string $id)
    {
        $venue = Venue::query()->find($id);
        if (! $venue) {
            throw new ApiException(404, 'VENUE_NOT_FOUND', 'Estabelecimento não encontrado.');
        }
        $now = now();
        $next = 'past_due';
        if ($venue->current_period_ends_at && $venue->current_period_ends_at->gt($now)) {
            $next = 'active';
        } elseif ($venue->trial_ends_at && $venue->trial_ends_at->gt($now)) {
            $next = 'trial';
        }
        $venue->update(['subscription_status' => $next]);

        return ['ok' => true, 'venueId' => $venue->id, 'subscriptionStatus' => $next];
    }

    public function plans()
    {
        $settings = PlatformSetting::query()->find('default');
        $plans = PlanCatalog::query()->orderBy('sort_order')->get();

        return [
            'trialDays' => $settings?->trial_days ?? 7,
            'paidPeriodDays' => $settings?->paid_period_days ?? 30,
            'stubDelayMs' => (int) config('eaimesa.checkout_stub_delay_ms'),
            'plans' => $plans->map(fn (PlanCatalog $p) => Billing::publicPlanPayload($p))->values()->all(),
            'future' => [
                'id' => 'equipamento',
                'name' => 'Equipamento na mesa',
                'blurb' => 'Hardware/tablet na mesa. Fora desta fatia — em breve.',
            ],
        ];
    }

    public function createPlan(Request $request)
    {
        if (PlanCatalog::query()->count() >= Plans::MAX_CATALOG) {
            throw new ApiException(409, 'VALIDATION_ERROR', 'Máximo de 12 planos no catálogo.');
        }
        $body = Http::validate($request->all(), [
            'name' => 'required|string|min:2|max:80',
            'kind' => 'required|in:cardapio,auto_atendimento',
            'priceCents' => 'required|integer|min:0',
            'promoPriceCents' => 'nullable|integer|min:0',
            'blurb' => 'required|string|max:240',
            'features' => 'nullable|array',
            'listed' => 'nullable|boolean',
        ]);
        $taken = PlanCatalog::query()->pluck('id')->all();
        $id = Plans::slugifyPlanId($body['name']);
        if (in_array($id, $taken, true)) {
            $n = 2;
            while (in_array(substr($id.'-'.$n, 0, 48), $taken, true)) {
                $n++;
            }
            $id = substr($id.'-'.$n, 0, 48);
        }
        $promo = $body['promoPriceCents'] ?? null;
        if ($promo !== null && $promo >= $body['priceCents']) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'O preço promocional deve ser menor que o preço cheio.');
        }
        $max = (int) PlanCatalog::query()->max('sort_order');
        $row = PlanCatalog::query()->create([
            'id' => $id,
            'name' => $body['name'],
            'kind' => $body['kind'],
            'price_cents' => $body['priceCents'],
            'promo_price_cents' => $promo,
            'blurb' => $body['blurb'],
            'features' => array_values(array_filter($body['features'] ?? [], fn ($f) => trim((string) $f) !== '')),
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
            throw new ApiException(404, 'NOT_FOUND', 'Plano inexistente.');
        }
        $nextPrice = $request->exists('priceCents') ? (int) $request->input('priceCents') : (int) $row->price_cents;
        $nextPromo = $request->exists('promoPriceCents') ? $request->input('promoPriceCents') : $row->promo_price_cents;
        if ($nextPromo !== null && $nextPromo >= $nextPrice) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'O preço promocional deve ser menor que o preço cheio.');
        }
        $patch = ['updated_at' => now()];
        if ($request->exists('name')) {
            $patch['name'] = $request->input('name');
        }
        if ($request->exists('kind')) {
            $patch['kind'] = $request->input('kind');
        }
        if ($request->exists('priceCents')) {
            $patch['price_cents'] = $nextPrice;
        }
        if ($request->exists('promoPriceCents')) {
            $patch['promo_price_cents'] = $nextPromo;
        }
        if ($request->exists('blurb')) {
            $patch['blurb'] = $request->input('blurb');
        }
        if ($request->exists('features')) {
            $patch['features'] = $request->input('features');
        }
        if ($request->exists('listed')) {
            $patch['listed'] = (bool) $request->input('listed');
        }
        $row->update($patch);

        return Billing::publicPlanPayload($row->fresh());
    }

    public function patchSettings(Request $request)
    {
        $settings = PlatformSetting::query()->firstOrNew(['id' => 'default']);
        if ($request->exists('trialDays')) {
            $settings->trial_days = (int) $request->input('trialDays');
        } elseif (! $settings->exists) {
            $settings->trial_days = 7;
        }
        if ($request->exists('paidPeriodDays')) {
            $settings->paid_period_days = (int) $request->input('paidPeriodDays');
        } elseif (! $settings->exists) {
            $settings->paid_period_days = 30;
        }
        $settings->updated_at = now();
        $settings->save();

        return ['trialDays' => $settings->trial_days, 'paidPeriodDays' => $settings->paid_period_days];
    }
}
