<?php

use App\Support\ApiException;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        then: function () {
            Route::middleware('api')->group(base_path('routes/api.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'owner' => \App\Http\Middleware\RequireOwner::class,
            'venue.actor' => \App\Http\Middleware\RequireVenueActor::class,
            'guest.tab' => \App\Http\Middleware\RequireGuest::class,
            'platform' => \App\Http\Middleware\RequirePlatform::class,
            'service.plan' => \App\Http\Middleware\RequireServicePlan::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn () => true);

        $exceptions->render(function (ApiException $e) {
            return response()->json([
                'error' => ['code' => $e->errorCode, 'message' => $e->getMessage()],
            ], $e->status);
        });

        $exceptions->render(function (ExpiredException|SignatureInvalidException $e) {
            return response()->json([
                'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Sessão expirada. Entre de novo.'],
            ], 401);
        });
    })->create();
