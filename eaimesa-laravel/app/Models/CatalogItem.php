<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CatalogItem extends UuidModel
{
    protected $fillable = [
        'venue_id', 'category_id', 'name', 'description', 'image_url',
        'price_cents', 'sort_order', 'active', 'max_note_length',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'price_cents' => 'integer',
            'sort_order' => 'integer',
            'max_note_length' => 'integer',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(CatalogCategory::class, 'category_id');
    }
}
