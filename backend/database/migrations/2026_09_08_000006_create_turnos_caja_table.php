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
        Schema::create('turnos_caja', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('usuario_id')->constrained('users');
            $table->foreignUuid('almacen_id')->constrained('almacenes');
            $table->decimal('monto_inicial', 10, 2);
            $table->decimal('monto_final_esperado', 10, 2)->nullable();
            $table->decimal('monto_final_contado', 10, 2)->nullable();
            $table->timestamp('fecha_apertura');
            $table->timestamp('fecha_cierre')->nullable();
            $table->string('estado')->default('abierto'); // abierto, cerrado
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('turnos_caja');
    }
};
