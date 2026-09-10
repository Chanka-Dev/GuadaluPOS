<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Almacen extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'almacenes';

    protected $fillable = [
        'nombre',
        'tipo',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function lotes(): HasMany
    {
        return $this->hasMany(Lote::class, 'almacen_id');
    }

    public function movimientosOrigen(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class, 'almacen_origen_id');
    }

    public function movimientosDestino(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class, 'almacen_destino_id');
    }

    public function turnosCaja(): HasMany
    {
        return $this->hasMany(TurnoCaja::class, 'almacen_id');
    }

    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class, 'almacen_id');
    }
}
