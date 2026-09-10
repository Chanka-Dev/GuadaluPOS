<?php

namespace App\Services;

use App\Exceptions\StockInsuficienteException;
use App\Models\Lote;
use App\Models\MovimientoInventario;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class LoteService
{
    /**
     * Registra el ingreso de un nuevo lote con su correspondiente movimiento de inventario.
     *
     * @param array{
     *     producto_id: string,
     *     proveedor_id: string,
     *     almacen_id: string,
     *     cantidad_paquetes?: int,
     *     cantidad_unidades?: int,
     *     precio_compra_unitario: float|string,
     *     fecha_vencimiento?: string|null,
     *     usuario_id?: int|null,
     *     motivo?: string|null
     * } $datos
     */
    public function ingresarLote(array $datos): Lote
    {
        return DB::transaction(function () use ($datos) {
            $producto = Producto::findOrFail($datos['producto_id']);

            $cantidadPaquetes = (int)($datos['cantidad_paquetes'] ?? 0);
            $cantidadUnidades = (int)($datos['cantidad_unidades'] ?? 0);

            $lote = Lote::create([
                'producto_id' => $datos['producto_id'],
                'proveedor_id' => $datos['proveedor_id'],
                'almacen_id' => $datos['almacen_id'],
                'cantidad_paquetes' => $cantidadPaquetes,
                'cantidad_unidades' => $cantidadUnidades,
                'precio_compra_unitario' => number_format((float)$datos['precio_compra_unitario'], 2, '.', ''),
                'fecha_ingreso' => now()->toDateString(),
                'fecha_vencimiento' => $datos['fecha_vencimiento'] ?? null,
                'fecha_salida' => null,
                'estado' => 'activo',
            ]);

            // Cantidad total en unidades sueltas equivalentes
            $totalUnidades = ($cantidadPaquetes * $producto->unidades_por_paquete) + $cantidadUnidades;

            $usuarioId = $datos['usuario_id'] ?? auth()->id() ?? User::first()?->id ?? 1;

            MovimientoInventario::create([
                'lote_id' => $lote->id,
                'usuario_id' => $usuarioId,
                'tipo' => 'ingreso',
                'cantidad' => $totalUnidades,
                'almacen_origen_id' => null,
                'almacen_destino_id' => $datos['almacen_id'],
                'motivo' => $datos['motivo'] ?? 'Ingreso de nuevo lote',
            ]);

            return $lote;
        });
    }

    /**
     * Transfiere una cantidad parcial o total de un lote a otro almacén dividiendo el lote.
     *
     * @throws StockInsuficienteException
     */
    public function transferirLote(string $loteId, string $almacenDestinoId, int $cantidadUnidadesATransferir, ?int $usuarioId = null): array
    {
        return DB::transaction(function () use ($loteId, $almacenDestinoId, $cantidadUnidadesATransferir, $usuarioId) {
            // 1. Bloquear lote origen con lockForUpdate()
            $loteOrigen = Lote::where('id', $loteId)->lockForUpdate()->firstOrFail();
            $producto = $loteOrigen->producto;

            // 2. Calcular total disponible en unidades sueltas
            $totalDisponible = ($loteOrigen->cantidad_paquetes * $producto->unidades_por_paquete) + $loteOrigen->cantidad_unidades;

            if ($cantidadUnidadesATransferir > $totalDisponible) {
                throw new StockInsuficienteException(
                    $producto->nombre,
                    $cantidadUnidadesATransferir - $totalDisponible
                );
            }

            // 3. Restar del lote origen recalculando paquetes y unidades
            $nuevoTotalOrigen = $totalDisponible - $cantidadUnidadesATransferir;
            $loteOrigen->cantidad_paquetes = intdiv($nuevoTotalOrigen, $producto->unidades_por_paquete);
            $loteOrigen->cantidad_unidades = $nuevoTotalOrigen % $producto->unidades_por_paquete;

            if ($nuevoTotalOrigen === 0) {
                $loteOrigen->estado = 'agotado';
                $loteOrigen->fecha_salida = now()->toDateString();
            }
            $loteOrigen->save();

            // 4. Crear un NUEVO registro en lotes en el almacén destino
            $nuevoLote = Lote::create([
                'producto_id' => $loteOrigen->producto_id,
                'proveedor_id' => $loteOrigen->proveedor_id,
                'almacen_id' => $almacenDestinoId,
                'cantidad_paquetes' => intdiv($cantidadUnidadesATransferir, $producto->unidades_por_paquete),
                'cantidad_unidades' => $cantidadUnidadesATransferir % $producto->unidades_por_paquete,
                'precio_compra_unitario' => $loteOrigen->precio_compra_unitario,
                'fecha_ingreso' => now()->toDateString(),
                'fecha_vencimiento' => $loteOrigen->fecha_vencimiento,
                'fecha_salida' => null,
                'estado' => 'activo',
            ]);

            $idUsuario = $usuarioId ?? auth()->id() ?? User::first()?->id ?? 1;

            // 5. Crear DOS movimientos_inventario para trazabilidad de salida y entrada
            // Movimiento 1: Salida desde almacén origen
            MovimientoInventario::create([
                'lote_id' => $loteOrigen->id,
                'usuario_id' => $idUsuario,
                'tipo' => 'transferencia',
                'cantidad' => $cantidadUnidadesATransferir,
                'almacen_origen_id' => $loteOrigen->almacen_id,
                'almacen_destino_id' => $almacenDestinoId,
                'motivo' => "Transferencia salida hacia almacén destino ({$almacenDestinoId})",
            ]);

            // Movimiento 2: Entrada hacia almacén destino
            MovimientoInventario::create([
                'lote_id' => $nuevoLote->id,
                'usuario_id' => $idUsuario,
                'tipo' => 'transferencia',
                'cantidad' => $cantidadUnidadesATransferir,
                'almacen_origen_id' => $loteOrigen->almacen_id,
                'almacen_destino_id' => $almacenDestinoId,
                'motivo' => "Transferencia entrada desde almacén origen ({$loteOrigen->almacen_id})",
            ]);

            return [
                'lote_origen' => $loteOrigen,
                'lote_destino' => $nuevoLote,
            ];
        });
    }
}
