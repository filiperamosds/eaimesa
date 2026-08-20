<?php

namespace App\Support;

final class Phone
{
    public static function normalize(string $raw): string
    {
        $digits = preg_replace('/\D/', '', $raw) ?? '';
        if (str_starts_with($digits, '55') && strlen($digits) >= 12) {
            $digits = substr($digits, 2);
        }

        return $digits;
    }

    public static function mask(string $digits): string
    {
        $d = self::normalize($digits);
        if (strlen($d) < 4) {
            return '••••';
        }

        return '•••• '.substr($d, -4);
    }

    public static function assertValid(string $raw): string
    {
        $d = self::normalize($raw);
        $len = strlen($d);
        if ($len < 10 || $len > 11) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Informe DDD + telefone (10 ou 11 dígitos).');
        }

        return $d;
    }
}
