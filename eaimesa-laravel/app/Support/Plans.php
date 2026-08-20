<?php

namespace App\Support;

final class Plans
{
    public const KINDS = ['cardapio', 'auto_atendimento'];

    public const ID_REGEX = '/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/';

    public const MAX_CATALOG = 12;

    public const BAR_MAX_TABLES = 15;

    public const STAFF_LIMIT = 5;

    public static function isKind(string $value): bool
    {
        return in_array($value, self::KINDS, true);
    }

    public static function resolveKind(string $planOrKind): string
    {
        if (self::isKind($planOrKind)) {
            return $planOrKind;
        }

        return 'cardapio';
    }

    public static function allowsService(string $planOrKind): bool
    {
        return self::resolveKind($planOrKind) === 'auto_atendimento';
    }

    public static function rank(string $planOrKind): int
    {
        return self::resolveKind($planOrKind) === 'auto_atendimento' ? 2 : 1;
    }

    public static function hasPromo(?int $priceCents, ?int $promoPriceCents): bool
    {
        return $promoPriceCents !== null && $promoPriceCents >= 0 && $promoPriceCents < (int) $priceCents;
    }

    public static function effectivePriceCents(int $priceCents, ?int $promoPriceCents): int
    {
        return self::hasPromo($priceCents, $promoPriceCents) ? (int) $promoPriceCents : $priceCents;
    }

    public static function slugifyPlanId(string $name): string
    {
        $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name) ?: $name;
        $s = strtolower($s);
        $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? $s;
        $s = trim($s, '-');
        $s = substr($s, 0, 48);
        if (strlen($s) >= 3) {
            return $s;
        }
        $padded = substr(($s !== '' ? $s : 'plano').'-plan', 0, 48);

        return strlen($padded) >= 3 ? $padded : 'plano-novo';
    }
}
