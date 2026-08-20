<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends UuidModel
{
    protected $fillable = [
        'venue_id', 'status', 'source', 'table_id', 'table_label', 'tab_id', 'idempotency_key', 'note',
    ];

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(VenueTable::class, 'table_id');
    }

    public function tab(): BelongsTo
    {
        return $this->belongsTo(Tab::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
