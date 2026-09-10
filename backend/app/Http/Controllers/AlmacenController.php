<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlmacenController extends Controller
{
    /**
     * Lista todos los almacenes activos.
     */
    public function index(): JsonResponse
    {
        $almacenes = Almacen::where('activo', true)->get();

        return response()->json($almacenes, 200);
    }

    /**
     * Crea un nuevo almacén.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'tipo' => ['required', 'string', 'in:principal,venta'],
            'activo' => ['nullable', 'boolean'],
        ]);

        $almacen = Almacen::create($validated);

        return response()->json($almacen, 201);
    }

    /**
     * Actualiza los datos de un almacén existente.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $almacen = Almacen::findOrFail($id);

        $validated = $request->validate([
            'nombre' => ['sometimes', 'string', 'max:255'],
            'tipo' => ['sometimes', 'string', 'in:principal,venta'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        $almacen->update($validated);

        return response()->json($almacen, 200);
    }

    /**
     * Desactiva lógicamente un almacén (activo = false).
     */
    public function destroy(string $id): JsonResponse
    {
        $almacen = Almacen::findOrFail($id);

        $almacen->activo = false;
        $almacen->save();

        return response()->json([
            'message' => 'Almacén desactivado correctamente.',
            'almacen' => $almacen,
        ], 200);
    }
}
