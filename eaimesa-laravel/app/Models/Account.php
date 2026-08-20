<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasOne;

class Account extends UuidModel
{
    public $timestamps = false;

    protected $fillable = ['email', 'password_hash'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function venue(): HasOne
    {
        return $this->hasOne(Venue::class, 'owner_account_id');
    }
}
