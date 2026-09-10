<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'master', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'vendedor', 'guard_name' => 'web']);
    }

    public function test_login_exitoso_con_usuario_master(): void
    {
        $user = User::where('email', 'master@guadalupos.local')->first()
            ?? User::factory()->create([
                'email' => 'master@guadalupos.local',
                'password' => Hash::make('cambiar123'),
                'activo' => true,
            ]);

        if (!$user->hasRole('master')) {
            $user->assignRole('master');
        }

        $response = $this->postJson('/api/login', [
            'email' => 'master@guadalupos.local',
            'password' => 'cambiar123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'roles',
                ],
            ]);

        $this->assertNotEmpty($response->json('token'));
        $this->assertContains('master', $response->json('user.roles'));
    }

    public function test_login_falla_con_credenciales_incorrectas(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'master@guadalupos.local',
            'password' => 'password_incorrecta',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('message', 'Credenciales incorrectas.');
    }

    public function test_logout_revoca_token(): void
    {
        $user = User::where('email', 'master@guadalupos.local')->first();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout');

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Sesión cerrada correctamente.');
    }
}
