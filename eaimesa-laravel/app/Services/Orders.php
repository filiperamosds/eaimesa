<?php

namespace App\Services;

use App\Models\CatalogItem;
use App\Models\Order;
use App\Models\VenueTable;
use App\Support\ApiException;
use Illuminate\Support\Carbon;

class Orders
{
    public static function serialize(Order $order): array
    {
        $order->loadMissing('items', 'tab');
        $items = $order->items->map(fn ($i) => [
            'id' => $i->id,
            'name' => $i->name_snapshot,
            'qty' => $i->qty,
            'unitPriceCents' => $i->unit_price_cents_snapshot,
            'note' => $i->note,
        ])->all();
        $total = collect($items)->sum(fn ($i) => $i['qty'] * $i['unitPriceCents']);

        return [
            'id' => $order->id,
            'status' => $order->status,
            'source' => $order->source,
            'tableId' => $order->table_id,
            'tableLabel' => $order->table_label,
            'tabId' => $order->tab_id,
            'guestName' => $order->tab?->guest_name,
            'note' => $order->note,
            'totalCents' => $total,
            'items' => $items,
            'createdAt' => $order->created_at?->toIso8601String(),
            'updatedAt' => $order->updated_at?->toIso8601String(),
        ];
    }

    public static function listKanban(string $venueId): array
    {
        $since = now()->subHours(48);
        $orders = Order::query()
            ->with(['items', 'tab'])
            ->where('venue_id', $venueId)
            ->where('status', '!=', 'cancelled')
            ->where('created_at', '>=', $since)
            ->orderByDesc('created_at')
            ->get();

        return ['orders' => $orders->map(fn (Order $o) => self::serialize($o))->all()];
    }

    public static function createCounter(string $venueId, array $body): array
    {
        $tableId = $body['tableId'] ?? null;
        $tableLabel = isset($body['tableLabel']) ? trim((string) $body['tableLabel']) : '';
        if ($tableId) {
            $table = VenueTable::query()
                ->where('id', $tableId)
                ->where('venue_id', $venueId)
                ->where('active', true)
                ->first();
            if (! $table) {
                throw new ApiException(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada ou inativa.');
            }
            $tableLabel = $table->label;
        }
        if ($tableLabel === '') {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Informe a mesa.');
        }
        $items = $body['items'] ?? [];
        if (! is_array($items) || $items === []) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Adicione ao menos um item.');
        }

        $order = Order::query()->create([
            'venue_id' => $venueId,
            'status' => 'pending',
            'source' => 'counter',
            'table_id' => $tableId,
            'table_label' => $tableLabel,
            'note' => $body['note'] ?? null,
        ]);
        self::attachItems($order, $venueId, $items);

        return self::serialize($order->fresh(['items', 'tab']));
    }

    public static function attachItems(Order $order, string $venueId, array $items): void
    {
        foreach ($items as $line) {
            $qty = (int) ($line['qty'] ?? 0);
            if ($qty < 1) {
                throw new ApiException(400, 'VALIDATION_ERROR', 'Quantidade inválida.');
            }
            $item = CatalogItem::query()
                ->where('id', $line['catalogItemId'] ?? '')
                ->where('venue_id', $venueId)
                ->where('active', true)
                ->first();
            if (! $item) {
                throw new ApiException(404, 'ITEM_NOT_FOUND', 'Item do cardápio não encontrado.');
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
}
