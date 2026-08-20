<?php

namespace App\Http\Middleware;

use App\Models\PlatformUser;
use App\Support\ApiException;
use App\Support\JwtCookies;
use Closure;
use Illuminate\Http\Request;

class RequirePlatform
{
    public function handle(Request $request, Closure $next)
    {
        $raw = JwtCookies::read($request, (string) config('eaimesa.cookies.platform'));
        if (! $raw) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Faça login no console.');
        }
        try {
            $session = JwtCookies::verifyPlatform($raw);
        } catch (\Throwable) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Sessão do console expirada.');
        }
        $user = PlatformUser::query()->find($session['sub']);
        if (! $user || ! $user->active) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Operador inativo.');
        }
        $request->attributes->set('platform', $session);
        $request->attributes->set('platformUser', $user);

        return $next($request);
    }
}
