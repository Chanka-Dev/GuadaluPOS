<?php

namespace App\Http\Controllers;

use App\Exceptions\StockInsuficienteException;
use App\Models\Venta;
use App\Services\VentaService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class VentaController extends Controller
{
    public function __construct(
        protected VentaService $ventaService
    ) {}

    /**
     * Lista las ventas con filtros opcionales (turno, almacén, método de pago, fecha, usuario).
     */
    public function index(Request $request): JsonResponse
    {
        $usuario = $request->user();
        $puedeVerCostos = $usuario && $usuario->hasAnyRole(['master', 'administrador', 'supervisor']);
        $camposLote = $puedeVerCostos
            ? 'id,fecha_vencimiento,precio_compra_unitario'
            : 'id,fecha_vencimiento';

        $query = Venta::with([
            'usuario:id,name,email',
            'almacen:id,nombre,tipo',
            'turno:id,monto_inicial,estado,fecha_apertura',
            'detalles.producto:id,nombre,precio_venta,unidades_por_paquete',
            'detalles.lote:' . $camposLote,
        ]);

        if ($request->filled('turno_id')) {
            $query->where('turno_id', $request->query('turno_id'));
        }

        if ($request->filled('almacen_id')) {
            $query->where('almacen_id', $request->query('almacen_id'));
        }

        if ($request->filled('metodo_pago')) {
            $query->where('metodo_pago', $request->query('metodo_pago'));
        }

        if ($request->filled('usuario_id')) {
            $query->where('usuario_id', $request->query('usuario_id'));
        }

        if ($request->filled('fecha')) {
            $query->whereDate('vendida_en', $request->query('fecha'));
        }

        $limit = min((int)$request->query('limit', 100), 200);
        $ventas = $query->orderBy('vendida_en', 'desc')->limit($limit)->get();

        return response()->json($ventas, 200);
    }

    /**
     * Actualiza el método de pago de una venta para corregir errores de caja.
     */
    public function actualizarMetodoPago(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'metodo_pago' => ['required', 'string', 'in:efectivo,transferencia,tarjeta'],
        ]);

        $venta = Venta::with([
            'usuario:id,name,email',
            'almacen:id,nombre,tipo',
            'turno:id,monto_inicial,estado',
            'detalles.producto:id,nombre,precio_venta,unidades_por_paquete',
            'detalles.lote:id,fecha_vencimiento',
        ])->findOrFail($id);

        $venta->metodo_pago = $validated['metodo_pago'];
        $venta->save();

        return response()->json([
            'message' => 'Método de pago actualizado con éxito.',
            'venta' => $venta,
        ], 200);
    }

    /**
     * Registra una venta en el sistema aplicando FEFO.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'almacen_id' => ['required', 'uuid', 'exists:almacenes,id'],
            'turno_id' => ['nullable', 'uuid', 'exists:turnos_caja,id'],
            'metodo_pago' => ['nullable', 'string', 'max:50'],
            'client_uuid' => ['nullable', 'uuid'],
            'vendida_en' => ['required', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.producto_id' => ['required', 'uuid', 'exists:productos,id'],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'items.*.unidad' => ['required', 'string', 'in:unidad,paquete'],
            'items.*.precio' => ['nullable', 'numeric', 'min:0'],
            'items.*.lote_id' => ['nullable', 'uuid', 'exists:lotes,id'],
        ]);

        $usuario = $request->user();
        $validated['usuario_id'] = $usuario?->id ?? auth()->id();
        $validated['user'] = $usuario;

        try {
            $venta = $this->ventaService->registrarVenta($validated);

            return response()->json($venta, 201);
        } catch (StockInsuficienteException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        } catch (DomainException | InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
