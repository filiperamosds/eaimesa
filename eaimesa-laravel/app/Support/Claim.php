<?php

namespace App\Support;

final class Claim
{
    public static function token(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }

    public static function hash(string $token): string
    {
        return hash('sha256', $token);
    }

    public static function pin(): string
    {
        return (string) random_int(1000, 9999);
    }
}
