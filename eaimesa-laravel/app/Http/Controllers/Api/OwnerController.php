<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatalogCategory;
use App\Models\CatalogItem;
use App\Models\Venue;
use App\Services\Billing;
use App\Support\ApiException;
use App\Support\Http;
use App\Support\Slug;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OwnerController extends Controller
{
    public function venue(Request $request)
    {
        $venue = Venue::query()->findOrFail($request->attributes->get('session')['venueId']);

        return Billing::serializeVenue($venue);
    }

    public function patchVenue(Request $request)
    {
        $session = $request->attributes->get('session');
        $data = $request->only(['name', 'slug']);
        if ($data === [] || (! isset($data['name']) && ! isset($data['slug']))) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Envie name e/ou slug.');
        }
        $venue = Venue::query()->findOrFail($session['venueId']);
        $patch = [];
        if (isset($data['name'])) {
            $name = trim((string) $data['name']);
            if (strlen($name) < 2 || strlen($name) > 80) {
                throw new ApiException(400, 'VALIDATION_ERROR', 'Nome do bar: mínimo 2 caracteres.');
            }
            $patch['name'] = $name;
        }
        if (isset($data['slug'])) {
            $slug = Slug::assertValid((string) $data['slug']);
            if (Venue::query()->where('slug', $slug)->where('id', '!=', $venue->id)->exists()) {
                throw new ApiException(409, 'SLUG_TAKEN', 'Este slug já está em uso.');
            }
            $patch['slug'] = $slug;
        }
        $venue->update($patch);

        return Billing::serializeVenue($venue->fresh());
    }

    public function catalog(Request $request)
    {
        $venueId = $request->attributes->get('session')['venueId'];
        $categories = CatalogCategory::query()->where('venue_id', $venueId)->orderBy('sort_order')->orderBy('created_at')->get();
        $items = CatalogItem::query()->where('venue_id', $venueId)->orderBy('sort_order')->orderBy('created_at')->get();

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

    public function createCategory(Request $request)
    {
        $body = Http::validate($request->all(), [
            'name' => 'required|string|min:1|max:60',
            'sortOrder' => 'nullable|integer|min:0',
        ]);
        $row = CatalogCategory::query()->create([
            'venue_id' => $request->attributes->get('session')['venueId'],
            'name' => trim($body['name']),
            'sort_order' => $body['sortOrder'] ?? 0,
            'active' => true,
        ]);

        return $this->categoryPayload($row);
    }

    public function patchCategory(Request $request, string $id)
    {
        $row = CatalogCategory::query()
            ->where('id', $id)
            ->where('venue_id', $request->attributes->get('session')['venueId'])
            ->first();
        if (! $row) {
            throw new ApiException(404, 'CATEGORY_NOT_FOUND', 'Categoria não encontrada.');
        }
        $patch = [];
        if ($request->exists('name')) {
            $patch['name'] = trim((string) $request->input('name'));
        }
        if ($request->exists('sortOrder')) {
            $patch['sort_order'] = (int) $request->input('sortOrder');
        }
        if ($request->exists('active')) {
            $patch['active'] = (bool) $request->input('active');
        }
        if ($patch) {
            $row->update($patch);
        }

        return $this->categoryPayload($row->fresh());
    }

    public function deleteCategory(Request $request, string $id)
    {
        $venueId = $request->attributes->get('session')['venueId'];
        $row = CatalogCategory::query()->where('id', $id)->where('venue_id', $venueId)->first();
        if (! $row) {
            throw new ApiException(404, 'CATEGORY_NOT_FOUND', 'Categoria não encontrada.');
        }
        if (CatalogItem::query()->where('category_id', $id)->exists()) {
            throw new ApiException(409, 'CATEGORY_NOT_EMPTY', 'Remova os itens antes de apagar a categoria.');
        }
        $row->delete();

        return ['ok' => true];
    }

    public function createItem(Request $request)
    {
        $body = Http::validate($request->all(), [
            'categoryId' => 'required|uuid',
            'name' => 'required|string|min:1|max:80',
            'description' => 'nullable|string|max:500',
            'imageUrl' => 'nullable|string|max:2048',
            'priceCents' => 'required|integer|min:0',
            'sortOrder' => 'nullable|integer|min:0',
            'active' => 'nullable|boolean',
        ]);
        $venueId = $request->attributes->get('session')['venueId'];
        $cat = CatalogCategory::query()->where('id', $body['categoryId'])->where('venue_id', $venueId)->first();
        if (! $cat) {
            throw new ApiException(404, 'CATEGORY_NOT_FOUND', 'Categoria não encontrada.');
        }
        $row = CatalogItem::query()->create([
            'venue_id' => $venueId,
            'category_id' => $cat->id,
            'name' => trim($body['name']),
            'description' => $body['description'] ?? null,
            'image_url' => $body['imageUrl'] ?? null,
            'price_cents' => $body['priceCents'],
            'sort_order' => $body['sortOrder'] ?? 0,
            'active' => $body['active'] ?? true,
        ]);

        return $this->itemPayload($row);
    }

    public function patchItem(Request $request, string $id)
    {
        $row = CatalogItem::query()
            ->where('id', $id)
            ->where('venue_id', $request->attributes->get('session')['venueId'])
            ->first();
        if (! $row) {
            throw new ApiException(404, 'ITEM_NOT_FOUND', 'Item não encontrado.');
        }
        $map = [
            'name' => 'name',
            'description' => 'description',
            'imageUrl' => 'image_url',
            'priceCents' => 'price_cents',
            'sortOrder' => 'sort_order',
            'active' => 'active',
            'categoryId' => 'category_id',
        ];
        $patch = [];
        foreach ($map as $in => $col) {
            if ($request->exists($in)) {
                $patch[$col] = $request->input($in);
            }
        }
        if ($patch) {
            $row->update($patch);
        }

        return $this->itemPayload($row->fresh());
    }

    public function deleteItem(Request $request, string $id)
    {
        $row = CatalogItem::query()
            ->where('id', $id)
            ->where('venue_id', $request->attributes->get('session')['venueId'])
            ->first();
        if (! $row) {
            throw new ApiException(404, 'ITEM_NOT_FOUND', 'Item não encontrado.');
        }
        $this->removeUpload($row->image_url);
        $row->delete();

        return ['ok' => true];
    }

    public function uploadItemImage(Request $request, string $id)
    {
        $row = CatalogItem::query()
            ->where('id', $id)
            ->where('venue_id', $request->attributes->get('session')['venueId'])
            ->first();
        if (! $row) {
            throw new ApiException(404, 'ITEM_NOT_FOUND', 'Item não encontrado.');
        }
        $file = $request->file('file');
        if (! $file) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Envie JPG, PNG ou WebP.');
        }
        $ext = strtolower($file->getClientOriginalExtension());
        if (! in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Envie JPG, PNG ou WebP.');
        }
        if ($file->getSize() > 2 * 1024 * 1024) {
            throw new ApiException(400, 'VALIDATION_ERROR', 'Imagem no máximo 2 MB.');
        }
        $this->removeUpload($row->image_url);
        $stored = Str::uuid().($ext === 'jpeg' ? '.jpg' : '.'.$ext);
        $file->storeAs('uploads', $stored, 'local');
        $url = '/v1/uploads/'.$stored;
        $row->update(['image_url' => $url]);

        return $this->itemPayload($row->fresh());
    }

    private function removeUpload(?string $imageUrl): void
    {
        if (! $imageUrl || ! str_starts_with($imageUrl, '/v1/uploads/')) {
            return;
        }
        $file = substr($imageUrl, strlen('/v1/uploads/'));
        $path = storage_path('app/private/uploads/'.$file);
        if (! is_file($path)) {
            $path = storage_path('app/uploads/'.$file);
        }
        if (is_file($path)) {
            @unlink($path);
        }
    }

    private function categoryPayload(CatalogCategory $c): array
    {
        return [
            'id' => $c->id,
            'name' => $c->name,
            'sortOrder' => $c->sort_order,
            'active' => $c->active,
            'venueId' => $c->venue_id,
        ];
    }

    private function itemPayload(CatalogItem $i): array
    {
        return [
            'id' => $i->id,
            'categoryId' => $i->category_id,
            'name' => $i->name,
            'description' => $i->description,
            'imageUrl' => $i->image_url,
            'priceCents' => $i->price_cents,
            'sortOrder' => $i->sort_order,
            'active' => $i->active,
        ];
    }
}
