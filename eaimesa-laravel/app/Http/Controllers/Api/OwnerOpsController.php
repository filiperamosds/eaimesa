<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\VenueMember;
use App\Models\VenueTable;
use App\Services\Orders as OrderService;
use App\Support\ApiException;
use App\Support\Http;
use App\Support\Plans;
use Illuminate\Http\Request;
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
            'tables' => $rows->map(fn ($t) => [
                'id' => $t->id,
                'label' => $t->label,
                'sortOrder' => $t->sort_order,
                'active' => $t->active,
            ])->all(),
        ];
    }

    public function createTable(Request $request)
    {
        $body = Http::validate($request->all(), [
            'label' => 'required|string|min:1|max:40',
            'sortOrder' => 'nullable|integer|min:0',
        ]);
        $venueId = $request->attributes->get('session')['venueId'];
        $active = VenueTable::query()->where('venue_id', $venueId)->where('active', true)->count();
        if ($active >= Plans::BAR_MAX_TABLES) {
            throw new ApiException(409, 'TABLE_LIMIT', 'No máximo 15 mesas ativas.');
        }
        if (VenueTable::query()->where('venue_id', $venueId)->where('label', trim($body['label']))->exists()) {
            throw new ApiException(409, 'TABLE_LABEL_TAKEN', 'Já existe uma mesa com este nome.');
        }
        $row = VenueTable::query()->create([
            'venue_id' => $venueId,
            'label' => trim($body['label']),
            'sort_order' => $body['sortOrder'] ?? 0,
            'active' => true,
        ]);

        return ['id' => $row->id, 'label' => $row->label, 'sortOrder' => $row->sort_order, 'active' => $row->active];
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
            if (VenueTable::query()->where('venue_id', $venueId)->where('label', $label)->where('id', '!=', $id)->exists()) {
                throw new ApiException(409, 'TABLE_LABEL_TAKEN', 'Já existe uma mesa com este nome.');
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
                    throw new ApiException(409, 'TABLE_LIMIT', 'No máximo 15 mesas ativas.');
                }
            }
            $patch['active'] = $want;
        }
        if ($patch) {
            $row->update($patch);
        }

        return ['id' => $row->id, 'label' => $row->fresh()->label, 'sortOrder' => $row->sort_order, 'active' => $row->active];
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

        return ['ok' => true];
    }

    public function staff(Request $request)
    {
        $venueId = $request->attributes->get('session')['venueId'];
        $rows = VenueMember::query()->with('account')->where('venue_id', $venueId)->orderBy('created_at')->get();
        $activeCount = $rows->where('active', true)->count();

        return [
            'activeCount' => $activeCount,
            'limit' => Plans::STAFF_LIMIT,
            'staff' => $rows->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'email' => $m->account?->email,
                'active' => $m->active,
            ])->all(),
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
        $active = VenueMember::query()->where('venue_id', $venueId)->where('active', true)->count();
        if ($active >= Plans::STAFF_LIMIT) {
            throw new ApiException(409, 'STAFF_LIMIT', 'No máximo 5 garçons ativos.');
        }
        $email = strtolower(trim($body['email']));
        $account = Account::query()->where('email', $email)->first();
        if ($account) {
            throw new ApiException(409, 'EMAIL_TAKEN', 'Este e-mail já tem conta.');
        }
        $account = Account::query()->create([
            'email' => $email,
            'password_hash' => Hash::make($body['password']),
        ]);
        $member = VenueMember::query()->create([
            'venue_id' => $venueId,
            'account_id' => $account->id,
            'role' => 'staff',
            'name' => trim($body['name']),
            'active' => true,
        ]);

        return ['id' => $member->id, 'name' => $member->name, 'email' => $account->email, 'active' => true];
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
                    throw new ApiException(409, 'STAFF_LIMIT', 'No máximo 5 garçons ativos.');
                }
            }
            $member->active = $want;
        }
        $member->save();
        if ($request->filled('password')) {
            $member->account?->update(['password_hash' => Hash::make((string) $request->input('password'))]);
        }

        return ['id' => $member->id, 'name' => $member->name, 'email' => $member->account?->email, 'active' => $member->active];
    }

    public function deleteStaff(Request $request, string $id)
    {
        $member = VenueMember::query()
            ->where('id', $id)
            ->where('venue_id', $request->attributes->get('session')['venueId'])
            ->first();
        if (! $member) {
            throw new ApiException(404, 'STAFF_NOT_FOUND', 'Garçom não encontrado.');
        }
        $member->delete();

        return ['ok' => true];
    }
}
