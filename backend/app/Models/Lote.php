<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lote extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'lotes';

    protected $fillable = [
        'producto_id',
        'proveedor_id',
        'almacen_id',
        'cantidad_paquetes',
        'cantidad_unidades',
        'precio_compra_unitario',
        'fecha_ingreso',
        'fecha_vencimiento',
        'fecha_salida',
        'estado',
    ];

    protected $appends = [
        'total_unidades',
    ];

    public function getTotalUnidadesAttribute(): int
    {
        $unidadesPorPaquete = $this->producto?->unidades_por_paquete ?? 1;
        return ((int)$this->cantidad_paquetes * (int)$unidadesPorPaquete) + (int)$this->cantidad_unidades;
    }

    protected function casts(): array
    {
        return [
            'cantidad_paquetes' => 'integer',
            'cantidad_unidades' => 'integer',
            'precio_compra_unitario' => 'decimal:2',
            'fecha_ingreso' => 'date',
            'fecha_vencimiento' => 'date',
            'fecha_salida' => 'date',
        ];
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class, 'lote_id');
    }

    public function ventaDetalles(): HasMany
    {
        return $this->hasMany(VentaDetalle::class, 'lote_id');
    }
}
