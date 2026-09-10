<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductoController extends Controller
{
    /**
     * Lista todos los productos activos.
     */
    public function index(): JsonResponse
    {
        $productos = Producto::where('activo', true)->get();

        return response()->json($productos, 200);
    }

    /**
     * Crea un nuevo producto.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string'],
            'foto_path' => ['nullable', 'string', 'max:255'],
            'unidades_por_paquete' => ['nullable', 'integer', 'min:1'],
            'permite_venta_por_paquete' => ['nullable', 'boolean'],
            'precio_venta' => ['required', 'numeric', 'min:0'],
            'precio_venta_paquete' => ['nullable', 'numeric', 'min:0'],
            'activo' => ['nullable', 'boolean'],
        ]);

        $producto = Producto::create($validated);

        return response()->json($producto, 201);
    }

    /**
     * Actualiza los datos de un producto existente.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $producto = Producto::findOrFail($id);

        $validated = $request->validate([
            'nombre' => ['sometimes', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string'],
            'foto_path' => ['nullable', 'string', 'max:255'],
            'unidades_por_paquete' => ['sometimes', 'integer', 'min:1'],
            'permite_venta_por_paquete' => ['sometimes', 'boolean'],
            'precio_venta' => ['sometimes', 'numeric', 'min:0'],
            'precio_venta_paquete' => ['nullable', 'numeric', 'min:0'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        $producto->update($validated);

        return response()->json($producto, 200);
    }

    /**
     * Desactiva lógicamente un producto (activo = false).
     */
    public function destroy(string $id): JsonResponse
    {
        $producto = Producto::findOrFail($id);

        $producto->activo = false;
        $producto->save();

        return response()->json([
            'message' => 'Producto desactivado correctamente.',
            'producto' => $producto,
        ], 200);
    }
}
