<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => [
    'service' => 'eaimesa-api',
    'docs' => '/docs',
    'health' => '/health',
]);
