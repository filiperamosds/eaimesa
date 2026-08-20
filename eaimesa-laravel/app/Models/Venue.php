<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venue extends UuidModel
{
    protected $fillable = [
        'owner_account_id', 'name', 'slug', 'public_id', 'plan',
        'subscription_status', 'accepts_orders', 'trial_ends_at', 'current_period_ends_at',
    ];

    protected function casts(): array
    {
        return [
            'accepts_orders' => 'boolean',
            'trial_ends_at' => 'datetime',
            'current_period_ends_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'owner_account_id');
    }

    public function categories(): HasMany
    {
        return $this->hasMany(CatalogCategory::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(CatalogItem::class);
    }

    public function tables(): HasMany
    {
        return $this->hasMany(VenueTable::class);
    }
}
