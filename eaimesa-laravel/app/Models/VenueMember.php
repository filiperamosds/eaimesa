<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueMember extends UuidModel
{
    protected $fillable = ['venue_id', 'account_id', 'role', 'name', 'active'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
