<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatalogCategory;
use App\Models\CatalogItem;
use App\Models\Order;
use App\Models\Tab;
use App\Models\TableClaim;
use App\Models\TableSession;
use App\Models\Venue;
use App\Models\VenueTable;
use App\Services\Orders as OrderService;
use App\Support\ApiException;
use App\Support\Http;
use App\Support\Phone;
use Illuminate\Http\Request;

class StaffController extends Controller
{
    public function tables(Request $request)
    {
        $venueId = $request->attributes->get('venueActor')['venueId'];
        $rows = VenueTable::query()->where('venue_id', $venueId)->where('active', true)->orderBy('sort_order')->orderBy('created_at')->get();
        $openSessions = TableSession::query()->where('venue_id', $venueId)->where('status', 'open')->pluck('table_id')->all();
        $openTabRows = Tab::query()
            ->where('venue_id', $venueId)
            ->where('status', 'open')
            ->whereHas('session', fn ($q) => $q->where('status', 'open'))
            ->orderBy('created_at')
            ->get();
        $pending = TableClaim::query()
            ->where('venue_id', $venueId)
            ->whereNull('redeemed_at')
            ->whereNull('invalidated_at')
            ->where('expires_at', '>', now())
            ->pluck('table_id')
            ->all();

        return [
            'tables' => $rows->map(function ($t) use ($openSessions, $openTabRows, $pending) {
                $openTabs = $openTabRows->where('table_id', $t->id)->values()->map(fn ($tab) => [
                    'id' => $tab->id,
                    'guestName' => $tab->guest_name,
                    'guestPhoneMasked' => Phone::mask($tab->guest_phone),
                ])->all();

                return [
                    'id' => $t->id,
                    'label' => $t->label,
                    'sortOrder' => $t->sort_order,
                    'sessionOpen' => in_array($t->id, $openSessions, true),
                    'claimPending' => in_array($t->id, $pending, true),
                    'openTabCount' => count($openTabs),
                    'openTabs' => $openTabs,
                ];
            })->values()->all(),
        ];
    }

    public function createClaim(Request $request, string $tableId)
    {
        $actor = $request->attributes->get('venueActor');
        $table = VenueTable::query()->where('id', $tableId)->where('venue_id', $actor['venueId'])->where('active', true)->first();
        if (! $table) {
            throw new ApiException(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada ou inativa.');
        }
        $venue = Venue::query()->findOrFail($actor['venueId']);
        $token = bin2hex(random_bytes(16));
        $claim = TableClaim::query()->create([
            'venue_id' => $venue->id,
            'table_id' => $table->id,
            'member_id' => $actor['role'] === 'staff' ? $actor['memberId'] : null,
            'owner_account_id' => $actor['role'] === 'owner' ? $actor['accountId'] : $actor['accountId'],
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addSeconds((int) config('eaimesa.claim_ttl_seconds')),
        ]);
        $ttl = (int) config('eaimesa.claim_ttl_seconds');

        return [
            'claimId' => $claim->id,
            'tableId' => $table->id,
            'tableLabel' => $table->label,
            'claimUrl' => rtrim((string) config('eaimesa.app_url'), '/').'/'.$venue->slug.'/c/'.$token,
            'expiresAt' => $claim->expires_at->toIso8601String(),
            'expiresInSeconds' => $ttl,
        ];
    }

    public function tableTabs(Request $request, string $tableId)
    {
        $venueId = $request->attributes->get('venueActor')['venueId'];
        $table = VenueTable::query()->where('id', $tableId)->where('venue_id', $venueId)->first();
        if (! $table) {
            throw new ApiException(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada.');
        }
        $session = TableSession::query()->where('table_id', $tableId)->where('status', 'open')->first();
        $tabs = Tab::query()
            ->where('table_id', $tableId)
            ->when($session, fn ($q) => $q->where('table_session_id', $session->id))
            ->orderBy('created_at')
            ->get();

        return [
            'tabs' => $tabs->map(function ($tab) {
                $orders = Order::query()->with('items')->where('tab_id', $tab->id)->orderByDesc('created_at')->get();
                $serialized = $orders->map(fn ($o) => OrderService::serialize($o));
                $total = $serialized->where('status', '!=', 'cancelled')->sum('totalCents');

                return [
                    'id' => $tab->id,
                    'guestName' => $tab->guest_name,
                    'guestPhoneMasked' => Phone::mask($tab->guest_phone),
                    'status' => $tab->status,
                    'totalCents' => $total,
                    'orders' => $serialized->all(),
                ];
            })->all(),
        ];
    }

    public function closeTab(Request $request, string $tabId)
    {
        $venueId = $request->attributes->get('venueActor')['venueId'];
        $tab = Tab::query()->where('id', $tabId)->where('venue_id', $venueId)->first();
        if (! $tab) {
            throw new ApiException(404, 'TAB_NOT_FOUND', 'Comanda não encontrada.');
        }
        if ($tab->status === 'closed') {
            throw new ApiException(409, 'TAB_CLOSED', 'Esta comanda já foi fechada.');
        }
        $tab->update(['status' => 'closed', 'closed_at' => now()]);

        return ['ok' => true, 'id' => $tab->id, 'status' => 'closed'];
    }

    public function closeTable(Request $request, string $tableId)
    {
        $venueId = $request->attributes->get('venueActor')['venueId'];
        $session = TableSession::query()->where('table_id', $tableId)->where('venue_id', $venueId)->where('status', 'open')->first();
        if (! $session) {
            throw new ApiException(404, 'TABLE_NOT_FOUND', 'Mesa sem sessão aberta.');
        }
        $open = Tab::query()->where('table_session_id', $session->id)->where('status', 'open')->exists();
        if ($open) {
            throw new ApiException(409, 'TABS_STILL_OPEN', 'Feche todas as comandas antes de encerrar a mesa.');
        }
        $session->update(['status' => 'closed', 'closed_at' => now()]);

        return ['ok' => true];
    }

    public function orders(Request $request)
    {
        return OrderService::listKanban($request->attributes->get('venueActor')['venueId']);
    }

    public function createOrder(Request $request)
    {
        $body = Http::validate($request->all(), [
            'tableId' => 'nullable|uuid',
            'tableLabel' => 'nullable|string|max:40',
            'note' => 'nullable|string|max:240',
            'items' => 'required|array|min:1',
            'items.*.catalogItemId' => 'required|uuid',
            'items.*.qty' => 'required|integer|min:1|max:99',
            'items.*.note' => 'nullable|string|max:80',
        ]);

        return OrderService::createCounter($request->attributes->get('venueActor')['venueId'], $body);
    }

    public function patchOrder(Request $request, string $id)
    {
        $body = Http::validate($request->all(), ['status' => 'required|string']);

        return OrderService::patchStatus($request->attributes->get('venueActor')['venueId'], $id, $body['status']);
    }

    public function catalog(Request $request)
    {
        $venueId = $request->attributes->get('venueActor')['venueId'];
        $categories = CatalogCategory::query()->where('venue_id', $venueId)->where('active', true)->orderBy('sort_order')->get();
        $items = CatalogItem::query()->where('venue_id', $venueId)->where('active', true)->orderBy('sort_order')->get();

        return [
            'categories' => $categories->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'items' => $items->where('category_id', $c->id)->values()->map(fn ($i) => [
                    'id' => $i->id,
                    'name' => $i->name,
                    'priceCents' => $i->price_cents,
                ])->all(),
            ])->values()->all(),
        ];
    }
}
