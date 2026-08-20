<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuestSession extends UuidModel
{
    public $timestamps = false;

    protected $fillable = ['tab_id', 'table_session_id', 'venue_id', 'expires_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'created_at' => 'datetime'];
    }

    public function tab(): BelongsTo
    {
        return $this->belongsTo(Tab::class);
    }

    public function tableSession(): BelongsTo
    {
        return $this->belongsTo(TableSession::class, 'table_session_id');
    }
}
