<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Lista todos los usuarios con sus roles asignados.
     */
    public function index(): JsonResponse
    {
        $usuarios = User::with('roles')->get();

        return response()->json($usuarios, 200);
    }

    /**
     * Crea un nuevo usuario y le asigna un rol con validación de jerarquía.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'telefono' => ['nullable', 'string', 'max:50'],
            'rol' => ['required', 'string', 'exists:roles,name'],
        ]);

        // Regla: si el rol a asignar es "master", solo un usuario que YA tiene rol master puede hacerlo
        if ($validated['rol'] === 'master' && !$request->user()->hasRole('master')) {
            return response()->json([
                'message' => 'Solo un usuario con rol master puede asignar el rol master.',
            ], 403);
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'telefono' => $validated['telefono'] ?? null,
            'activo' => true,
        ]);

        $user->assignRole($validated['rol']);
        $user->load('roles');

        return response()->json($user, 201);
    }

    /**
     * Actualiza datos de un usuario y opcionalmente su rol con validación de jerarquía.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'telefono' => ['nullable', 'string', 'max:50'],
            'activo' => ['sometimes', 'boolean'],
            'rol' => ['nullable', 'string', 'exists:roles,name'],
        ]);

        // Regla: Solo un master puede modificar a un usuario con rol master
        if ($user->hasRole('master') && !$request->user()->hasRole('master')) {
            return response()->json([
                'message' => 'Solo un usuario con rol master puede modificar a un usuario master.',
            ], 403);
        }

        // Regla: si el rol a asignar es "master", solo un usuario con rol master puede asignarlo
        if (isset($validated['rol']) && $validated['rol'] === 'master' && !$request->user()->hasRole('master')) {
            return response()->json([
                'message' => 'Solo un usuario con rol master puede asignar el rol master.',
            ], 403);
        }

        if (!empty($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (!empty($validated['email'])) {
            $user->email = $validated['email'];
        }
        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }
        if (array_key_exists('telefono', $validated)) {
            $user->telefono = $validated['telefono'];
        }
        if (array_key_exists('activo', $validated)) {
            $user->activo = $validated['activo'];
        }
        $user->save();

        if (!empty($validated['rol'])) {
            $user->syncRoles([$validated['rol']]);
        }

        $user->load('roles');

        return response()->json($user, 200);
    }

    /**
     * Desactiva lógicamente un usuario a menos que tenga rol master.
     */
    public function destroy(string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Regla: El usuario master no puede ser eliminado bajo ninguna circunstancia
        if ($user->hasRole('master')) {
            return response()->json([
                'message' => 'El usuario master no puede ser eliminado',
            ], 403);
        }

        $user->activo = false;
        $user->save();

        return response()->json([
            'message' => 'Usuario desactivado correctamente.',
            'user' => $user,
        ], 200);
    }
}
