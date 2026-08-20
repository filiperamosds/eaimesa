<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatalogItem;
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
use App\Support\Claim;
use App\Support\Http;
use App\Support\Phone;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class GuestController extends Controller
{
    public function redeem(Request $request, string $slug, string $token)
    {
        Http::rateLimit('redeem:'.Http::clientIp($request), 20, 60);
        $venue = Venue::query()->where('slug', $slug)->first();
        if (! $venue) {
            throw new ApiException(404, 'VENUE_NOT_FOUND', 'Este cardápio não existe.');
        }
        Billing::requireServicePlan($venue);
        $claim = TableClaim::query()
            ->where('venue_id', $venue->id)
            ->where('token_hash', Claim::hash($token))
            ->first();
        if (! $claim) {
            throw new ApiException(404, 'CLAIM_INVALID', 'Código inválido ou já usado.');
        }
        if ($claim->invalidated_at) {
            throw new ApiException(409, 'CLAIM_INVALID', 'Este código foi substituído. Peça um novo QR ao garçom.');
        }
        if ($claim->redeemed_at) {
            throw new ApiException(409, 'CLAIM_ALREADY_USED', 'Este código já foi usado. Use o PIN da mesa.');
        }
        if ($claim->expires_at->lt(now())) {
            throw new ApiException(410, 'CLAIM_EXPIRED', 'Código expirado. Peça um novo QR ao garçom.');
        }
        $table = VenueTable::query()
            ->where('id', $claim->table_id)
            ->where('venue_id', $venue->id)
            ->first();
        if (! $table) {
            throw new ApiException(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada.');
        }
        $session = TableSession::query()
            ->where('venue_id', $venue->id)
            ->where('table_id', $table->id)
            ->where('status', 'open')
            ->first();
        $pinDisplay = null;
        if (! $session) {
            $pinDisplay = Claim::pin();
            $session = TableSession::query()->create([
                'venue_id' => $venue->id,
                'table_id' => $table->id,
                'pin_hash' => Hash::make($pinDisplay),
                'status' => 'open',
            ]);
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
            'redirectPath' => $pinDisplay ? '/'.$venue->slug.'/bem-vindo' : '/'.$venue->slug.'/comanda',
        ])->cookie($cookie);
    }

    public function join(Request $request)
    {
        Http::rateLimit('join:'.Http::clientIp($request), 30, 60);
        $body = Http::validate($request->all(), [
            'slug' => 'required|string',
            'pin' => ['required', 'regex:/^\d{4}$/'],
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
        if (! $table || ! $venue) {
            throw new ApiException(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada.');
        }
        $name = trim($body['name']);
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
                'guest_name' => $name,
                'guest_phone' => $phone,
                'status' => 'open',
            ]);
        } elseif ($tab->guest_name !== $name) {
            $tab->update(['guest_name' => $name]);
            $tab = $tab->fresh();
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
            'tableLabel' => $table->label,
            'slug' => $venue->slug,
            'needsProfile' => false,
            'redirectPath' => '/'.$venue->slug,
        ])->cookie($cookie);
    }

    public function tab(Request $request)
    {
        $ctx = $this->loadSession($request);
        $gs = $ctx['guestSession'];
        $tab = $gs->tab_id ? Tab::query()->find($gs->tab_id) : null;
        if ($tab && $tab->status !== 'open') {
            throw new ApiException(409, 'TAB_CLOSED', 'Esta comanda foi fechada.');
        }

        return [
            'tabId' => $tab?->id,
            'status' => $tab?->status ?? 'open',
            'needsProfile' => $tab === null,
            'guestName' => $tab?->guest_name,
            'tableLabel' => $ctx['table']->label,
            'slug' => $ctx['venue']->slug,
            'venueName' => $ctx['venue']->name,
            'expiresAt' => $gs->expires_at?->toIso8601String(),
        ];
    }

    public function createOrder(Request $request)
    {
        Http::rateLimit('guest-order:'.Http::clientIp($request), 20, 60);
        $ctx = $this->loadTab($request, requireOrdering: true);
        $key = $request->header('Idempotency-Key');
        if (! is_string($key) || ! preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $key)) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Informe o header Idempotency-Key (UUID).');
        }
        $existing = Order::query()->where('venue_id', $ctx['venue']->id)->where('idempotency_key', $key)->first();
        if ($existing) {
            if ($existing->tab_id !== $ctx['tab']->id) {
                throw new ApiException(409, 'VALIDATION_ERROR', 'Esta chave de idempotência já foi usada.');
            }

            return OrderService::serialize($existing->load('items', 'tab'), $ctx['tab']->guest_name);
        }
        $body = Http::validate($request->all(), [
            'note' => 'nullable|string|max:240',
            'items' => 'required|array|min:1',
            'items.*.catalogItemId' => 'required|uuid',
            'items.*.qty' => 'required|integer|min:1|max:99',
            'items.*.note' => 'nullable|string|max:80',
        ]);
        $ids = collect($body['items'])->pluck('catalogItemId')->unique()->values();
        $catalog = CatalogItem::query()
            ->where('venue_id', $ctx['venue']->id)
            ->where('active', true)
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');
        if ($catalog->count() !== $ids->count()) {
            throw new ApiException(400, 'ITEM_NOT_FOUND', 'Algum item não está disponível neste cardápio.');
        }
        foreach ($body['items'] as $line) {
            $item = $catalog[$line['catalogItemId']];
            $max = $item->max_note_length ?? 80;
            $note = $line['note'] ?? null;
            if (is_string($note) && mb_strlen($note) > $max) {
                throw new ApiException(400, 'VALIDATION_ERROR', "Nota de {$item->name}: máximo {$max} caracteres.");
            }
        }
        try {
            $order = Order::query()->create([
                'venue_id' => $ctx['venue']->id,
                'status' => 'pending',
                'source' => 'guest',
                'table_id' => $ctx['table']->id,
                'table_label' => $ctx['table']->label,
                'tab_id' => $ctx['tab']->id,
                'idempotency_key' => $key,
                'note' => $body['note'] ?? null,
            ]);
            foreach ($body['items'] as $line) {
                $item = $catalog[$line['catalogItemId']];
                $order->items()->create([
                    'venue_id' => $ctx['venue']->id,
                    'catalog_item_id' => $item->id,
                    'name_snapshot' => $item->name,
                    'unit_price_cents_snapshot' => $item->price_cents,
                    'qty' => $line['qty'],
                    'note' => $line['note'] ?? null,
                ]);
            }

            return OrderService::serialize($order->fresh(['items', 'tab']), $ctx['tab']->guest_name);
        } catch (QueryException $e) {
            $race = Order::query()->where('venue_id', $ctx['venue']->id)->where('idempotency_key', $key)->first();
            if ($race) {
                return OrderService::serialize($race->load('items', 'tab'), $ctx['tab']->guest_name);
            }
            throw $e;
        }
    }

    public function orders(Request $request)
    {
        $ctx = $this->loadTab($request);
        $since = now()->subHours(48);
        $orders = Order::query()
            ->with(['items', 'tab'])
            ->where('tab_id', $ctx['tab']->id)
            ->where('venue_id', $ctx['venue']->id)
            ->where('created_at', '>=', $since)
            ->orderByDesc('created_at')
            ->get();
        $serialized = $orders->map(fn ($o) => OrderService::serialize($o, $ctx['tab']->guest_name))->values()->all();

        return ['orders' => $serialized, 'totalCents' => OrderService::partialCents($serialized)];
    }

    public function showOrder(Request $request, string $id)
    {
        $ctx = $this->loadTab($request);
        $order = Order::query()
            ->with(['items', 'tab'])
            ->where('id', $id)
            ->where('tab_id', $ctx['tab']->id)
            ->where('venue_id', $ctx['venue']->id)
            ->first();
        if (! $order) {
            throw new ApiException(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.');
        }

        return OrderService::serialize($order, $ctx['tab']->guest_name);
    }

    /** @return array{guestSession: GuestSession, session: TableSession, table: VenueTable, venue: Venue} */
    private function loadSession(Request $request): array
    {
        $guest = $request->attributes->get('guest');
        $gs = GuestSession::query()->find($guest['sub']);
        $session = $gs ? TableSession::query()->find($gs->table_session_id) : null;
        $table = $session ? VenueTable::query()->find($session->table_id) : null;
        $venue = $session ? Venue::query()->find($session->venue_id) : null;
        if (! $gs || ! $session || ! $table || ! $venue || $venue->id !== $guest['venueId']) {
            throw new ApiException(401, 'UNAUTHORIZED', 'Sessão expirada. Entre de novo com o PIN.');
        }
        if ($session->status !== 'open') {
            throw new ApiException(409, 'TAB_CLOSED', 'Esta mesa foi encerrada.');
        }

        return ['guestSession' => $gs, 'session' => $session, 'table' => $table, 'venue' => $venue];
    }

    /** @return array{guestSession: GuestSession, session: TableSession, table: VenueTable, venue: Venue, tab: Tab} */
    private function loadTab(Request $request, bool $requireOrdering = false): array
    {
        $ctx = $this->loadSession($request);
        if ($requireOrdering) {
            if ($ctx['venue']->subscription_status === 'suspended') {
                throw new ApiException(403, 'VENUE_SUSPENDED', 'Este bar está com a assinatura inativa.');
            }
            if (! $ctx['venue']->accepts_orders) {
                throw new ApiException(403, 'VENUE_SUSPENDED', 'Este bar não está aceitando pedidos pelo cardápio.');
            }
        }
        $tabId = $ctx['guestSession']->tab_id;
        if (! $tabId) {
            throw new ApiException(403, 'TAB_REQUIRED', 'Abra sua comanda com nome e telefone.');
        }
        $tab = Tab::query()->find($tabId);
        if (! $tab || $tab->venue_id !== $ctx['venue']->id) {
            throw new ApiException(403, 'TAB_REQUIRED', 'Abra sua comanda com nome e telefone.');
        }
        if ($tab->status !== 'open') {
            throw new ApiException(409, 'TAB_CLOSED', 'Esta comanda foi fechada.');
        }
        $ctx['tab'] = $tab;

        return $ctx;
    }
}
