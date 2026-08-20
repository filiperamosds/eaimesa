<?php

namespace App\Services;

use App\Models\GuestSession;
use App\Support\JwtCookies;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

class GuestCookies
{
    public static function issue(array $input): Cookie
    {
        $ttlSec = (int) config('eaimesa.guest_session_ttl_hours') * 3600;
        $expiresAt = now()->addSeconds($ttlSec);
        $sessionId = $input['sessionId'] ?? null;

        if (! $sessionId) {
            $row = GuestSession::query()->create([
                'venue_id' => $input['venueId'],
                'table_session_id' => $input['tableSessionId'],
                'tab_id' => $input['tabId'],
                'expires_at' => $expiresAt,
            ]);
            $sessionId = $row->id;
        } else {
            GuestSession::query()->where('id', $sessionId)->update([
                'tab_id' => $input['tabId'],
                'expires_at' => $expiresAt,
            ]);
        }

        $jwt = JwtCookies::signGuest([
            'sub' => $sessionId,
            'venueId' => $input['venueId'],
            'tableSessionId' => $input['tableSessionId'],
            'tabId' => $input['tabId'],
        ]);

        return JwtCookies::cookie((string) config('eaimesa.cookies.guest'), $jwt, $ttlSec);
    }

    public static function fromRequest(Request $request): ?array
    {
        $raw = JwtCookies::read($request, (string) config('eaimesa.cookies.guest'));
        if (! $raw) {
            return null;
        }

        return JwtCookies::verifyGuest($raw);
    }
}
