<?php

namespace App\Services;

use App\Exceptions\TurnoYaAbiertoException;
use App\Models\TurnoCaja;
use App\Models\Venta;
use DomainException;
use Illuminate\Support\Facades\DB;

class TurnoCajaService
{
    /**
     * Abre un nuevo turno de caja para un usuario en un almacén.
     *
     * @throws TurnoYaAbiertoException
     */
    public function abrirTurno(int $usuarioId, string $almacenId, float $montoInicial): TurnoCaja
    {
        return DB::transaction(function () use ($usuarioId, $almacenId, $montoInicial) {
            // Verificar si el usuario ya tiene un turno abierto
            $turnoAbiertoExistente = $this->obtenerTurnoActivoUsuario($usuarioId);

            if ($turnoAbiertoExistente) {
                throw new TurnoYaAbiertoException("El usuario ya cuenta con un turno de caja abierto (ID: {$turnoAbiertoExistente->id}).");
            }

            $turno = TurnoCaja::create([
                'usuario_id' => $usuarioId,
                'almacen_id' => $almacenId,
                'monto_inicial' => number_format($montoInicial, 2, '.', ''),
                'monto_final_esperado' => null,
                'monto_final_contado' => null,
                'fecha_apertura' => now(),
                'fecha_cierre' => null,
                'estado' => 'abierto',
            ]);

            // Vincular al usuario creador a la tabla de usuarios compartidos del turno
            $turno->usuariosCompartidos()->syncWithoutDetaching([$usuarioId]);

            return $turno->load(['almacen', 'usuario', 'usuariosCompartidos']);
        });
    }

    /**
     * Permite a un usuario unirse a un turno abierto de un almacén.
     */
    public function unirseATurno(int $usuarioId, string $turnoId): TurnoCaja
    {
        return DB::transaction(function () use ($usuarioId, $turnoId) {
            $turno = TurnoCaja::where('id', $turnoId)->lockForUpdate()->firstOrFail();

            if ($turno->estado !== 'abierto') {
                throw new DomainException("El turno de caja no se encuentra abierto (estado actual: {$turno->estado}).");
            }

            $turnoActivo = $this->obtenerTurnoActivoUsuario($usuarioId);
            if ($turnoActivo && $turnoActivo->id !== $turno->id) {
                throw new DomainException("El usuario ya tiene otro turno de caja abierto (ID: {$turnoActivo->id}).");
            }

            $turno->usuariosCompartidos()->syncWithoutDetaching([$usuarioId]);

            return $turno->load(['almacen', 'usuario', 'usuariosCompartidos']);
        });
    }

    /**
     * Obtiene el turno activo del usuario (propio o compartido).
     */
    public function obtenerTurnoActivoUsuario(int $usuarioId): ?TurnoCaja
    {
        return TurnoCaja::with(['almacen', 'usuario', 'usuariosCompartidos'])
            ->where('estado', 'abierto')
            ->where(function ($query) use ($usuarioId) {
                $query->where('usuario_id', $usuarioId)
                    ->orWhereHas('usuariosCompartidos', function ($q) use ($usuarioId) {
                        $q->where('users.id', $usuarioId);
                    });
            })
            ->first();
    }

    /**
     * Obtiene el turno activo para un almacén específico.
     */
    public function obtenerTurnoActivoAlmacen(string $almacenId): ?TurnoCaja
    {
        return TurnoCaja::with(['almacen', 'usuario', 'usuariosCompartidos'])
            ->where('almacen_id', $almacenId)
            ->where('estado', 'abierto')
            ->first();
    }

    /**
     * Cierra un turno de caja calculando el monto esperado en efectivo y la diferencia.
     *
     * @throws DomainException
     */
    public function cerrarTurno(string $turnoId, float $montoFinalContado): TurnoCaja
    {
        return DB::transaction(function () use ($turnoId, $montoFinalContado) {
            $turno = TurnoCaja::where('id', $turnoId)->lockForUpdate()->firstOrFail();

            if ($turno->estado !== 'abierto') {
                throw new DomainException("El turno de caja no se encuentra abierto (estado actual: {$turno->estado}).");
            }

            // Calcular monto final esperado sumando sólo las ventas en efectivo
            $ventasEfectivoTotal = Venta::where('turno_id', $turno->id)
                ->where('metodo_pago', 'efectivo')
                ->sum('total');

            $montoFinalEsperado = round((float)$turno->monto_inicial + (float)$ventasEfectivoTotal, 2);
            $diferencia = round($montoFinalContado - $montoFinalEsperado, 2);

            $turno->monto_final_contado = number_format($montoFinalContado, 2, '.', '');
            $turno->monto_final_esperado = number_format($montoFinalEsperado, 2, '.', '');
            $turno->fecha_cierre = now();
            $turno->estado = 'cerrado';
            $turno->save();

            // Atributo dinámico no persistido
            $turno->diferencia = $diferencia;

            return $turno->load(['almacen', 'usuario', 'usuariosCompartidos']);
        });
    }
}
