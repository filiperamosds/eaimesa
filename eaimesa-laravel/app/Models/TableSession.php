<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TableSession extends UuidModel
{
    protected $fillable = ['venue_id', 'table_id', 'pin_hash', 'status', 'closed_at'];

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

    public function tabs(): HasMany
    {
        return $this->hasMany(Tab::class);
    }
}
