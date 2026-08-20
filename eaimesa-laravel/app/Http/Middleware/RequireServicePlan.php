<?php

namespace App\Http\Middleware;

use App\Models\Venue;
use App\Services\Billing;
use Closure;
use Illuminate\Http\Request;

class RequireServicePlan
{
    public function handle(Request $request, Closure $next)
    {
        $venueId = $request->attributes->get('session')['venueId']
            ?? $request->attributes->get('venueActor')['venueId']
            ?? $request->attributes->get('guest')['venueId']
            ?? null;
        if (! $venueId) {
            return $next($request);
        }
        $venue = Venue::query()->findOrFail($venueId);
        Billing::requireServicePlan($venue);

        return $next($request);
    }
}
