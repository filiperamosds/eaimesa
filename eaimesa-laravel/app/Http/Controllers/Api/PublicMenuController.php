<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatalogCategory;
use App\Models\CatalogItem;
use App\Models\Venue;
use App\Services\Billing;
use App\Support\ApiException;
use App\Support\Plans;

class PublicMenuController extends Controller
{
    public function show(string $slug)
    {
        $venue = Venue::query()->where('slug', $slug)->first();
        if (! $venue) {
            throw new ApiException(404, 'VENUE_NOT_FOUND', 'Este cardápio não existe.');
        }
        $categories = CatalogCategory::query()
            ->where('venue_id', $venue->id)
            ->where('active', true)
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();
        $items = CatalogItem::query()
            ->where('venue_id', $venue->id)
            ->where('active', true)
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();
        $planKind = Billing::planKind($venue->plan);

        return [
            'venue' => [
                'name' => $venue->name,
                'slug' => $venue->slug,
                'subscriptionStatus' => $venue->subscription_status,
                'plan' => $venue->plan,
                'planKind' => $planKind,
                'acceptsOrders' => $venue->accepts_orders && Plans::allowsService($planKind) && Billing::subscriptionAllowsUse($venue)['ok'],
            ],
            'categories' => $categories->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'items' => $items->where('category_id', $c->id)->values()->map(fn ($i) => [
                    'id' => $i->id,
                    'name' => $i->name,
                    'description' => $i->description,
                    'imageUrl' => $i->image_url,
                    'priceCents' => $i->price_cents,
                    'maxNoteLength' => $i->max_note_length,
                ])->all(),
            ])->values()->all(),
        ];
    }
}
