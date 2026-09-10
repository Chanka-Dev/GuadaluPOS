<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesYUsuarioMasterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Resetear la caché de roles y permisos de Spatie
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Crear los 4 roles requeridos
        $roles = [
            'master',
            'administrador',
            'supervisor',
            'vendedor',
        ];

        foreach ($roles as $nombreRol) {
            Role::firstOrCreate([
                'name' => $nombreRol,
                'guard_name' => 'web',
            ]);
        }

        /**
         * NOTA DE SEGURIDAD / REGLA DE NEGOCIO:
         * Este usuario master NO debe poder eliminarse desde la aplicación.
         * Esta restricción se validará en el controlador de usuarios en una sesión futura.
         */
        $usuarioMaster = User::firstOrCreate(
            ['email' => 'master@guadalupos.local'],
            [
                'name' => 'Usuario Master',
                'password' => Hash::make('cambiar123'),
                'activo' => true,
            ]
        );

        // Asignar el rol master al usuario
        $usuarioMaster->assignRole('master');
    }
}
