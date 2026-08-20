<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillingEvent extends UuidModel
{
    public $timestamps = false;

    protected $fillable = [
        'venue_id', 'plan', 'plan_name', 'method', 'amount_cents', 'provider', 'status',
    ];

    protected function casts(): array
    {
        return ['amount_cents' => 'integer', 'created_at' => 'datetime'];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }
}
