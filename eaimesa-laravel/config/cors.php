<?php

return [
    'paths' => ['v1/*', 'health'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [env('APP_URL', 'http://localhost:3000')],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
