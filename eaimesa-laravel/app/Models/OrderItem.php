<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends UuidModel
{
    public $timestamps = false;

    protected $fillable = [
        'order_id', 'venue_id', 'catalog_item_id', 'name_snapshot', 'unit_price_cents_snapshot', 'qty', 'note',
    ];

    protected function casts(): array
    {
        return ['unit_price_cents_snapshot' => 'integer', 'qty' => 'integer'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
