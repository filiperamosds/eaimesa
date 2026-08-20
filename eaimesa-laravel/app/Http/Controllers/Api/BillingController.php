<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillingEvent;
use App\Models\PlanCatalog;
use App\Models\Venue;
use App\Services\Billing;
use App\Support\ApiException;
use App\Support\Http;
use App\Support\Plans;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function plans()
    {
        return Billing::publicBillingPlans();
    }

    public function me(Request $request)
    {
        $session = $request->attributes->get('session');
        $venue = Venue::query()->findOrFail($session['venueId']);
        $catalog = Billing::publicBillingPlans();
        $listed = PlanCatalog::query()->where('listed', true)->orderBy('sort_order')->get();
        $currentKind = Billing::planKind($venue->plan);

        return [
            'venue' => Billing::serializeVenue($venue),
            'entitlement' => Billing::subscriptionAllowsUse($venue),
            'canUpgrade' => $listed->contains(fn (PlanCatalog $p) => $p->id !== $venue->plan && Plans::rank((string) $p->kind) > Plans::rank($currentKind) && Billing::canCheckoutPlan($venue, $p)['ok']),
            'canDowngrade' => $listed->contains(fn (PlanCatalog $p) => $p->id !== $venue->plan && Plans::rank((string) $p->kind) < Plans::rank($currentKind) && Billing::canCheckoutPlan($venue, $p)['ok']),
            'plans' => $listed->map(fn (PlanCatalog $p) => array_merge(Billing::publicPlanPayload($p), ['listed' => true]))->values()->all(),
            'trialDays' => $catalog['trialDays'],
            'paidPeriodDays' => $catalog['paidPeriodDays'],
        ];
    }

    public function checkout(Request $request)
    {
        $body = Http::validate($request->all(), [
            'plan' => 'required|string|min:3|max:48',
            'method' => 'nullable|in:card,pix',
        ]);
        $session = $request->attributes->get('session');
        $venue = Venue::query()->findOrFail($session['venueId']);
        $plan = PlanCatalog::query()->find($body['plan']);
        if (! $plan) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Plano inválido.');
        }
        $gate = Billing::canCheckoutPlan($venue, $plan);
        if (! $gate['ok']) {
            throw new ApiException(409, $gate['code'], $gate['message']);
        }
        if (! $plan->listed && $body['plan'] !== $venue->plan) {
            throw new ApiException(400, 'PLAN_NOT_LISTED', 'Este plano não está à venda.');
        }
        usleep(((int) config('eaimesa.checkout_stub_delay_ms')) * 1000);
        $method = $body['method'] ?? 'card';
        $periodEnd = Billing::paidPeriodEndsAt();
        $amount = Plans::effectivePriceCents((int) $plan->price_cents, $plan->promo_price_cents);
        $venue->update([
            'plan' => $plan->id,
            'subscription_status' => 'active',
            'accepts_orders' => Plans::allowsService((string) $plan->kind),
            'current_period_ends_at' => $periodEnd,
        ]);
        BillingEvent::query()->create([
            'venue_id' => $venue->id,
            'plan' => $plan->id,
            'plan_name' => $plan->name,
            'method' => $method,
            'amount_cents' => $amount,
            'provider' => 'stub',
            'status' => 'success',
        ]);
        $days = $periodEnd->diffInDays(now());

        return [
            'status' => 'success',
            'provider' => 'stub',
            'method' => $method,
            'plan' => $plan->id,
            'planName' => $plan->name,
            'amountCents' => $amount,
            'listPriceCents' => $plan->price_cents,
            'promoPriceCents' => $plan->promo_price_cents,
            'subscriptionStatus' => 'active',
            'currentPeriodEndsAt' => $periodEnd->toIso8601String(),
            'venue' => Billing::serializeVenue($venue->fresh()),
            'message' => "Pagamento aprovado. Plano ativo por {$days} dias.",
        ];
    }
}
