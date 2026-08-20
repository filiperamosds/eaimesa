<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Venue;
use App\Models\VenueMember;
use App\Models\VenueTable;
use App\Services\Orders as OrderService;
use App\Support\ApiException;
use App\Support\Http;
use App\Support\Plans;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class OwnerOpsController extends Controller
{
    public function orders(Request $request)
    {
        return OrderService::listKanban($request->attributes->get('session')['venueId']);
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

        return OrderService::createCounter($request->attributes->get('session')['venueId'], $body);
    }

    public function patchOrder(Request $request, string $id)
    {
        $body = Http::validate($request->all(), ['status' => 'required|string']);

        return OrderService::patchStatus($request->attributes->get('session')['venueId'], $id, $body['status']);
    }

    public function tables(Request $request)
    {
        $rows = VenueTable::query()
            ->where('venue_id', $request->attributes->get('session')['venueId'])
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        return [
            'tables' => $rows->map(fn ($t) => $this->tablePayload($t))->all(),
            'maxActive' => Plans::BAR_MAX_TABLES,
            'activeCount' => $rows->where('active', true)->count(),
        ];
    }

    public function createTable(Request $request)
    {
        $body = Http::validate($request->all(), [
            'label' => 'required|string|min:1|max:40',
            'sortOrder' => 'nullable|integer|min:0',
        ]);
        $venueId = $request->attributes->get('session')['venueId'];
        $label = trim($body['label']);
        if ($this->labelTaken($venueId, $label)) {
            throw new ApiException(409, 'TABLE_LABEL_TAKEN', 'Já existe uma mesa com esse nome.');
        }
        $active = VenueTable::query()->where('venue_id', $venueId)->where('active', true)->count();
        if ($active >= Plans::BAR_MAX_TABLES) {
            throw new ApiException(409, 'TABLE_LIMIT', 'Auto atendimento: no máximo '.Plans::BAR_MAX_TABLES.' mesas ativas.');
        }
        $maxSort = (int) VenueTable::query()->where('venue_id', $venueId)->max('sort_order');
        $row = VenueTable::query()->create([
            'venue_id' => $venueId,
            'label' => $label,
            'sort_order' => $body['sortOrder'] ?? ($maxSort + 1),
            'active' => true,
        ]);

        return $this->tablePayload($row);
    }

    public function patchTable(Request $request, string $id)
    {
        $venueId = $request->attributes->get('session')['venueId'];
        $row = VenueTable::query()->where('id', $id)->where('venue_id', $venueId)->first();
        if (! $row) {
            throw new ApiException(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada.');
        }
        $patch = [];
        if ($request->exists('label')) {
            $label = trim((string) $request->input('label'));
            if ($this->labelTaken($venueId, $label, $id)) {
                throw new ApiException(409, 'TABLE_LABEL_TAKEN', 'Já existe uma mesa com esse nome.');
            }
            $patch['label'] = $label;
        }
        if ($request->exists('sortOrder')) {
            $patch['sort_order'] = (int) $request->input('sortOrder');
        }
        if ($request->exists('active')) {
            $want = (bool) $request->input('active');
            if ($want && ! $row->active) {
                $active = VenueTable::query()->where('venue_id', $venueId)->where('active', true)->count();
                if ($active >= Plans::BAR_MAX_TABLES) {
                    throw new ApiException(409, 'TABLE_LIMIT', 'Auto atendimento: no máximo '.Plans::BAR_MAX_TABLES.' mesas ativas.');
                }
            }
            $patch['active'] = $want;
        }
        if ($patch) {
            $row->update($patch);
        }

        return $this->tablePayload($row->fresh());
    }

    public function deleteTable(Request $request, string $id)
    {
        $row = VenueTable::query()
            ->where('id', $id)
            ->where('venue_id', $request->attributes->get('session')['venueId'])
            ->first();
        if (! $row) {
            throw new ApiException(404, 'TABLE_NOT_FOUND', 'Mesa não encontrada.');
        }
        $row->delete();

        return response()->noContent();
    }

    public function staff(Request $request)
    {
        $venueId = $request->attributes->get('session')['venueId'];
        $rows = VenueMember::query()
            ->with('account')
            ->where('venue_id', $venueId)
            ->orderBy('name')
            ->get();

        return [
            'staff' => $rows->map(fn ($m) => $this->staffPayload($m))->all(),
            'maxActive' => Plans::STAFF_LIMIT,
            'activeCount' => $rows->where('active', true)->count(),
        ];
    }

    public function createStaff(Request $request)
    {
        $body = Http::validate($request->all(), [
            'name' => 'required|string|min:2|max:80',
            'email' => 'required|email',
            'password' => 'required|string|min:8',
        ]);
        $venueId = $request->attributes->get('session')['venueId'];
        $email = strtolower(trim($body['email']));
        if (Account::query()->where('email', $email)->exists()) {
            throw new ApiException(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.');
        }
        $active = VenueMember::query()->where('venue_id', $venueId)->where('active', true)->count();
        if ($active >= Plans::STAFF_LIMIT) {
            throw new ApiException(409, 'STAFF_LIMIT', 'Auto atendimento: no máximo '.Plans::STAFF_LIMIT.' garçons ativos.');
        }
        $member = DB::transaction(function () use ($email, $body, $venueId) {
            $account = Account::query()->create([
                'email' => $email,
                'password_hash' => Hash::make($body['password']),
            ]);

            return VenueMember::query()->create([
                'venue_id' => $venueId,
                'account_id' => $account->id,
                'role' => 'staff',
                'name' => trim($body['name']),
                'active' => true,
            ]);
        });

        return $this->staffPayload($member->load('account'));
    }

    public function patchStaff(Request $request, string $id)
    {
        $member = VenueMember::query()
            ->with('account')
            ->where('id', $id)
            ->where('venue_id', $request->attributes->get('session')['venueId'])
            ->first();
        if (! $member) {
            throw new ApiException(404, 'STAFF_NOT_FOUND', 'Garçom não encontrado.');
        }
        if ($request->exists('name')) {
            $member->name = trim((string) $request->input('name'));
        }
        if ($request->exists('active')) {
            $want = (bool) $request->input('active');
            if ($want && ! $member->active) {
                $active = VenueMember::query()->where('venue_id', $member->venue_id)->where('active', true)->count();
                if ($active >= Plans::STAFF_LIMIT) {
                    throw new ApiException(409, 'STAFF_LIMIT', 'Auto atendimento: no máximo '.Plans::STAFF_LIMIT.' garçons ativos.');
                }
            }
            $member->active = $want;
        }
        $member->save();
        if ($request->filled('password')) {
            $member->account?->update(['password_hash' => Hash::make((string) $request->input('password'))]);
        }

        return $this->staffPayload($member->fresh('account'));
    }

    public function deleteStaff(Request $request, string $id)
    {
        $venueId = $request->attributes->get('session')['venueId'];
        $deleted = DB::transaction(function () use ($id, $venueId) {
            $member = VenueMember::query()->where('id', $id)->where('venue_id', $venueId)->first();
            if (! $member) {
                return null;
            }
            $accountId = $member->account_id;
            $member->delete();
            $ownsVenue = Venue::query()->where('owner_account_id', $accountId)->exists();
            if (! $ownsVenue) {
                Account::query()->where('id', $accountId)->delete();
            }

            return true;
        });
        if (! $deleted) {
            throw new ApiException(404, 'STAFF_NOT_FOUND', 'Garçom não encontrado.');
        }

        return response()->noContent();
    }

    private function tablePayload(VenueTable $t): array
    {
        return [
            'id' => $t->id,
            'label' => $t->label,
            'sortOrder' => $t->sort_order,
            'active' => $t->active,
            'createdAt' => $t->created_at?->toIso8601String(),
            'updatedAt' => $t->updated_at?->toIso8601String(),
        ];
    }

    private function staffPayload(VenueMember $m): array
    {
        return [
            'id' => $m->id,
            'name' => $m->name,
            'email' => $m->account?->email,
            'active' => $m->active,
            'createdAt' => $m->created_at?->toIso8601String(),
            'updatedAt' => $m->updated_at?->toIso8601String(),
        ];
    }

    private function labelTaken(string $venueId, string $label, ?string $exceptId = null): bool
    {
        $q = VenueTable::query()
            ->where('venue_id', $venueId)
            ->whereRaw('LOWER(label) = ?', [mb_strtolower($label)]);
        if ($exceptId) {
            $q->where('id', '!=', $exceptId);
        }

        return $q->exists();
    }
}
