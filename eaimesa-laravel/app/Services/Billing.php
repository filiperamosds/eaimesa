<?php

namespace App\Services;

use App\Models\PlanCatalog;
use App\Models\PlatformSetting;
use App\Models\Venue;
use App\Support\ApiException;
use App\Support\Plans;
use Illuminate\Support\Carbon;

class Billing
{
    public static function serializeVenue(Venue $v): array
    {
        $planKind = self::planKind($v->plan);
        $sub = self::subscriptionAllowsUse($v);

        return [
            'id' => $v->id,
            'name' => $v->name,
            'slug' => $v->slug,
            'publicId' => $v->public_id,
            'plan' => $v->plan,
            'planKind' => $planKind,
            'planName' => self::planName($v->plan),
            'subscriptionStatus' => $v->subscription_status,
            'acceptsOrders' => $v->accepts_orders && Plans::allowsService($planKind) && $sub['ok'],
            'trialEndsAt' => optional($v->trial_ends_at)?->toIso8601String(),
            'currentPeriodEndsAt' => optional($v->current_period_ends_at)?->toIso8601String(),
        ];
    }

    public static function planKind(string $plan): string
    {
        $row = PlanCatalog::query()->find($plan);
        if ($row && Plans::isKind((string) $row->kind)) {
            return (string) $row->kind;
        }

        return Plans::resolveKind($plan);
    }

    public static function planName(string $plan): string
    {
        $row = PlanCatalog::query()->find($plan);

        return $row?->name ?? $plan;
    }

    public static function subscriptionAllowsUse(Venue $venue): array
    {
        $now = now();
        if ($venue->subscription_status === 'suspended') {
            return [
                'ok' => false,
                'code' => 'VENUE_SUSPENDED',
                'message' => 'Este bar está com a assinatura inativa.',
            ];
        }
        if ($venue->subscription_status === 'trial') {
            if ($venue->trial_ends_at && $venue->trial_ends_at->lt($now)) {
                return [
                    'ok' => false,
                    'code' => 'BILLING_INACTIVE',
                    'message' => 'O trial de 7 dias acabou. Ative o plano para continuar.',
                ];
            }

            return ['ok' => true];
        }
        if ($venue->subscription_status === 'active') {
            if ($venue->current_period_ends_at && $venue->current_period_ends_at->lt($now)) {
                return [
                    'ok' => false,
                    'code' => 'BILLING_INACTIVE',
                    'message' => 'A vigência do plano acabou. Renove para continuar.',
                ];
            }

            return ['ok' => true];
        }

        return [
            'ok' => false,
            'code' => 'BILLING_INACTIVE',
            'message' => 'Assinatura pendente. Ative o plano para continuar.',
        ];
    }

    public static function requireServicePlan(Venue $venue): void
    {
        self::assertNotBlocked($venue);
        if (! Plans::allowsService(self::planKind($venue->plan))) {
            throw new ApiException(403, 'PLAN_FEATURE', 'Este recurso é do plano Auto atendimento.');
        }
    }

    public static function assertNotBlocked(Venue $venue): void
    {
        $sub = self::subscriptionAllowsUse($venue);
        if (! $sub['ok']) {
            throw new ApiException(
                $sub['code'] === 'VENUE_SUSPENDED' ? 403 : 403,
                $sub['code'],
                $sub['message'],
            );
        }
    }

    public static function canCheckoutPlan(Venue $venue, PlanCatalog $target): array
    {
        if ($target->id === $venue->plan) {
            return ['ok' => true];
        }
        $fromKind = self::planKind($venue->plan);
        if (Plans::rank((string) $target->kind) >= Plans::rank($fromKind)) {
            return ['ok' => true];
        }
        $now = now();
        $paidPeriodOpen = $venue->subscription_status === 'active'
            && $venue->current_period_ends_at
            && $venue->current_period_ends_at->gt($now);
        if ($paidPeriodOpen) {
            return [
                'ok' => false,
                'code' => 'PLAN_DOWNGRADE_LOCKED',
                'message' => 'Espere o fim da vigência paga para voltar ao Cardápio.',
            ];
        }

        return ['ok' => true];
    }

    public static function publicPlanPayload(PlanCatalog $p): array
    {
        $promo = $p->promo_price_cents;

        return [
            'id' => $p->id,
            'name' => $p->name,
            'kind' => self::planKind((string) $p->kind) === 'auto_atendimento' || $p->kind === 'auto_atendimento'
                ? 'auto_atendimento'
                : 'cardapio',
            'priceCents' => $p->price_cents,
            'promoPriceCents' => $promo,
            'effectivePriceCents' => Plans::effectivePriceCents((int) $p->price_cents, $promo),
            'blurb' => $p->blurb,
            'features' => $p->features ?? [],
            'listed' => (bool) $p->listed,
            'sortOrder' => $p->sort_order,
            'updatedAt' => $p->updated_at?->toIso8601String(),
        ];
    }

    public static function publicBillingPlans(): array
    {
        $settings = PlatformSetting::query()->find('default');
        $plans = PlanCatalog::query()->where('listed', true)->orderBy('sort_order')->get();

        return [
            'trialDays' => $settings?->trial_days ?? 7,
            'paidPeriodDays' => $settings?->paid_period_days ?? 30,
            'stubDelayMs' => (int) config('eaimesa.checkout_stub_delay_ms'),
            'plans' => $plans->map(fn (PlanCatalog $p) => array_merge(self::publicPlanPayload($p), ['listed' => true]))->values()->all(),
            'future' => [
                'id' => 'equipamento',
                'name' => 'Equipamento na mesa',
                'blurb' => 'Hardware/tablet na mesa. Fora desta fatia — em breve.',
            ],
        ];
    }

    public static function trialEndsAt(?Carbon $from = null, ?int $days = null): Carbon
    {
        $days ??= PlatformSetting::query()->find('default')?->trial_days ?? 7;

        return ($from ?? now())->copy()->addDays($days);
    }

    public static function paidPeriodEndsAt(?Carbon $from = null, ?int $days = null): Carbon
    {
        $days ??= PlatformSetting::query()->find('default')?->paid_period_days ?? 30;

        return ($from ?? now())->copy()->addDays($days);
    }
}
