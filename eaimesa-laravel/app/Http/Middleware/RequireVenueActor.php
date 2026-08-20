<?php

namespace App\Http\Middleware;

use App\Support\ApiException;
use Closure;
use Illuminate\Http\Request;

class RequireVenueActor
{
    public function handle(Request $request, Closure $next)
    {
        $session = RequireOwner::session($request);
        $request->attributes->set('session', $session);
        $request->attributes->set('venueActor', [
            'venueId' => $session['venueId'],
            'role' => $session['role'],
            'memberId' => $session['memberId'] ?? null,
            'accountId' => $session['sub'],
        ]);

        return $next($request);
    }
}
