<?php

namespace App\Support;

final class Slug
{
    public const RESERVED = [
        'login', 'cadastro', 'painel', 'app', 'api', 'admin', 'termos', 'privacidade',
        'preco', 'pricing', 'sobre', 'contato', 'health', 'static', 'assets',
        'favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.json', 'garcom', 'bem-vindo',
    ];

    public const REGEX = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';

    public static function normalize(string $raw): string
    {
        return strtolower(trim($raw));
    }

    public static function assertValid(string $slug): string
    {
        $slug = self::normalize($slug);
        $len = strlen($slug);
        if ($len < 3 || $len > 48) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Slug deve ter entre 3 e 48 caracteres.');
        }
        if (! preg_match(self::REGEX, $slug)) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Use só letras minúsculas, números e hífen (ex. bar-do-tiao).');
        }
        if (in_array($slug, self::RESERVED, true)) {
            throw new ApiException(400, 'SLUG_RESERVED', 'Este caminho é reservado pelo produto. Escolha outro slug.');
        }

        return $slug;
    }
}
