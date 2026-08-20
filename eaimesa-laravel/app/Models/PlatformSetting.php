<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = ['id', 'trial_days', 'paid_period_days', 'updated_at'];

    protected function casts(): array
    {
        return ['trial_days' => 'integer', 'paid_period_days' => 'integer', 'updated_at' => 'datetime'];
    }

    public static function current(): self
    {
        return static::query()->findOrFail('default');
    }
}
