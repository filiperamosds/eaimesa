<?php

namespace App\Models;

class PlatformUser extends UuidModel
{
    public $timestamps = false;

    protected $fillable = ['email', 'password_hash', 'name', 'active'];

    protected function casts(): array
    {
        return ['active' => 'boolean', 'created_at' => 'datetime'];
    }
}
