<?php

namespace App\Http\Controllers;

use App\Exceptions\StockInsuficienteException;
use App\Models\Lote;
use App\Services\LoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoteController extends Controller
{
    public function __construct(
        protected LoteService $loteService
    ) {}

    /**
     * Lista todos los lotes con relaciones y filtros opcionales.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Lote::with(['producto', 'proveedor', 'almacen'])
            ->orderByRaw('fecha_vencimiento IS NULL, fecha_vencimiento ASC')
            ->orderBy('created_at', 'desc');

        if ($request->filled('producto_id')) {
            $query->where('producto_id', $request->query('producto_id'));
        }

        if ($request->filled('almacen_id')) {
            $query->where('almacen_id', $request->query('almacen_id'));
        }

        return response()->json($query->get(), 200);
    }

    /**
     * Ingreso de nuevo lote al inventario.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'producto_id' => ['required', 'uuid', 'exists:productos,id'],
            'proveedor_id' => ['required', 'uuid', 'exists:proveedores,id'],
            'almacen_id' => ['required', 'uuid', 'exists:almacenes,id'],
            'cantidad_paquetes' => ['nullable', 'integer', 'min:0'],
            'cantidad_unidades' => ['nullable', 'integer', 'min:0'],
            'precio_compra_unitario' => ['required', 'numeric', 'min:0'],
            'fecha_vencimiento' => ['nullable', 'date'],
            'motivo' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['usuario_id'] = (int)$request->user()->id;

        $lote = $this->loteService->ingresarLote($validated);

        return response()->json($lote, 201);
    }

    /**
     * Transferencia de cantidad parcial o total de un lote a otro almacén.
     */
    public function transferir(Request $request, string $lote): JsonResponse
    {
        $validated = $request->validate([
            'almacen_destino_id' => ['required', 'uuid', 'exists:almacenes,id'],
            'cantidad_unidades' => ['nullable', 'integer', 'min:0'],
            'cantidad_paquetes' => ['nullable', 'integer', 'min:0'],
        ]);

        $loteModel = Lote::with('producto')->findOrFail($lote);
        $uPorPaq = $loteModel->producto?->unidades_por_paquete ?? 1;

        $paquetes = (int)($request->input('cantidad_paquetes') ?? 0);
        $unidades = (int)($request->input('cantidad_unidades') ?? 0);

        if ($request->has('cantidad_paquetes')) {
            $totalUnidadesATransferir = ($paquetes * $uPorPaq) + $unidades;
        } else {
            $totalUnidadesATransferir = $unidades;
        }

        if ($totalUnidadesATransferir < 1) {
            return response()->json([
                'message' => 'Debe transferir al menos 1 unidad o paquete.',
            ], 422);
        }

        $usuarioId = (int)$request->user()->id;

        try {
            $this->loteService->transferirLote(
                $lote,
                $validated['almacen_destino_id'],
                $totalUnidadesATransferir,
                $usuarioId
            );

            return response()->json([
                'message' => 'Lote transferido con éxito.',
            ], 200);
        } catch (StockInsuficienteException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Actualiza los datos de un lote existente (corrección de compra / ingreso).
     */
    public function update(Request $request, string $lote): JsonResponse
    {
        $loteModel = Lote::findOrFail($lote);

        $validated = $request->validate([
            'producto_id' => ['sometimes', 'uuid', 'exists:productos,id'],
            'proveedor_id' => ['sometimes', 'uuid', 'exists:proveedores,id'],
            'almacen_id' => ['sometimes', 'uuid', 'exists:almacenes,id'],
            'cantidad_paquetes' => ['sometimes', 'integer', 'min:0'],
            'cantidad_unidades' => ['sometimes', 'integer', 'min:0'],
            'precio_compra_unitario' => ['sometimes', 'numeric', 'min:0'],
            'fecha_ingreso' => ['sometimes', 'date'],
            'fecha_vencimiento' => ['nullable', 'date'],
            'estado' => ['nullable', 'string', 'in:activo,disponible,agotado,vencido'],
        ]);

        if (isset($validated['precio_compra_unitario'])) {
            $validated['precio_compra_unitario'] = number_format((float)$validated['precio_compra_unitario'], 2, '.', '');
        }

        $loteModel->update($validated);
        $loteModel->load(['producto', 'proveedor', 'almacen']);

        return response()->json($loteModel, 200);
    }
}
