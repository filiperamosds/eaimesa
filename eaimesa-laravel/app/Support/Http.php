<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

final class Http
{
    public static function validate(array $data, array $rules, array $messages = []): array
    {
        $v = Validator::make($data, $rules, $messages);
        if ($v->fails()) {
            throw new ApiException(400, 'VALIDATION_ERROR', $v->errors()->first());
        }

        return $v->validated();
    }

    public static function clientIp(Request $request): string
    {
        $fwd = $request->header('X-Forwarded-For');
        if (is_string($fwd) && $fwd !== '') {
            return trim(explode(',', $fwd)[0]);
        }

        return $request->ip() ?? '0.0.0.0';
    }

    public static function rateLimit(string $key, int $max, int $windowSeconds): void
    {
        $bucket = Cache::get($key);
        $now = time();
        if (! is_array($bucket) || ($bucket['reset'] ?? 0) < $now) {
            Cache::put($key, ['n' => 1, 'reset' => $now + $windowSeconds], $windowSeconds);
            return;
        }
        $bucket['n'] = (int) $bucket['n'] + 1;
        Cache::put($key, $bucket, max(1, $bucket['reset'] - $now));
        if ($bucket['n'] > $max) {
            throw new ApiException(429, 'RATE_LIMITED', 'Muitas tentativas. Espere um minuto.');
        }
    }

    public static function pinLock(string $key, int $maxFails, int $windowSeconds): object
    {
        return new class($key, $maxFails, $windowSeconds)
        {
            public function __construct(
                private string $key,
                private int $maxFails,
                private int $windowSeconds,
            ) {
                $cur = Cache::get($this->key);
                $now = time();
                if (is_array($cur) && ($cur['reset'] ?? 0) >= $now && ($cur['fails'] ?? 0) >= $this->maxFails) {
                    throw new ApiException(429, 'PIN_LOCKED', 'Muitas tentativas. Espere 15 minutos e peça o PIN de novo.');
                }
            }

            public function fail(): void
            {
                $now = time();
                $existing = Cache::get($this->key);
                if (! is_array($existing) || ($existing['reset'] ?? 0) < $now) {
                    Cache::put($this->key, ['fails' => 1, 'reset' => $now + $this->windowSeconds], $this->windowSeconds);
                    if (1 >= $this->maxFails) {
                        throw new ApiException(429, 'PIN_LOCKED', 'Muitas tentativas. Espere 15 minutos e peça o PIN de novo.');
                    }

                    return;
                }
                $existing['fails'] = (int) $existing['fails'] + 1;
                Cache::put($this->key, $existing, max(1, $existing['reset'] - $now));
                if ($existing['fails'] >= $this->maxFails) {
                    throw new ApiException(429, 'PIN_LOCKED', 'Muitas tentativas. Espere 15 minutos e peça o PIN de novo.');
                }
            }

            public function succeed(): void
            {
                Cache::forget($this->key);
            }
        };
    }
}
