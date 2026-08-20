<?php

return [
    /** Origem do Next (CORS + links de claim). */
    'app_url' => env('APP_URL', 'http://localhost:3000'),

    'owner_jwt_secret' => env('OWNER_JWT_SECRET', 'change-me-min-32-chars-random-owner'),
    'owner_jwt_ttl_hours' => (int) env('OWNER_JWT_TTL_HOURS', 12),

    'guest_session_secret' => env('GUEST_SESSION_SECRET', 'change-me-min-32-chars-random-guest'),
    'guest_session_ttl_hours' => (int) env('GUEST_SESSION_TTL_HOURS', 4),
    'pin_join_max_failures' => (int) env('PIN_JOIN_MAX_FAILURES', 5),
    'pin_join_window_minutes' => (int) env('PIN_JOIN_WINDOW_MINUTES', 15),

    'platform_jwt_secret' => env('PLATFORM_JWT_SECRET', 'change-me-min-32-chars-random-platform'),
    'platform_jwt_ttl_hours' => (int) env('PLATFORM_JWT_TTL_HOURS', 12),

    'claim_ttl_seconds' => (int) env('CLAIM_TTL_SECONDS', 180),
    'checkout_stub_delay_ms' => (int) env('CHECKOUT_STUB_DELAY_MS', 2000),

    'cookies' => [
        'owner' => 'eaimesa_owner',
        'guest' => 'eaimesa_guest',
        'platform' => 'eaimesa_platform',
    ],
];
