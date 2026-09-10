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
        Schema::create('ventas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('usuario_id')->constrained('users');
            $table->foreignUuid('almacen_id')->constrained('almacenes');
            $table->foreignUuid('turno_id')->nullable()->constrained('turnos_caja');
            $table->string('metodo_pago')->nullable();
            $table->decimal('total', 10, 2);

            // Campos de sincronización offline
            $table->uuid('client_uuid')->nullable()->unique();
            $table->string('sync_status')->default('sincronizado'); // sincronizado, pendiente, conflicto
            $table->timestamp('vendida_en');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ventas');
    }
};
