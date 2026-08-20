<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TableClaim extends UuidModel
{
    public $timestamps = false;

    protected $fillable = [
        'venue_id', 'table_id', 'member_id', 'owner_account_id', 'token_hash',
        'expires_at', 'redeemed_at', 'invalidated_at', 'tab_id', 'table_session_id',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'redeemed_at' => 'datetime',
            'invalidated_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(VenueTable::class, 'table_id');
    }
}
