<?php

namespace App\Http\Controllers;

use App\Models\Proveedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProveedorController extends Controller
{
    /**
     * Lista todos los proveedores activos.
     */
    public function index(): JsonResponse
    {
        $proveedores = Proveedor::where('activo', true)->get();

        return response()->json($proveedores, 200);
    }

    /**
     * Crea un nuevo proveedor.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'telefono' => ['nullable', 'string', 'max:50'],
            'notas' => ['nullable', 'string'],
            'activo' => ['nullable', 'boolean'],
        ]);

        $proveedor = Proveedor::create($validated);

        return response()->json($proveedor, 201);
    }

    /**
     * Actualiza los datos de un proveedor existente.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $proveedor = Proveedor::findOrFail($id);

        $validated = $request->validate([
            'nombre' => ['sometimes', 'string', 'max:255'],
            'telefono' => ['nullable', 'string', 'max:50'],
            'notas' => ['nullable', 'string'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        $proveedor->update($validated);

        return response()->json($proveedor, 200);
    }

    /**
     * Desactiva lógicamente un proveedor (activo = false).
     */
    public function destroy(string $id): JsonResponse
    {
        $proveedor = Proveedor::findOrFail($id);

        $proveedor->activo = false;
        $proveedor->save();

        return response()->json([
            'message' => 'Proveedor desactivado correctamente.',
            'proveedor' => $proveedor,
        ], 200);
    }
}
