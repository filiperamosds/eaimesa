<?php

namespace App\Services;

use App\Models\CatalogCategory;
use App\Models\CatalogItem;
use App\Models\Order;
use App\Models\VenueTable;
use App\Support\ApiException;

class Orders
{
    public const KANBAN = ['pending', 'accepted', 'preparing', 'delivered'];

    public static function serialize(Order $order, ?string $guestName = null): array
    {
        $order->loadMissing('items', 'tab');
        $name = $guestName ?? $order->tab?->guest_name;
        $items = $order->items->map(fn ($i) => [
            'id' => $i->id,
            'catalogItemId' => $i->catalog_item_id,
            'name' => $i->name_snapshot,
            'unitPriceCents' => $i->unit_price_cents_snapshot,
            'qty' => $i->qty,
            'note' => $i->note,
        ])->values()->all();
        $total = collect($items)->sum(fn ($i) => $i['qty'] * $i['unitPriceCents']);

        return [
            'id' => $order->id,
            'status' => $order->status,
            'source' => $order->source,
            'tableId' => $order->table_id,
            'tableLabel' => $order->table_label,
            'tabId' => $order->tab_id,
            'guestName' => $name,
            'note' => $order->note,
            'createdAt' => $order->created_at?->toIso8601String(),
            'updatedAt' => $order->updated_at?->toIso8601String(),
            'totalCents' => $total,
            'items' => $items,
        ];
    }

    public static function listKanban(string $venueId): array
    {
        $since = now()->subHours(48);
        $orders = Order::query()
            ->with(['items', 'tab'])
            ->where('venue_id', $venueId)
            ->whereIn('status', self::KANBAN)
            ->where('created_at', '>=', $since)
            ->orderByDesc('created_at')
            ->get();

        return ['orders' => $orders->map(fn (Order $o) => self::serialize($o))->values()->all()];
    }

    public static function createCounter(string $venueId, array $body): array
    {
        $table = self::resolveTable($venueId, $body['tableId'] ?? null, $body['tableLabel'] ?? null);
        $items = $body['items'] ?? [];
        if (! is_array($items) || $items === []) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Inclua pelo menos um item.');
        }

        $order = Order::query()->create([
            'venue_id' => $venueId,
            'status' => 'pending',
            'source' => 'counter',
            'table_id' => $table['tableId'],
            'table_label' => $table['tableLabel'],
            'note' => $body['note'] ?? null,
        ]);
        self::attachItems($order, $venueId, $items, requireActive: false);

        return self::serialize($order->fresh(['items', 'tab']));
    }

    public static function attachItems(Order $order, string $venueId, array $items, bool $requireActive = true): void
    {
        $ids = array_values(array_unique(array_column($items, 'catalogItemId')));
        $q = CatalogItem::query()->where('venue_id', $venueId)->whereIn('id', $ids);
        if ($requireActive) {
            $q->where('active', true);
        }
        $catalog = $q->get()->keyBy('id');
        if ($catalog->count() !== count($ids)) {
            throw new ApiException(400, 'ITEM_NOT_FOUND', 'Algum item não existe neste cardápio.');
        }
        foreach ($items as $line) {
            $item = $catalog->get($line['catalogItemId']);
            $qty = (int) ($line['qty'] ?? 0);
            if ($qty < 1) {
                throw new ApiException(400, 'VALIDATION_ERROR', 'Quantidade inválida.');
            }
            $order->items()->create([
                'venue_id' => $venueId,
                'catalog_item_id' => $item->id,
                'name_snapshot' => $item->name,
                'unit_price_cents_snapshot' => $item->price_cents,
                'qty' => $qty,
                'note' => $line['note'] ?? null,
            ]);
        }
    }

    public static function patchStatus(string $venueId, string $id, string $status): array
    {
        $allowed = ['pending', 'accepted', 'preparing', 'delivered', 'cancelled'];
        if (! in_array($status, $allowed, true)) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Status inválido.');
        }
        $order = Order::query()->where('id', $id)->where('venue_id', $venueId)->first();
        if (! $order) {
            throw new ApiException(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.');
        }
        $order->update(['status' => $status]);

        return self::serialize($order->fresh(['items', 'tab']));
    }

    public static function resolveTable(string $venueId, ?string $tableId, ?string $tableLabel): array
    {
        if ($tableId) {
            $table = VenueTable::query()->where('id', $tableId)->where('venue_id', $venueId)->first();
            if (! $table || ! $table->active) {
                throw new ApiException(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada ou inativa.');
            }

            return ['tableId' => $table->id, 'tableLabel' => $table->label];
        }
        $label = is_string($tableLabel) ? trim($tableLabel) : '';
        if ($label !== '') {
            return ['tableId' => null, 'tableLabel' => $label];
        }
        throw new ApiException(400, 'VALIDATION_ERROR', 'Escolha a mesa.');
    }

    /** @param  iterable<int, array{status: string, totalCents: int}>  $orders */
    public static function partialCents(iterable $orders): int
    {
        return (int) collect($orders)->where('status', '!=', 'cancelled')->sum('totalCents');
    }

    public static function venueCatalog(string $venueId): array
    {
        $categories = CatalogCategory::query()
            ->where('venue_id', $venueId)
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();
        $items = CatalogItem::query()
            ->where('venue_id', $venueId)
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        return [
            'categories' => $categories->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'sortOrder' => $c->sort_order,
                'active' => $c->active,
                'items' => $items->where('category_id', $c->id)->values()->map(fn ($i) => [
                    'id' => $i->id,
                    'categoryId' => $i->category_id,
                    'name' => $i->name,
                    'description' => $i->description,
                    'imageUrl' => $i->image_url,
                    'priceCents' => $i->price_cents,
                    'sortOrder' => $i->sort_order,
                    'active' => $i->active,
                ])->all(),
            ])->values()->all(),
        ];
    }
}
