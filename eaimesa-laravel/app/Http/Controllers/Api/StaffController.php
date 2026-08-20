<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GuestSession;
use App\Models\Order;
use App\Models\Tab;
use App\Models\TableClaim;
use App\Models\TableSession;
use App\Models\Venue;
use App\Models\VenueTable;
use App\Services\Orders as OrderService;
use App\Support\ApiException;
use App\Support\Claim;
use App\Support\Http;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffController extends Controller
{
    public function tables(Request $request)
    {
        $venueId = $request->attributes->get('venueActor')['venueId'];
        $rows = VenueTable::query()
            ->where('venue_id', $venueId)
            ->where('active', true)
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();
        $openSessions = TableSession::query()
            ->where('venue_id', $venueId)
            ->where('status', 'open')
            ->pluck('table_id')
            ->all();
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
        $table = VenueTable::query()
            ->where('id', $tableId)
            ->where('venue_id', $actor['venueId'])
            ->where('active', true)
            ->first();
        if (! $table) {
            throw new ApiException(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada ou inativa.');
        }
        $venue = Venue::query()->findOrFail($actor['venueId']);
        $token = Claim::token();
        $ttl = (int) config('eaimesa.claim_ttl_seconds');
        $staffMemberId = $actor['role'] === 'staff' ? $actor['memberId'] : null;

        $claim = DB::transaction(function () use ($actor, $table, $venue, $token, $ttl, $staffMemberId) {
            TableClaim::query()
                ->where('venue_id', $venue->id)
                ->where('table_id', $table->id)
                ->whereNull('redeemed_at')
                ->whereNull('invalidated_at')
                ->update(['invalidated_at' => now()]);

            return TableClaim::query()->create([
                'venue_id' => $venue->id,
                'table_id' => $table->id,
                'member_id' => $staffMemberId,
                'owner_account_id' => $staffMemberId ? null : $actor['accountId'],
                'token_hash' => Claim::hash($token),
                'expires_at' => now()->addSeconds($ttl),
            ]);
        });

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
        $session = TableSession::query()
            ->where('venue_id', $venueId)
            ->where('table_id', $tableId)
            ->where('status', 'open')
            ->first();
        if (! $session) {
            return [
                'table' => ['id' => $table->id, 'label' => $table->label, 'sessionOpen' => false, 'openTabCount' => 0],
                'tabs' => [],
            ];
        }
        $tabs = Tab::query()->where('table_session_id', $session->id)->orderBy('created_at')->get();
        $orders = Order::query()
            ->with(['items', 'tab'])
            ->where('venue_id', $venueId)
            ->whereIn('tab_id', $tabs->pluck('id'))
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('tab_id');

        return [
            'table' => [
                'id' => $table->id,
                'label' => $table->label,
                'sessionOpen' => true,
                'openTabCount' => $tabs->where('status', 'open')->count(),
            ],
            'tabs' => $tabs->map(function (Tab $tab) use ($orders) {
                $serialized = ($orders->get($tab->id) ?? collect())
                    ->map(fn (Order $o) => OrderService::serialize($o, $tab->guest_name))
                    ->values();

                return [
                    'id' => $tab->id,
                    'guestName' => $tab->guest_name,
                    'guestPhoneMasked' => Phone::mask($tab->guest_phone),
                    'status' => $tab->status,
                    'createdAt' => $tab->created_at?->toIso8601String(),
                    'totalCents' => OrderService::partialCents($serialized),
                    'orders' => $serialized->all(),
                ];
            })->values()->all(),
        ];
    }

    public function closeTab(Request $request, string $tabId)
    {
        $venueId = $request->attributes->get('venueActor')['venueId'];
        $tab = Tab::query()->where('id', $tabId)->where('venue_id', $venueId)->first();
        if (! $tab) {
            throw new ApiException(404, 'TAB_NOT_FOUND', 'Comanda não encontrada.');
        }
        if ($tab->status !== 'open') {
            throw new ApiException(409, 'TAB_CLOSED', 'Esta comanda já está fechada.');
        }
        $now = now();
        DB::transaction(function () use ($tab, $now) {
            $tab->update(['status' => 'closed', 'closed_at' => $now]);
            GuestSession::query()->where('tab_id', $tab->id)->update(['expires_at' => $now]);
        });

        return ['ok' => true, 'tabId' => $tab->id, 'status' => 'closed'];
    }

    public function closeTable(Request $request, string $tableId)
    {
        $venueId = $request->attributes->get('venueActor')['venueId'];
        $table = VenueTable::query()->where('id', $tableId)->where('venue_id', $venueId)->first();
        if (! $table) {
            throw new ApiException(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada.');
        }
        $session = TableSession::query()
            ->where('table_id', $tableId)
            ->where('venue_id', $venueId)
            ->where('status', 'open')
            ->first();
        if (! $session) {
            throw new ApiException(409, 'TAB_CLOSED', 'Esta mesa já está encerrada.');
        }
        $openCount = Tab::query()->where('table_session_id', $session->id)->where('status', 'open')->count();
        if ($openCount > 0) {
            throw new ApiException(409, 'TABS_STILL_OPEN', "Feche as {$openCount} comanda(s) aberta(s) antes de encerrar a mesa.");
        }
        $now = now();
        DB::transaction(function () use ($session, $tableId, $now) {
            $session->update(['status' => 'closed', 'closed_at' => $now]);
            GuestSession::query()->where('table_session_id', $session->id)->update(['expires_at' => $now]);
            TableClaim::query()
                ->where('table_id', $tableId)
                ->whereNull('redeemed_at')
                ->whereNull('invalidated_at')
                ->update(['invalidated_at' => $now]);
        });

        return ['ok' => true, 'tableId' => $table->id, 'status' => 'closed'];
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
        return OrderService::venueCatalog($request->attributes->get('venueActor')['venueId']);
    }
}
