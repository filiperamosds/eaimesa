<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CatalogCategory extends UuidModel
{
    protected $fillable = ['venue_id', 'name', 'sort_order', 'active'];

    protected function casts(): array
    {
        return ['active' => 'boolean', 'sort_order' => 'integer'];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(CatalogItem::class, 'category_id');
    }
}
