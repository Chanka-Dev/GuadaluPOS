<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Producto;
use App\Models\Proveedor;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CatalogoYUsuariosApiTest extends TestCase
{
    protected User $masterUser;
    protected User $adminUser;
    protected User $vendedorUser;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'master', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'administrador', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'vendedor', 'guard_name' => 'web']);

        $this->masterUser = User::where('email', 'master@guadalupos.local')->first()
            ?? User::factory()->create([
                'name' => 'Master User',
                'email' => 'master@guadalupos.local',
                'password' => Hash::make('cambiar123'),
                'activo' => true,
            ]);

        if (!$this->masterUser->hasRole('master')) {
            $this->masterUser->assignRole('master');
        }

        $this->adminUser = User::firstOrCreate(
            ['email' => 'admin.test@guadalupos.local'],
            [
                'name' => 'Admin Test',
                'password' => Hash::make('password123'),
                'activo' => true,
            ]
        );
        if (!$this->adminUser->hasRole('administrador')) {
            $this->adminUser->assignRole('administrador');
        }

        $this->vendedorUser = User::firstOrCreate(
            ['email' => 'vendedor.test@guadalupos.local'],
            [
                'name' => 'Vendedor Test',
                'password' => Hash::make('password123'),
                'activo' => true,
            ]
        );
        if (!$this->vendedorUser->hasRole('vendedor')) {
            $this->vendedorUser->assignRole('vendedor');
        }
    }

    /**
     * Prueba 1: Un usuario con rol administrador intenta crear un usuario con rol "master" -> 403.
     */
    public function test_administrador_intenta_crear_master_falla_con_403(): void
    {
        $response = $this->actingAs($this->adminUser, 'sanctum')->postJson('/api/usuarios', [
            'name' => 'Intento Master',
            'email' => 'intento.master.' . uniqid() . '@guadalupos.local',
            'password' => 'secret123',
            'rol' => 'master',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Solo un usuario con rol master puede asignar el rol master.');
    }

    /**
     * Prueba 2: Un usuario con rol master crea un usuario con rol "master" -> 201 exitoso.
     */
    public function test_master_crea_usuario_master_exitoso(): void
    {
        $email = 'nuevo.master.' . uniqid() . '@guadalupos.local';

        $response = $this->actingAs($this->masterUser, 'sanctum')->postJson('/api/usuarios', [
            'name' => 'Nuevo Master',
            'email' => $email,
            'password' => 'secret123',
            'telefono' => '77712345',
            'rol' => 'master',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('name', 'Nuevo Master')
            ->assertJsonPath('email', $email);

        $nuevoUsuario = User::where('email', $email)->first();
        $this->assertNotNull($nuevoUsuario);
        $this->assertTrue($nuevoUsuario->hasRole('master'));
    }

    /**
     * Prueba 3: Cualquier usuario intenta eliminar al usuario master original -> 403.
     */
    public function test_intento_eliminar_usuario_master_falla_con_403_y_mensaje_exacto(): void
    {
        // Intento desde un admin
        $responseAdmin = $this->actingAs($this->adminUser, 'sanctum')->deleteJson("/api/usuarios/{$this->masterUser->id}");
        $responseAdmin->assertStatus(403)
            ->assertJson([
                'message' => 'El usuario master no puede ser eliminado',
            ]);

        // Intento desde otro master
        $responseMaster = $this->actingAs($this->masterUser, 'sanctum')->deleteJson("/api/usuarios/{$this->masterUser->id}");
        $responseMaster->assertStatus(403)
            ->assertJson([
                'message' => 'El usuario master no puede ser eliminado',
            ]);

        // Verificar que el usuario sigue activo en la base de datos
        $this->masterUser->refresh();
        $this->assertTrue($this->masterUser->activo);
    }

    /**
     * Prueba 4: Crear un producto, listarlo, eliminarlo (destroy) -> activo=false en BD y no aparece en index().
     */
    public function test_producto_creacion_listado_y_desactivacion_logica(): void
    {
        // 1. Crear producto
        $nombreProducto = 'Galletas Vainilla ' . uniqid();
        $responseCreate = $this->actingAs($this->adminUser, 'sanctum')->postJson('/api/productos', [
            'nombre' => $nombreProducto,
            'descripcion' => 'Paquete de galletas dulces',
            'unidades_por_paquete' => 6,
            'permite_venta_por_paquete' => true,
            'precio_venta' => 15.50,
        ]);

        $responseCreate->assertStatus(201)
            ->assertJsonPath('nombre', $nombreProducto);

        $productoId = $responseCreate->json('id');

        // 2. Listarlo como vendedor (sin rol master ni admin) y verificar que aparece
        $responseIndex1 = $this->actingAs($this->vendedorUser, 'sanctum')->getJson('/api/productos');
        $responseIndex1->assertStatus(200);
        $idsEnIndex = collect($responseIndex1->json())->pluck('id')->all();
        $this->assertContains($productoId, $idsEnIndex);

        // 3. Eliminarlo (destroy)
        $responseDelete = $this->actingAs($this->adminUser, 'sanctum')->deleteJson("/api/productos/{$productoId}");
        $responseDelete->assertStatus(200);

        // 4. Confirmar que sigue existiendo en BD pero con activo = false
        $productoEnBD = Producto::find($productoId);
        $this->assertNotNull($productoEnBD);
        $this->assertFalse($productoEnBD->activo);

        // 5. Confirmar que YA NO aparece en el index() normal
        $responseIndex2 = $this->actingAs($this->vendedorUser, 'sanctum')->getJson('/api/productos');
        $responseIndex2->assertStatus(200);
        $idsEnIndexPostDelete = collect($responseIndex2->json())->pluck('id')->all();
        $this->assertNotContains($productoId, $idsEnIndexPostDelete);
    }

    /**
     * Prueba adicional: CRUD básico de almacenes y proveedores con desactivación lógica.
     */
    public function test_proveedores_y_almacenes_crud(): void
    {
        // Proveedor
        $respProv = $this->actingAs($this->adminUser, 'sanctum')->postJson('/api/proveedores', [
            'nombre' => 'Distribuidora Lácteos ' . uniqid(),
            'telefono' => '44455566',
        ]);
        $respProv->assertStatus(201);
        $provId = $respProv->json('id');

        $this->actingAs($this->adminUser, 'sanctum')->deleteJson("/api/proveedores/{$provId}")
            ->assertStatus(200);
        $this->assertFalse(Proveedor::find($provId)->activo);

        // Almacén
        $respAlm = $this->actingAs($this->adminUser, 'sanctum')->postJson('/api/almacenes', [
            'nombre' => 'Almacén Prueba ' . uniqid(),
            'tipo' => 'principal',
        ]);
        $respAlm->assertStatus(201);
        $almId = $respAlm->json('id');

        $this->actingAs($this->adminUser, 'sanctum')->deleteJson("/api/almacenes/{$almId}")
            ->assertStatus(200);
        $this->assertFalse(Almacen::find($almId)->activo);
    }
}
