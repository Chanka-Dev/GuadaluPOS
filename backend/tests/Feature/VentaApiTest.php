<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Lote;
use App\Models\Producto;
use App\Models\Proveedor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class VentaApiTest extends TestCase
{
    public function test_venta_exitosa_via_api(): void
    {
        $user = User::where('email', 'master@guadalupos.local')->first()
            ?? User::factory()->create(['email' => 'master@guadalupos.local']);

        $almacen = Almacen::create(['nombre' => 'Almacén API', 'tipo' => 'venta', 'activo' => true]);
        $proveedor = Proveedor::create(['nombre' => 'Proveedor API', 'activo' => true]);
        $producto = Producto::create([
            'nombre' => 'Galletas Choc',
            'unidades_por_paquete' => 6,
            'permite_venta_por_paquete' => true,
            'precio_venta' => 5.00,
            'activo' => true,
        ]);

        Lote::create([
            'producto_id' => $producto->id,
            'proveedor_id' => $proveedor->id,
            'almacen_id' => $almacen->id,
            'cantidad_paquetes' => 2,
            'cantidad_unidades' => 0,
            'precio_compra_unitario' => 3.00,
            'fecha_ingreso' => now()->toDateString(),
            'fecha_vencimiento' => now()->addDays(15)->toDateString(),
            'estado' => 'activo',
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/ventas', [
            'almacen_id' => $almacen->id,
            'metodo_pago' => 'qr',
            'client_uuid' => (string) Str::uuid(),
            'vendida_en' => now()->toDateTimeString(),
            'items' => [
                [
                    'producto_id' => $producto->id,
                    'cantidad' => 3,
                    'unidad' => 'unidad',
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'id',
                'usuario_id',
                'almacen_id',
                'total',
                'detalles',
            ]);

        $this->assertEquals(15.00, (float)$response->json('total'));
    }

    public function test_stock_insuficiente_retorna_422(): void
    {
        $user = User::where('email', 'master@guadalupos.local')->first()
            ?? User::factory()->create(['email' => 'master@guadalupos.local']);

        $almacen = Almacen::create(['nombre' => 'Almacén Sin Stock', 'tipo' => 'venta', 'activo' => true]);
        $proveedor = Proveedor::create(['nombre' => 'Proveedor Vacio', 'activo' => true]);
        $producto = Producto::create([
            'nombre' => 'Refresco 2L',
            'unidades_por_paquete' => 1,
            'permite_venta_por_paquete' => false,
            'precio_venta' => 8.00,
            'activo' => true,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/ventas', [
            'almacen_id' => $almacen->id,
            'metodo_pago' => 'efectivo',
            'client_uuid' => (string) Str::uuid(),
            'vendida_en' => now()->toDateTimeString(),
            'items' => [
                [
                    'producto_id' => $producto->id,
                    'cantidad' => 10,
                    'unidad' => 'unidad',
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonStructure(['message']);
    }
}
