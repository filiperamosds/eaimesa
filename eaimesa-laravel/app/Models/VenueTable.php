<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VenueTable extends UuidModel
{
    protected $fillable = ['venue_id', 'label', 'sort_order', 'active'];

    protected function casts(): array
    {
        return ['active' => 'boolean', 'sort_order' => 'integer'];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(TableSession::class, 'table_id');
    }
}
