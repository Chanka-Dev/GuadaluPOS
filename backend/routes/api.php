<?php

use App\Http\Controllers\AlmacenController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\LoteController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ProveedorController;
use App\Http\Controllers\TurnoCajaController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VentaController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Autenticación pública
Route::post('/login', [AuthController::class, 'login'])->name('login');

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    // Autenticación protegida
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    // Ventas
    Route::get('/ventas', [VentaController::class, 'index']);
    Route::post('/ventas', [VentaController::class, 'store']);
    Route::patch('/ventas/{id}/metodo-pago', [VentaController::class, 'actualizarMetodoPago']);

    // Turnos de caja
    Route::get('/turnos', [TurnoCajaController::class, 'index'])
        ->middleware('role:master,administrador');
    Route::get('/turnos/activo', [TurnoCajaController::class, 'activo']);
    Route::get('/turnos/almacen/{almacenId}/activo', [TurnoCajaController::class, 'activoPorAlmacen']);
    Route::post('/turnos/abrir', [TurnoCajaController::class, 'abrir']);
    Route::post('/turnos/{turno}/unirse', [TurnoCajaController::class, 'unirse']);
    Route::post('/turnos/{turno}/cerrar', [TurnoCajaController::class, 'cerrar']);

    // Gestión de lotes con autorización por roles
    Route::get('/lotes', [LoteController::class, 'index']);
    Route::post('/lotes', [LoteController::class, 'store'])
        ->middleware('role:master,administrador');
    Route::put('/lotes/{lote}', [LoteController::class, 'update'])
        ->middleware('role:master,administrador');

    Route::post('/lotes/{lote}/transferir', [LoteController::class, 'transferir'])
        ->middleware('role:master,administrador,supervisor');

    // Catálogo - Productos
    Route::get('/productos', [ProductoController::class, 'index']);
    Route::post('/productos', [ProductoController::class, 'store'])
        ->middleware('role:master,administrador');
    Route::put('/productos/{id}', [ProductoController::class, 'update'])
        ->middleware('role:master,administrador');
    Route::delete('/productos/{id}', [ProductoController::class, 'destroy'])
        ->middleware('role:master,administrador');

    // Catálogo - Proveedores
    Route::get('/proveedores', [ProveedorController::class, 'index']);
    Route::post('/proveedores', [ProveedorController::class, 'store'])
        ->middleware('role:master,administrador');
    Route::put('/proveedores/{id}', [ProveedorController::class, 'update'])
        ->middleware('role:master,administrador');
    Route::delete('/proveedores/{id}', [ProveedorController::class, 'destroy'])
        ->middleware('role:master,administrador');

    // Catálogo - Almacenes
    Route::get('/almacenes', [AlmacenController::class, 'index']);
    Route::post('/almacenes', [AlmacenController::class, 'store'])
        ->middleware('role:master,administrador');
    Route::put('/almacenes/{id}', [AlmacenController::class, 'update'])
        ->middleware('role:master,administrador');
    Route::delete('/almacenes/{id}', [AlmacenController::class, 'destroy'])
        ->middleware('role:master,administrador');

    // Gestión de Usuarios
    Route::get('/usuarios', [UserController::class, 'index'])
        ->middleware('role:master,administrador');
    Route::post('/usuarios', [UserController::class, 'store'])
        ->middleware('role:master,administrador');
    Route::put('/usuarios/{id}', [UserController::class, 'update'])
        ->middleware('role:master,administrador');
    Route::delete('/usuarios/{id}', [UserController::class, 'destroy'])
        ->middleware('role:master,administrador');
});

