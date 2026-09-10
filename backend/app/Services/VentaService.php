<?php

namespace App\Services;

use App\Exceptions\StockInsuficienteException;
use App\Models\Lote;
use App\Models\MovimientoInventario;
use App\Models\Producto;
use App\Models\User;
use App\Models\Venta;
use App\Models\VentaDetalle;
use DomainException;
use InvalidArgumentException;
use Illuminate\Support\Facades\DB;

class VentaService
{
    /**
     * Registra una venta aplicando la estrategia FEFO (o lote prioritario) para la deducción de inventario.
     *
     * @param array{
     *     usuario_id: int|string,
     *     user?: User|null,
     *     almacen_id: string,
     *     turno_id?: string|null,
     *     metodo_pago?: string|null,
     *     client_uuid?: string|null,
     *     vendida_en: string,
     *     items: array<array{
     *         producto_id: string,
     *         cantidad: int,
     *         unidad: string,
     *         precio?: float|numeric|null,
     *         lote_id?: string|null
     *     }>
     * } $datos
     * @return Venta
     *
     * @throws StockInsuficienteException
     * @throws DomainException
     * @throws InvalidArgumentException
     */
    public function registrarVenta(array $datos): Venta
    {
        // 1. Envolver todo el método en una transacción de base de datos
        return DB::transaction(function () use ($datos) {
            // 2. Si client_uuid viene y ya existe una venta registrada con él, evitar duplicados
            if (!empty($datos['client_uuid'])) {
                $ventaExistente = Venta::where('client_uuid', $datos['client_uuid'])->first();
                if ($ventaExistente) {
                    return $ventaExistente->load('detalles');
                }
            }

            $usuarioId = $datos['usuario_id'] ?? $datos['user']?->id ?? auth()->id();
            $detallesParaCrear = [];
            $totalVenta = 0.00;

            // 3. Procesar cada item
            foreach ($datos['items'] as $item) {
                $producto = Producto::findOrFail($item['producto_id']);
                $unidad = strtolower(trim($item['unidad']));
                $uPorPaq = $producto->unidades_por_paquete ?: 1;

                // a. Validar unidad y calcular unidades pedidas y precios de lista
                if ($unidad === 'paquete') {
                    if (!$producto->permite_venta_por_paquete) {
                        throw new DomainException("El producto '{$producto->nombre}' no permite venta por paquete.");
                    }
                    $cantidadPedidaUnidades = (int)$item['cantidad'] * $uPorPaq;
                    $precioListaItem = $producto->precio_venta_paquete !== null
                        ? (float)$producto->precio_venta_paquete
                        : ((float)$producto->precio_venta * $uPorPaq);
                } elseif ($unidad === 'unidad') {
                    $cantidadPedidaUnidades = (int)$item['cantidad'];
                    $precioListaItem = (float)$producto->precio_venta;
                } else {
                    throw new InvalidArgumentException("Unidad '{$item['unidad']}' inválida. Debe ser 'unidad' o 'paquete'.");
                }

                // Determinar precio efectivo (por paquete o por unidad)
                $precioEfectivoPorItem = $precioListaItem;
                if (isset($item['precio']) && $item['precio'] !== null && $item['precio'] !== '') {
                    $precioEnviado = (float)$item['precio'];
                    if (abs($precioEnviado - $precioListaItem) > 0.001) {
                        // Verificar que el usuario tenga rol con privilegios para modificar precio
                        $usuario = $datos['user'] ?? (isset($datos['usuario_id']) ? User::find($datos['usuario_id']) : auth()->user());
                        if (!$usuario || !$usuario->hasAnyRole(['master', 'administrador', 'supervisor'])) {
                            throw new DomainException("No tiene permisos para modificar precios de venta.");
                        }
                        $precioEfectivoPorItem = $precioEnviado;
                    }
                }

                // Subtotal total exacto que este ítem debe generar en la venta
                $subtotalExactoItem = round((float)$item['cantidad'] * $precioEfectivoPorItem, 2);
                $precioUnitarioEquivalente = $unidad === 'paquete'
                    ? ($precioEfectivoPorItem / $uPorPaq)
                    : $precioEfectivoPorItem;

                // b. Buscar lotes: Si se especificó lote_id, tomar primero de ese lote
                if (!empty($item['lote_id'])) {
                    $loteEspecifico = Lote::where('id', $item['lote_id'])
                        ->where('producto_id', $producto->id)
                        ->where('almacen_id', $datos['almacen_id'])
                        ->where('estado', 'activo')
                        ->lockForUpdate()
                        ->first();

                    $lotes = collect();
                    if ($loteEspecifico) {
                        $lotes->push($loteEspecifico);
                    }

                    $otrosLotes = Lote::where('producto_id', $producto->id)
                        ->where('almacen_id', $datos['almacen_id'])
                        ->where('estado', 'activo')
                        ->where('id', '!=', $item['lote_id'])
                        ->whereRaw('((cantidad_paquetes * ?) + cantidad_unidades) > 0', [$uPorPaq])
                        ->orderByRaw('fecha_vencimiento ASC NULLS LAST')
                        ->lockForUpdate()
                        ->get();

                    $lotes = $lotes->concat($otrosLotes);
                } else {
                    $lotes = Lote::where('producto_id', $producto->id)
                        ->where('almacen_id', $datos['almacen_id'])
                        ->where('estado', 'activo')
                        ->whereRaw('((cantidad_paquetes * ?) + cantidad_unidades) > 0', [$uPorPaq])
                        ->orderByRaw('fecha_vencimiento ASC NULLS LAST')
                        ->lockForUpdate()
                        ->get();
                }

                $pendiente = $cantidadPedidaUnidades;
                $acumuladoItemSubtotal = 0.00;

                // c. Recorrer los lotes descontando stock
                foreach ($lotes as $lote) {
                    if ($pendiente <= 0) {
                        break;
                    }

                    $stockLote = ($lote->cantidad_paquetes * $uPorPaq) + $lote->cantidad_unidades;
                    if ($stockLote <= 0) {
                        continue;
                    }

                    $tomar = min($stockLote, $pendiente);

                    if ($tomar > 0) {
                        $nuevoStockLote = $stockLote - $tomar;

                        // Recalcular paquetes y unidades sueltas
                        $lote->cantidad_paquetes = intdiv($nuevoStockLote, $uPorPaq);
                        $lote->cantidad_unidades = $nuevoStockLote % $uPorPaq;

                        // e. Si un lote llega a 0 en total, actualizar estado a agotado y fecha_salida a hoy
                        if ($nuevoStockLote === 0) {
                            $lote->estado = 'agotado';
                            $lote->fecha_salida = now()->toDateString();
                        }

                        $lote->save();

                        // Calcular subtotal proporcional
                        if ($tomar === $pendiente && $acumuladoItemSubtotal > 0) {
                            $subtotalChunk = round($subtotalExactoItem - $acumuladoItemSubtotal, 2);
                        } else {
                            $subtotalChunk = round(($tomar / $cantidadPedidaUnidades) * $subtotalExactoItem, 2);
                        }
                        $acumuladoItemSubtotal += $subtotalChunk;

                        // d. Fila en venta_detalle y fila en movimientos_inventario
                        $detallesParaCrear[] = [
                            'producto_id' => $producto->id,
                            'lote_id' => $lote->id,
                            'cantidad' => $tomar,
                            'precio_unitario' => number_format($precioUnitarioEquivalente, 2, '.', ''),
                            'subtotal' => number_format($subtotalChunk, 2, '.', ''),
                        ];

                        MovimientoInventario::create([
                            'lote_id' => $lote->id,
                            'usuario_id' => $usuarioId,
                            'tipo' => 'venta',
                            'cantidad' => $tomar,
                            'almacen_origen_id' => $datos['almacen_id'],
                            'almacen_destino_id' => null,
                            'motivo' => 'Venta',
                        ]);

                        $pendiente -= $tomar;
                    }
                }

                // f. Si la cantidad pedida no quedó cubierta, lanzar StockInsuficienteException (hace rollback)
                if ($pendiente > 0) {
                    throw new StockInsuficienteException($producto->nombre, $pendiente);
                }

                $totalVenta = number_format((float)$totalVenta + $subtotalExactoItem, 2, '.', '');
            }

            // 4. Crear fila en ventas con total sumado y datos de sincronización
            $venta = Venta::create([
                'usuario_id' => $usuarioId,
                'almacen_id' => $datos['almacen_id'],
                'turno_id' => $datos['turno_id'] ?? null,
                'metodo_pago' => $datos['metodo_pago'] ?? null,
                'total' => $totalVenta,
                'client_uuid' => $datos['client_uuid'] ?? null,
                'sync_status' => 'sincronizado',
                'vendida_en' => $datos['vendida_en'] ?? now(),
            ]);

            foreach ($detallesParaCrear as $detalle) {
                $detalle['venta_id'] = $venta->id;
                VentaDetalle::create($detalle);
            }

            // 5. Devolver modelo Venta con sus detalles cargados
            return $venta->load('detalles');
        });
    }
}
