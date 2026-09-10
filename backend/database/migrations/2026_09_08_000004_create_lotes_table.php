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
        Schema::create('lotes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('producto_id')->constrained('productos');
            $table->foreignUuid('proveedor_id')->constrained('proveedores');
            $table->foreignUuid('almacen_id')->constrained('almacenes');
            $table->integer('cantidad_paquetes')->default(0);
            $table->integer('cantidad_unidades')->default(0);
            $table->decimal('precio_compra_unitario', 10, 2);
            $table->date('fecha_ingreso');
            $table->date('fecha_vencimiento')->nullable();
            $table->date('fecha_salida')->nullable();
            $table->string('estado')->default('activo'); // activo, agotado, vencido, retirado
            $table->timestamps();

            // Índice compuesto para optimizar consultas FEFO (First Expired, First Out)
            $table->index(['producto_id', 'almacen_id', 'fecha_vencimiento']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lotes');
    }
};
