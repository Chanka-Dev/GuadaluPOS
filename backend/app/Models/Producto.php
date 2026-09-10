<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Producto extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'productos';

    protected $fillable = [
        'nombre',
        'descripcion',
        'foto_path',
        'unidades_por_paquete',
        'permite_venta_por_paquete',
        'precio_venta',
        'precio_venta_paquete',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'unidades_por_paquete' => 'integer',
            'permite_venta_por_paquete' => 'boolean',
            'precio_venta' => 'decimal:2',
            'precio_venta_paquete' => 'decimal:2',
            'activo' => 'boolean',
        ];
    }

    public function lotes(): HasMany
    {
        return $this->hasMany(Lote::class, 'producto_id');
    }

    public function ventaDetalles(): HasMany
    {
        return $this->hasMany(VentaDetalle::class, 'producto_id');
    }
}
