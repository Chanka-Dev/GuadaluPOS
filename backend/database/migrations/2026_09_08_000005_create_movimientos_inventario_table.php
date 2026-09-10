<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('movimientos_inventario', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('lote_id')->constrained('lotes');
            $table->foreignId('usuario_id')->constrained('users');
            $table->string('tipo'); // ingreso, transferencia, ajuste, venta, merma
            $table->integer('cantidad');
            $table->foreignUuid('almacen_origen_id')->nullable()->constrained('almacenes');
            $table->foreignUuid('almacen_destino_id')->nullable()->constrained('almacenes');
            $table->text('motivo')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimientos_inventario');
    }
};
