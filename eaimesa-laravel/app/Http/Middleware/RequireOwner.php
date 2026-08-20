<?php

namespace App\Http\Middleware;

use App\Support\ApiException;
use App\Support\JwtCookies;
use Closure;
use Illuminate\Http\Request;

class RequireOwner
{
    public function handle(Request $request, Closure $next)
    {
        $session = self::session($request);
        if ($session['role'] !== 'owner') {
            throw new ApiException(403, 'FORBIDDEN', 'Acesso restrito ao dono do estabelecimento.');
        }
        $request->attributes->set('session', $session);

        return $next($request);
    }

    public static function session(Request $request): array
    {
        $raw = JwtCookies::read($request, (string) config('eaimesa.cookies.owner'));
        if (! $raw) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Faça login para continuar.');
        }
        try {
            return JwtCookies::verifyVenue($raw);
        } catch (ApiException $e) {
            throw $e;
        } catch (\Throwable) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Sessão expirada. Entre de novo.');
        }
    }
}
