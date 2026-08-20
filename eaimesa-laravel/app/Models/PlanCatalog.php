<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlanCatalog extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'plan_catalog';

    public $timestamps = false;

    protected $fillable = [
        'id', 'name', 'kind', 'price_cents', 'promo_price_cents', 'blurb', 'features', 'listed', 'sort_order', 'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'price_cents' => 'integer',
            'promo_price_cents' => 'integer',
            'features' => 'array',
            'listed' => 'boolean',
            'sort_order' => 'integer',
            'updated_at' => 'datetime',
        ];
    }
}
