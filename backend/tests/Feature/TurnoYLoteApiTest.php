<?php

namespace Tests\Feature;

use App\Models\Almacen;
use App\Models\Lote;
use App\Models\Producto;
use App\Models\Proveedor;
use App\Models\TurnoCaja;
use App\Models\User;
use Illuminate\Support\Str;
use Tests\TestCase;

class TurnoYLoteApiTest extends TestCase
{
    public function test_abrir_y_cerrar_turno_via_api(): void
    {
        $user = User::where('email', 'master@guadalupos.local')->first()
            ?? User::factory()->create(['email' => 'master@guadalupos.local']);

        $almacen = Almacen::create(['nombre' => 'Almacén Turno API', 'tipo' => 'venta', 'activo' => true]);

        // 1. Abrir turno
        $responseAbrir = $this->actingAs($user, 'sanctum')->postJson('/api/turnos/abrir', [
            'almacen_id' => $almacen->id,
            'monto_inicial' => 100.00,
        ]);

        $responseAbrir->assertStatus(201)
            ->assertJsonPath('estado', 'abierto');

        $turnoId = $responseAbrir->json('id');

        // Verificar que GET /api/turnos/activo devuelve el turno abierto
        $responseActivo = $this->actingAs($user, 'sanctum')->getJson('/api/turnos/activo');
        $responseActivo->assertStatus(200)
            ->assertJsonPath('id', $turnoId)
            ->assertJsonPath('estado', 'abierto');

        // 2. Intentar abrir segundo turno (debe fallar 422)
        $responseAbrirDuplicado = $this->actingAs($user, 'sanctum')->postJson('/api/turnos/abrir', [
            'almacen_id' => $almacen->id,
            'monto_inicial' => 50.00,
        ]);
        $responseAbrirDuplicado->assertStatus(422);

        // 3. Cerrar turno
        $responseCerrar = $this->actingAs($user, 'sanctum')->postJson("/api/turnos/{$turnoId}/cerrar", [
            'monto_final_contado' => 100.00,
        ]);

        $responseCerrar->assertStatus(200)
            ->assertJsonPath('estado', 'cerrado')
            ->assertJsonPath('diferencia', 0);

        // Verificar que GET /api/turnos/activo ahora devuelve null
        $responseInactivo = $this->actingAs($user, 'sanctum')->getJson('/api/turnos/activo');
        $responseInactivo->assertStatus(200);
        $this->assertSame('null', $responseInactivo->getContent());
    }

    public function test_ingreso_y_transferencia_lote_via_api(): void
    {
        $admin = User::where('email', 'master@guadalupos.local')->first();

        $almacen1 = Almacen::create(['nombre' => 'Almacén Origen API', 'tipo' => 'principal', 'activo' => true]);
        $almacen2 = Almacen::create(['nombre' => 'Almacén Destino API', 'tipo' => 'venta', 'activo' => true]);
        $proveedor = Proveedor::create(['nombre' => 'Proveedor API Lote', 'activo' => true]);
        $producto = Producto::create([
            'nombre' => 'Aceite 1L',
            'unidades_por_paquete' => 10,
            'permite_venta_por_paquete' => true,
            'precio_venta' => 12.00,
            'activo' => true,
        ]);

        // 1. Ingresar lote (POST /api/lotes)
        $responseIngreso = $this->actingAs($admin, 'sanctum')->postJson('/api/lotes', [
            'producto_id' => $producto->id,
            'proveedor_id' => $proveedor->id,
            'almacen_id' => $almacen1->id,
            'cantidad_paquetes' => 2,
            'cantidad_unidades' => 5,
            'precio_compra_unitario' => 8.50,
            'fecha_vencimiento' => '2027-05-01',
        ]);

        $responseIngreso->assertStatus(201);
        $loteId = $responseIngreso->json('id');

        // 2. Transferir lote (POST /api/lotes/{lote}/transferir)
        $responseTransfer = $this->actingAs($admin, 'sanctum')->postJson("/api/lotes/{$loteId}/transferir", [
            'almacen_destino_id' => $almacen2->id,
            'cantidad_unidades' => 15,
        ]);

        $responseTransfer->assertStatus(200);

        // 3. Transferir exceso (debe fallar 422)
        $responseExceso = $this->actingAs($admin, 'sanctum')->postJson("/api/lotes/{$loteId}/transferir", [
            'almacen_destino_id' => $almacen2->id,
            'cantidad_unidades' => 50,
        ]);

        $responseExceso->assertStatus(422);
    }
}
