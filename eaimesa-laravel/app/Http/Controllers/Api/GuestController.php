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
use App\Services\Billing;
use App\Services\GuestCookies;
use App\Services\Orders as OrderService;
use App\Support\ApiException;
use App\Support\Http;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class GuestController extends Controller
{
    public function redeem(Request $request, string $slug, string $token)
    {
        $venue = Venue::query()->where('slug', $slug)->first();
        if (! $venue) {
            throw new ApiException(404, 'VENUE_NOT_FOUND', 'Este cardápio não existe.');
        }
        Billing::requireServicePlan($venue);
        $hash = hash('sha256', $token);
        $claim = TableClaim::query()
            ->where('venue_id', $venue->id)
            ->where('token_hash', $hash)
            ->first();
        if (! $claim) {
            throw new ApiException(404, 'CLAIM_INVALID', 'QR inválido. Peça um novo ao garçom.');
        }
        if ($claim->invalidated_at) {
            throw new ApiException(404, 'CLAIM_INVALID', 'QR inválido. Peça um novo ao garçom.');
        }
        if ($claim->expires_at->lt(now())) {
            throw new ApiException(410, 'CLAIM_EXPIRED', 'Este QR expirou. Peça um novo ao garçom.');
        }
        if ($claim->redeemed_at) {
            throw new ApiException(409, 'CLAIM_ALREADY_USED', 'Este QR já foi usado.');
        }
        $table = VenueTable::query()->find($claim->table_id);
        if (! $table) {
            throw new ApiException(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada.');
        }
        $session = TableSession::query()->where('table_id', $table->id)->where('status', 'open')->first();
        $pinDisplay = null;
        if (! $session) {
            $pin = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
            $session = TableSession::query()->create([
                'venue_id' => $venue->id,
                'table_id' => $table->id,
                'pin_hash' => Hash::make($pin),
                'status' => 'open',
            ]);
            $pinDisplay = $pin;
        }
        $claim->update(['redeemed_at' => now(), 'table_session_id' => $session->id]);
        $cookie = GuestCookies::issue([
            'venueId' => $venue->id,
            'tableSessionId' => $session->id,
            'tabId' => null,
        ]);

        return response()->json([
            'pinDisplay' => $pinDisplay,
            'tableLabel' => $table->label,
            'slug' => $venue->slug,
            'needsProfile' => true,
            'redirectPath' => '/'.$venue->slug.'/bem-vindo',
        ])->cookie($cookie);
    }

    public function join(Request $request)
    {
        Http::rateLimit('join:'.Http::clientIp($request), 30, 60);
        $body = Http::validate($request->all(), [
            'slug' => 'required|string',
            'pin' => 'required|string',
        ]);
        $venue = Venue::query()->where('slug', $body['slug'])->first();
        if (! $venue) {
            throw new ApiException(404, 'VENUE_NOT_FOUND', 'Este cardápio não existe.');
        }
        Billing::requireServicePlan($venue);
        $lock = Http::pinLock(
            'pinjoin:'.Http::clientIp($request).':'.$venue->id,
            (int) config('eaimesa.pin_join_max_failures'),
            (int) config('eaimesa.pin_join_window_minutes') * 60,
        );
        $open = TableSession::query()->with('table')->where('venue_id', $venue->id)->where('status', 'open')->get();
        $matched = null;
        foreach ($open as $row) {
            if (Hash::check($body['pin'], $row->pin_hash)) {
                $matched = $row;
                break;
            }
        }
        if (! $matched) {
            $lock->fail();
            throw new ApiException(401, 'PIN_INVALID', 'PIN inválido. Peça o código a quem já está na mesa.');
        }
        $lock->succeed();
        $cookie = GuestCookies::issue([
            'venueId' => $venue->id,
            'tableSessionId' => $matched->id,
            'tabId' => null,
        ]);

        return response()->json([
            'tableLabel' => $matched->table?->label,
            'slug' => $venue->slug,
            'needsProfile' => true,
            'redirectPath' => '/'.$venue->slug.'/comanda',
        ])->cookie($cookie);
    }

    public function openTab(Request $request)
    {
        $guest = $request->attributes->get('guest');
        $body = Http::validate($request->all(), [
            'name' => 'required|string|min:2|max:80',
            'phone' => 'required|string',
        ]);
        $phone = Phone::assertValid($body['phone']);
        $session = TableSession::query()->find($guest['tableSessionId']);
        if (! $session || $session->venue_id !== $guest['venueId'] || $session->status !== 'open') {
            throw new ApiException(409, 'TAB_CLOSED', 'Esta mesa foi encerrada. Peça um novo QR ao garçom.');
        }
        $table = VenueTable::query()->find($session->table_id);
        $venue = Venue::query()->find($session->venue_id);
        $tab = Tab::query()
            ->where('table_session_id', $session->id)
            ->where('guest_phone', $phone)
            ->where('status', 'open')
            ->first();
        if (! $tab) {
            $tab = Tab::query()->create([
                'venue_id' => $session->venue_id,
                'table_id' => $session->table_id,
                'table_session_id' => $session->id,
                'guest_name' => trim($body['name']),
                'guest_phone' => $phone,
                'status' => 'open',
            ]);
        } elseif ($tab->guest_name !== trim($body['name'])) {
            $tab->update(['guest_name' => trim($body['name'])]);
        }
        $cookie = GuestCookies::issue([
            'venueId' => $session->venue_id,
            'tableSessionId' => $session->id,
            'tabId' => $tab->id,
            'sessionId' => $guest['sub'],
        ]);

        return response()->json([
            'tabId' => $tab->id,
            'guestName' => $tab->guest_name,
            'tableLabel' => $table?->label,
            'slug' => $venue?->slug,
            'needsProfile' => false,
            'redirectPath' => '/'.$venue?->slug,
        ])->cookie($cookie);
    }

    public function tab(Request $request)
    {
        $guest = $request->attributes->get('guest');
        $gs = GuestSession::query()->find($guest['sub']);
        $session = TableSession::query()->find($guest['tableSessionId']);
        $table = $session ? VenueTable::query()->find($session->table_id) : null;
        $venue = $session ? Venue::query()->find($session->venue_id) : null;
        $tab = $gs?->tab_id ? Tab::query()->find($gs->tab_id) : null;
        $needsProfile = ! $tab || $tab->status !== 'open';

        return [
            'needsProfile' => $needsProfile,
            'tableLabel' => $table?->label,
            'slug' => $venue?->slug,
            'guestName' => $tab?->guest_name,
            'tabId' => $tab?->id,
            'status' => $tab?->status ?? ($session?->status === 'open' ? 'open' : 'closed'),
        ];
    }

    public function createOrder(Request $request)
    {
        $guest = $request->attributes->get('guest');
        if (! $guest['tabId']) {
            throw new ApiException(403, 'TAB_REQUIRED', 'Informe nome e telefone para pedir.');
        }
        $tab = Tab::query()->find($guest['tabId']);
        if (! $tab || $tab->status !== 'open') {
            throw new ApiException(409, 'TAB_CLOSED', 'Esta comanda foi fechada.');
        }
        $key = $request->header('Idempotency-Key');
        if (! is_string($key) || $key === '') {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Informe Idempotency-Key.');
        }
        $existing = Order::query()->where('venue_id', $guest['venueId'])->where('idempotency_key', $key)->first();
        if ($existing) {
            return OrderService::serialize($existing->load('items', 'tab'));
        }
        $body = Http::validate($request->all(), [
            'note' => 'nullable|string|max:240',
            'items' => 'required|array|min:1',
            'items.*.catalogItemId' => 'required|uuid',
            'items.*.qty' => 'required|integer|min:1|max:99',
            'items.*.note' => 'nullable|string|max:80',
        ]);
        $session = TableSession::query()->findOrFail($guest['tableSessionId']);
        $table = VenueTable::query()->find($session->table_id);
        $order = Order::query()->create([
            'venue_id' => $guest['venueId'],
            'status' => 'pending',
            'source' => 'guest',
            'table_id' => $session->table_id,
            'table_label' => $table?->label ?? '',
            'tab_id' => $tab->id,
            'idempotency_key' => $key,
            'note' => $body['note'] ?? null,
        ]);
        OrderService::attachItems($order, $guest['venueId'], $body['items']);

        return OrderService::serialize($order->fresh(['items', 'tab']));
    }

    public function orders(Request $request)
    {
        $guest = $request->attributes->get('guest');
        if (! $guest['tabId']) {
            throw new ApiException(403, 'TAB_REQUIRED', 'Informe nome e telefone para pedir.');
        }
        $since = now()->subHours(48);
        $orders = Order::query()->with(['items', 'tab'])
            ->where('tab_id', $guest['tabId'])
            ->where('created_at', '>=', $since)
            ->orderByDesc('created_at')
            ->get();
        $serialized = $orders->map(fn ($o) => OrderService::serialize($o));
        $total = $serialized->where('status', '!=', 'cancelled')->sum('totalCents');

        return ['totalCents' => $total, 'orders' => $serialized->values()->all()];
    }

    public function showOrder(Request $request, string $id)
    {
        $guest = $request->attributes->get('guest');
        if (! $guest['tabId']) {
            throw new ApiException(403, 'TAB_REQUIRED', 'Informe nome e telefone para pedir.');
        }
        $order = Order::query()->with(['items', 'tab'])->where('id', $id)->where('tab_id', $guest['tabId'])->first();
        if (! $order) {
            throw new ApiException(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.');
        }

        return OrderService::serialize($order);
    }
}
