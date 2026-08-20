<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\GuestController;
use App\Http\Controllers\Api\OwnerController;
use App\Http\Controllers\Api\OwnerOpsController;
use App\Http\Controllers\Api\PlatformController;
use App\Http\Controllers\Api\PublicMenuController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\UploadController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true, 'service' => 'eaimesa-api']);

Route::prefix('v1')->group(function () {
    Route::get('uploads/{file}', [UploadController::class, 'show']);

    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);

    Route::get('public/venues/{slug}', [PublicMenuController::class, 'show']);
    Route::post('public/venues/{slug}/c/{token}/redeem', [GuestController::class, 'redeem']);

    Route::get('billing/plans', [BillingController::class, 'plans']);
    Route::middleware('owner')->group(function () {
        Route::get('billing/me', [BillingController::class, 'me']);
        Route::post('billing/checkout', [BillingController::class, 'checkout']);

        Route::get('owner/venue', [OwnerController::class, 'venue']);
        Route::patch('owner/venue', [OwnerController::class, 'patchVenue']);
        Route::get('owner/catalog', [OwnerController::class, 'catalog']);
        Route::post('owner/catalog/categories', [OwnerController::class, 'createCategory']);
        Route::patch('owner/catalog/categories/{id}', [OwnerController::class, 'patchCategory']);
        Route::delete('owner/catalog/categories/{id}', [OwnerController::class, 'deleteCategory']);
        Route::post('owner/catalog/items', [OwnerController::class, 'createItem']);
        Route::patch('owner/catalog/items/{id}', [OwnerController::class, 'patchItem']);
        Route::delete('owner/catalog/items/{id}', [OwnerController::class, 'deleteItem']);
        Route::post('owner/catalog/items/{id}/image', [OwnerController::class, 'uploadItemImage']);
    });

    Route::middleware(['owner', 'service.plan'])->group(function () {
        Route::get('owner/orders', [OwnerOpsController::class, 'orders']);
        Route::post('owner/orders', [OwnerOpsController::class, 'createOrder']);
        Route::patch('owner/orders/{id}', [OwnerOpsController::class, 'patchOrder']);
        Route::get('owner/tables', [OwnerOpsController::class, 'tables']);
        Route::post('owner/tables', [OwnerOpsController::class, 'createTable']);
        Route::patch('owner/tables/{id}', [OwnerOpsController::class, 'patchTable']);
        Route::delete('owner/tables/{id}', [OwnerOpsController::class, 'deleteTable']);
        Route::get('owner/staff', [OwnerOpsController::class, 'staff']);
        Route::post('owner/staff', [OwnerOpsController::class, 'createStaff']);
        Route::patch('owner/staff/{id}', [OwnerOpsController::class, 'patchStaff']);
        Route::delete('owner/staff/{id}', [OwnerOpsController::class, 'deleteStaff']);
    });

    Route::middleware(['venue.actor', 'service.plan'])->group(function () {
        Route::get('staff/tables', [StaffController::class, 'tables']);
        Route::post('staff/tables/{tableId}/claims', [StaffController::class, 'createClaim']);
        Route::get('staff/tables/{tableId}/tabs', [StaffController::class, 'tableTabs']);
        Route::post('staff/tabs/{tabId}/close', [StaffController::class, 'closeTab']);
        Route::post('staff/tables/{tableId}/close', [StaffController::class, 'closeTable']);
        Route::get('staff/orders', [StaffController::class, 'orders']);
        Route::post('staff/orders', [StaffController::class, 'createOrder']);
        Route::patch('staff/orders/{id}', [StaffController::class, 'patchOrder']);
        Route::get('staff/catalog', [StaffController::class, 'catalog']);
    });

    Route::post('guest/tabs/join', [GuestController::class, 'join']);
    Route::middleware(['guest.tab', 'service.plan'])->group(function () {
        Route::post('guest/tabs', [GuestController::class, 'openTab']);
        Route::get('guest/tab', [GuestController::class, 'tab']);
        Route::post('guest/orders', [GuestController::class, 'createOrder']);
        Route::get('guest/orders', [GuestController::class, 'orders']);
        Route::get('guest/orders/{id}', [GuestController::class, 'showOrder']);
    });

    Route::post('platform/auth/login', [PlatformController::class, 'login']);
    Route::post('platform/auth/logout', [PlatformController::class, 'logout']);
    Route::middleware('platform')->group(function () {
        Route::get('platform/auth/me', [PlatformController::class, 'me']);
        Route::get('platform/dashboard', [PlatformController::class, 'dashboard']);
        Route::get('platform/venues', [PlatformController::class, 'venues']);
        Route::post('platform/venues/{id}/suspend', [PlatformController::class, 'suspend']);
        Route::post('platform/venues/{id}/unsuspend', [PlatformController::class, 'unsuspend']);
        Route::get('platform/plans', [PlatformController::class, 'plans']);
        Route::post('platform/plans', [PlatformController::class, 'createPlan']);
        Route::patch('platform/plans/{id}', [PlatformController::class, 'patchPlan']);
        Route::patch('platform/settings', [PlatformController::class, 'patchSettings']);
    });
});
