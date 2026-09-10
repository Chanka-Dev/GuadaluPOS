<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TurnoCaja extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'turnos_caja';

    protected $fillable = [
        'usuario_id',
        'almacen_id',
        'monto_inicial',
        'monto_final_esperado',
        'monto_final_contado',
        'fecha_apertura',
        'fecha_cierre',
        'estado',
    ];

    protected $appends = [
        'diferencia',
        'resumen_contable',
    ];

    public function getDiferenciaAttribute(): ?float
    {
        if ($this->monto_final_contado !== null && $this->monto_final_esperado !== null) {
            return round((float)$this->monto_final_contado - (float)$this->monto_final_esperado, 2);
        }

        return null;
    }

    public function getResumenContableAttribute(): array
    {
        return $this->obtenerResumenContable();
    }

    public function obtenerResumenContable(): array
    {
        $ventas = Venta::where('turno_id', $this->id)->get();

        $ventasEfectivo = $ventas->where('metodo_pago', 'efectivo');
        $ventasQr = $ventas->where('metodo_pago', 'transferencia');
        $ventasTarjeta = $ventas->where('metodo_pago', 'tarjeta');

        $totalEfectivo = (float) $ventasEfectivo->sum('total');
        $totalQr = (float) $ventasQr->sum('total');
        $totalTarjeta = (float) $ventasTarjeta->sum('total');
        $totalGeneral = round($totalEfectivo + $totalQr + $totalTarjeta, 2);

        $montoInicial = (float) $this->monto_inicial;
        $montoEsperadoEfectivo = round($montoInicial + $totalEfectivo, 2);

        // Desglose por vendedor para cajas compartidas
        $desgloseVendedores = $ventas->groupBy('usuario_id')->map(function ($grupo, $userId) {
            $user = User::find($userId);
            return [
                'usuario_id' => $userId,
                'nombre' => $user?->name ?? 'Usuario #' . $userId,
                'total' => round((float) $grupo->sum('total'), 2),
                'conteo' => $grupo->count(),
                'efectivo' => round((float) $grupo->where('metodo_pago', 'efectivo')->sum('total'), 2),
                'transferencia' => round((float) $grupo->where('metodo_pago', 'transferencia')->sum('total'), 2),
                'tarjeta' => round((float) $grupo->where('metodo_pago', 'tarjeta')->sum('total'), 2),
            ];
        })->values()->all();

        return [
            'monto_inicial' => $montoInicial,
            'ventas_efectivo' => $totalEfectivo,
            'conteo_efectivo' => $ventasEfectivo->count(),
            'ventas_transferencia' => $totalQr,
            'conteo_transferencia' => $ventasQr->count(),
            'ventas_tarjeta' => $totalTarjeta,
            'conteo_tarjeta' => $ventasTarjeta->count(),
            'monto_esperado_efectivo' => $montoEsperadoEfectivo,
            'total_recaudado' => $totalGeneral,
            'total_transacciones' => $ventas->count(),
            'desglose_vendedores' => $desgloseVendedores,
        ];
    }

    protected function casts(): array
    {
        return [
            'monto_inicial' => 'decimal:2',
            'monto_final_esperado' => 'decimal:2',
            'monto_final_contado' => 'decimal:2',
            'fecha_apertura' => 'datetime',
            'fecha_cierre' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class, 'turno_id');
    }

    public function usuariosCompartidos(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'turno_caja_usuario', 'turno_id', 'usuario_id')->withTimestamps();
    }
}
