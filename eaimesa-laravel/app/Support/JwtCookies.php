<?php

namespace App\Support;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Symfony\Component\HttpFoundation\Cookie as SymfonyCookie;

final class JwtCookies
{
    public static function signVenue(array $payload): string
    {
        $hours = (int) config('eaimesa.owner_jwt_ttl_hours');
        $body = [
            'sub' => $payload['sub'],
            'venueId' => $payload['venueId'],
            'role' => $payload['role'],
            'iat' => time(),
            'exp' => time() + ($hours * 3600),
        ];
        if (! empty($payload['memberId'])) {
            $body['memberId'] = $payload['memberId'];
        }

        return JWT::encode($body, (string) config('eaimesa.owner_jwt_secret'), 'HS256');
    }

    public static function verifyVenue(string $token): array
    {
        $payload = (array) JWT::decode($token, new Key((string) config('eaimesa.owner_jwt_secret'), 'HS256'));
        if (empty($payload['sub']) || empty($payload['venueId']) || ! in_array($payload['role'] ?? '', ['owner', 'staff'], true)) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Sessão expirada. Entre de novo.');
        }

        return [
            'sub' => (string) $payload['sub'],
            'venueId' => (string) $payload['venueId'],
            'role' => (string) $payload['role'],
            'memberId' => isset($payload['memberId']) ? (string) $payload['memberId'] : null,
        ];
    }

    public static function signGuest(array $payload): string
    {
        $hours = (int) config('eaimesa.guest_session_ttl_hours');

        return JWT::encode([
            'sub' => $payload['sub'],
            'venueId' => $payload['venueId'],
            'tableSessionId' => $payload['tableSessionId'],
            'tabId' => $payload['tabId'],
            'role' => 'guest',
            'iat' => time(),
            'exp' => time() + ($hours * 3600),
        ], (string) config('eaimesa.guest_session_secret'), 'HS256');
    }

    public static function verifyGuest(string $token): array
    {
        $payload = (array) JWT::decode($token, new Key((string) config('eaimesa.guest_session_secret'), 'HS256'));
        if (empty($payload['sub']) || ($payload['role'] ?? '') !== 'guest' || empty($payload['venueId']) || empty($payload['tableSessionId'])) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Sessão expirada. Entre de novo com o PIN.');
        }

        return [
            'sub' => (string) $payload['sub'],
            'venueId' => (string) $payload['venueId'],
            'tableSessionId' => (string) $payload['tableSessionId'],
            'tabId' => isset($payload['tabId']) && is_string($payload['tabId']) ? $payload['tabId'] : null,
            'role' => 'guest',
        ];
    }

    public static function signPlatform(string $sub): string
    {
        $hours = (int) config('eaimesa.platform_jwt_ttl_hours');

        return JWT::encode([
            'sub' => $sub,
            'role' => 'platform',
            'iat' => time(),
            'exp' => time() + ($hours * 3600),
        ], (string) config('eaimesa.platform_jwt_secret'), 'HS256');
    }

    public static function verifyPlatform(string $token): array
    {
        $payload = (array) JWT::decode($token, new Key((string) config('eaimesa.platform_jwt_secret'), 'HS256'));
        if (empty($payload['sub']) || ($payload['role'] ?? '') !== 'platform') {
            throw new ApiException(401, 'UNAUTHORIZED', 'Sessão do console expirada.');
        }

        return ['sub' => (string) $payload['sub'], 'role' => 'platform'];
    }

    public static function cookie(string $name, string $value, int $maxAgeSec): SymfonyCookie
    {
        return Cookie::make(
            $name,
            $value,
            (int) ceil($maxAgeSec / 60),
            '/',
            null,
            app()->environment('production'),
            true,
            false,
            'lax',
        );
    }

    public static function forget(string $name): SymfonyCookie
    {
        return Cookie::forget($name, '/');
    }

    public static function read(Request $request, string $name): ?string
    {
        $v = $request->cookie($name);
        return is_string($v) && $v !== '' ? $v : null;
    }
}
