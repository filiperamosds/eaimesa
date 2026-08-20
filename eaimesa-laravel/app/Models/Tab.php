<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tab extends UuidModel
{
    protected $fillable = [
        'venue_id', 'table_id', 'table_session_id', 'guest_name', 'guest_phone', 'status', 'closed_at',
    ];

    protected function casts(): array
    {
        return ['closed_at' => 'datetime'];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(VenueTable::class, 'table_id');
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(TableSession::class, 'table_session_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
