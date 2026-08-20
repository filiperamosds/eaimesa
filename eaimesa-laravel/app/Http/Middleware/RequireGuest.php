<?php

namespace App\Http\Middleware;

use App\Models\GuestSession;
use App\Support\ApiException;
use App\Support\JwtCookies;
use Closure;
use Illuminate\Http\Request;

class RequireGuest
{
    public function handle(Request $request, Closure $next)
    {
        $raw = JwtCookies::read($request, (string) config('eaimesa.cookies.guest'));
        if (! $raw) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Entre na comanda com o PIN da mesa.');
        }
        try {
            $session = JwtCookies::verifyGuest($raw);
        } catch (\Throwable) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Sessão expirada. Entre de novo com o PIN.');
        }
        $row = GuestSession::query()->find($session['sub']);
        if (
            ! $row
            || $row->venue_id !== $session['venueId']
            || $row->table_session_id !== $session['tableSessionId']
            || $row->expires_at->lt(now())
        ) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Sessão expirada. Entre de novo com o PIN.');
        }
        $session['tabId'] = $row->tab_id;
        $request->attributes->set('guest', $session);

        return $next($request);
    }
}
