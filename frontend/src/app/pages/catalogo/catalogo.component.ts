import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductoService } from '../../core/services/producto.service';
import { ProveedorService } from '../../core/services/proveedor.service';
import { AlmacenService } from '../../core/services/almacen.service';
import { LoteService } from '../../core/services/lote.service';
import { Producto, Proveedor, Almacen, Lote } from '../../core/models/pos.models';

export type TabCatalogo = 'productos' | 'proveedores' | 'almacenes' | 'lotes';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.component.css'],
})
export class CatalogoComponent implements OnInit {
  private productoService = inject(ProductoService);
  private proveedorService = inject(ProveedorService);
  private almacenService = inject(AlmacenService);
  private loteService = inject(LoteService);
  private fb = inject(FormBuilder);

  // Tab activo
  tabActivo = signal<TabCatalogo>('productos');

  // Datos principales
  productos = signal<Producto[]>([]);
  proveedores = signal<Proveedor[]>([]);
  almacenes = signal<Almacen[]>([]);
  lotes = signal<Lote[]>([]);

  // Estados de UI
  cargando = signal<boolean>(false);
  procesandoForm = signal<boolean>(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  busqueda = signal<string>('');
  filtroAlmacenLote = signal<string>('');

  // Modales
  mostrandoModalProducto = signal<boolean>(false);
  editandoProducto = signal<Producto | null>(null);

  mostrandoModalProveedor = signal<boolean>(false);
  editandoProveedor = signal<Proveedor | null>(null);

  mostrandoModalAlmacen = signal<boolean>(false);
  editandoAlmacen = signal<Almacen | null>(null);

  mostrandoModalLote = signal<boolean>(false);
  editandoLote = signal<Lote | null>(null);

  mostrandoModalTransferir = signal<boolean>(false);
  loteATransferir = signal<Lote | null>(null);

  elementoADesactivar = signal<{
    tipo: 'producto' | 'proveedor' | 'almacen';
    id: string;
    nombre: string;
    advertenciaLotes?: boolean;
  } | null>(null);

  // Formularios Reactivos
  formProducto = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    descripcion: [''],
    foto_path: [''],
    precio_venta: [0, [Validators.required, Validators.min(0)]],
    precio_venta_paquete: [null as number | null, [Validators.min(0)]],
    unidades_por_paquete: [1, [Validators.required, Validators.min(1)]],
    permite_venta_por_paquete: [false],
  });

  formProveedor = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    telefono: [''],
    notas: [''],
  });

  formAlmacen = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    tipo: ['venta' as 'principal' | 'venta', [Validators.required]],
  });

  formLote = this.fb.group({
    producto_id: ['', [Validators.required]],
    proveedor_id: ['', [Validators.required]],
    almacen_id: ['', [Validators.required]],
    cantidad_paquetes: [1, [Validators.required, Validators.min(1)]],
    unidades_por_paquete: [1, [Validators.required, Validators.min(1)]],
    precio_compra_paquete: [0, [Validators.required, Validators.min(0)]],
    cantidad_unidades_sueltas: [0, [Validators.min(0)]],
    fecha_ingreso: [new Date().toISOString().substring(0, 10), [Validators.required]],
    fecha_vencimiento: [''],
    motivo: ['Ingreso de inventario'],
  });

  cambioFormLote = signal<number>(0);

  unidadesTotalesCalculadas = computed(() => {
    this.cambioFormLote();
    const v = this.formLote.value;
    const paq = Number(v.cantidad_paquetes || 0);
    const uPorPaq = Number(v.unidades_por_paquete || 1);
    const sueltas = Number(v.cantidad_unidades_sueltas || 0);
    return Math.max(0, (paq * uPorPaq) + sueltas);
  });

  precioUnitarioCalculado = computed(() => {
    this.cambioFormLote();
    const v = this.formLote.value;
    const precioPaq = Number(v.precio_compra_paquete || 0);
    const uPorPaq = Number(v.unidades_por_paquete || 1);
    if (uPorPaq <= 0) return 0;
    return Number((precioPaq / uPorPaq).toFixed(2));
  });

  costoTotalCalculado = computed(() => {
    this.cambioFormLote();
    const v = this.formLote.value;
    const paq = Number(v.cantidad_paquetes || 0);
    const precioPaq = Number(v.precio_compra_paquete || 0);
    const sueltas = Number(v.cantidad_unidades_sueltas || 0);
    const precioUnit = this.precioUnitarioCalculado();
    return Number((paq * precioPaq + sueltas * precioUnit).toFixed(2));
  });

  formTransferir = this.fb.group({
    almacen_destino_id: ['', [Validators.required]],
    cantidad_paquetes: [1, [Validators.required, Validators.min(0)]],
    cantidad_unidades_sueltas: [0, [Validators.min(0)]],
  });

  unidadesTransferirCalculadas = computed(() => {
    this.cambioFormLote();
    const v = this.formTransferir.value;
    const lote = this.loteATransferir();
    if (!lote) return 0;
    const prod = this.productos().find(p => p.id === lote.producto_id) || lote.producto;
    const uPorPaq = prod?.unidades_por_paquete || 1;
    const paq = Number(v.cantidad_paquetes || 0);
    const sueltas = Number(v.cantidad_unidades_sueltas || 0);
    return (paq * uPorPaq) + sueltas;
  });

  // Filtros computados
  productosFiltrados = computed(() => {
    const term = this.busqueda().toLowerCase().trim();
    const prods = this.productos();
    if (!term) return prods;
    return prods.filter(
      p => p.nombre.toLowerCase().includes(term) || (p.descripcion && p.descripcion.toLowerCase().includes(term))
    );
  });

  proveedoresFiltrados = computed(() => {
    const term = this.busqueda().toLowerCase().trim();
    const provs = this.proveedores();
    if (!term) return provs;
    return provs.filter(
      p => p.nombre.toLowerCase().includes(term) || (p.telefono && p.telefono.toLowerCase().includes(term))
    );
  });

  lotesFiltrados = computed(() => {
    const almId = this.filtroAlmacenLote();
    const term = this.busqueda().toLowerCase().trim();
    let res = this.lotes();

    if (almId) {
      res = res.filter(l => l.almacen_id === almId);
    }
    if (term) {
      res = res.filter(
        l => (l.producto?.nombre && l.producto.nombre.toLowerCase().includes(term)) ||
             (l.proveedor?.nombre && l.proveedor.nombre.toLowerCase().includes(term)) ||
             (l.almacen?.nombre && l.almacen.nombre.toLowerCase().includes(term))
      );
    }
    return res;
  });

  calcularStockLote(lote: Lote): number {
    if (lote.total_unidades !== undefined && lote.total_unidades !== null) {
      return lote.total_unidades;
    }
    const prod = this.productos().find(p => p.id === lote.producto_id) || lote.producto;
    const uPorPaq = prod?.unidades_por_paquete || 1;
    return (Number(lote.cantidad_paquetes || 0) * uPorPaq) + Number(lote.cantidad_unidades || 0);
  }

  // Agrupación de lotes por producto para la pestaña Lotes
  lotesPorProducto = computed(() => {
    const filtrados = this.lotesFiltrados();
    const grupos: { producto: Producto | null; lotes: Lote[]; totalUnidades: number }[] = [];

    for (const lote of filtrados) {
      const prodId = lote.producto_id;
      let grupo = grupos.find(g => g.producto?.id === prodId);
      if (!grupo) {
        grupo = {
          producto: lote.producto || this.productos().find(p => p.id === prodId) || null,
          lotes: [],
          totalUnidades: 0,
        };
        grupos.push(grupo);
      }
      grupo.lotes.push(lote);
      grupo.totalUnidades += this.calcularStockLote(lote);
    }

    return grupos;
  });

  // Almacenes disponibles como destino al transferir
  almacenesDestinoDisponibles = computed(() => {
    const loteActual = this.loteATransferir();
    if (!loteActual) return this.almacenes();
    return this.almacenes().filter(a => a.id !== loteActual.almacen_id && a.activo);
  });

  ngOnInit(): void {
    this.cargarTodosLosDatos();
    this.formLote.valueChanges.subscribe(() => {
      this.cambioFormLote.update(c => c + 1);
    });
    this.formTransferir.valueChanges.subscribe(() => {
      this.cambioFormLote.update(c => c + 1);
    });
  }

  cambiarTab(tab: TabCatalogo): void {
    this.tabActivo.set(tab);
    this.busqueda.set('');
    this.errorMsg.set(null);
    this.successMsg.set(null);
  }

  cargarTodosLosDatos(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.productoService.listar().subscribe({
      next: prods => this.productos.set(prods),
      error: err => this.manejarError(err),
    });

    this.proveedorService.listar().subscribe({
      next: provs => this.proveedores.set(provs),
      error: err => this.manejarError(err),
    });

    this.almacenService.listar().subscribe({
      next: alms => this.almacenes.set(alms),
      error: err => this.manejarError(err),
    });

    this.loteService.listar().subscribe({
      next: lotes => {
        this.lotes.set(lotes);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.manejarError(err);
      },
    });
  }

  // --------------------------------------------------------------------------
  // PRODUCTOS CRUD
  // --------------------------------------------------------------------------
  abrirModalNuevoProducto(): void {
    this.editandoProducto.set(null);
    this.formProducto.reset({
      nombre: '',
      descripcion: '',
      foto_path: '',
      precio_venta: 0,
      precio_venta_paquete: null,
      unidades_por_paquete: 1,
      permite_venta_por_paquete: false,
    });
    this.mostrandoModalProducto.set(true);
  }

  abrirModalEditarProducto(producto: Producto): void {
    this.editandoProducto.set(producto);
    this.formProducto.patchValue({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      foto_path: producto.foto_path || '',
      precio_venta: Number(producto.precio_venta),
      precio_venta_paquete: producto.precio_venta_paquete !== null && producto.precio_venta_paquete !== undefined ? Number(producto.precio_venta_paquete) : null,
      unidades_por_paquete: producto.unidades_por_paquete,
      permite_venta_por_paquete: producto.permite_venta_por_paquete,
    });
    this.mostrandoModalProducto.set(true);
  }

  guardarProducto(): void {
    if (this.formProducto.invalid) {
      this.formProducto.markAllAsTouched();
      return;
    }

    this.procesandoForm.set(true);
    const val = this.formProducto.value;
    const precioPaqueteVal = val.precio_venta_paquete !== null && val.precio_venta_paquete !== undefined
      ? Number(val.precio_venta_paquete)
      : null;

    const payload: Partial<Producto> = {
      nombre: val.nombre!,
      descripcion: val.descripcion || null,
      foto_path: val.foto_path || null,
      precio_venta: Number(val.precio_venta),
      precio_venta_paquete: val.permite_venta_por_paquete ? precioPaqueteVal : null,
      unidades_por_paquete: Number(val.unidades_por_paquete || 1),
      permite_venta_por_paquete: !!val.permite_venta_por_paquete,
    };

    const editando = this.editandoProducto();
    if (editando) {
      this.productoService.actualizar(editando.id, payload).subscribe({
        next: actualizado => {
          this.procesandoForm.set(false);
          this.productos.update(lista => lista.map(p => (p.id === actualizado.id ? actualizado : p)));
          this.mostrandoModalProducto.set(false);
          this.mostrarExito(`Producto "${actualizado.nombre}" actualizado correctamente.`);
        },
        error: err => {
          this.procesandoForm.set(false);
          this.manejarError(err);
        },
      });
    } else {
      this.productoService.crear(payload).subscribe({
        next: nuevo => {
          this.procesandoForm.set(false);
          this.productos.update(lista => [nuevo, ...lista]);
          this.mostrandoModalProducto.set(false);
          this.mostrarExito(`Producto "${nuevo.nombre}" creado exitosamente.`);
        },
        error: err => {
          this.procesandoForm.set(false);
          this.manejarError(err);
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // PROVEEDORES CRUD
  // --------------------------------------------------------------------------
  abrirModalNuevoProveedor(): void {
    this.editandoProveedor.set(null);
    this.formProveedor.reset({
      nombre: '',
      telefono: '',
      notas: '',
    });
    this.mostrandoModalProveedor.set(true);
  }

  abrirModalEditarProveedor(proveedor: Proveedor): void {
    this.editandoProveedor.set(proveedor);
    this.formProveedor.patchValue({
      nombre: proveedor.nombre,
      telefono: proveedor.telefono || '',
      notas: proveedor.notas || '',
    });
    this.mostrandoModalProveedor.set(true);
  }

  guardarProveedor(): void {
    if (this.formProveedor.invalid) {
      this.formProveedor.markAllAsTouched();
      return;
    }

    this.procesandoForm.set(true);
    const val = this.formProveedor.value;
    const payload: Partial<Proveedor> = {
      nombre: val.nombre!,
      telefono: val.telefono || null,
      notas: val.notas || null,
    };

    const editando = this.editandoProveedor();
    if (editando) {
      this.proveedorService.actualizar(editando.id, payload).subscribe({
        next: actualizado => {
          this.procesandoForm.set(false);
          this.proveedores.update(lista => lista.map(p => (p.id === actualizado.id ? actualizado : p)));
          this.mostrandoModalProveedor.set(false);
          this.mostrarExito(`Proveedor "${actualizado.nombre}" actualizado.`);
        },
        error: err => {
          this.procesandoForm.set(false);
          this.manejarError(err);
        },
      });
    } else {
      this.proveedorService.crear(payload).subscribe({
        next: nuevo => {
          this.procesandoForm.set(false);
          this.proveedores.update(lista => [nuevo, ...lista]);
          this.mostrandoModalProveedor.set(false);
          this.mostrarExito(`Proveedor "${nuevo.nombre}" registrado.`);
        },
        error: err => {
          this.procesandoForm.set(false);
          this.manejarError(err);
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // ALMACENES CRUD
  // --------------------------------------------------------------------------
  abrirModalNuevoAlmacen(): void {
    this.editandoAlmacen.set(null);
    this.formAlmacen.reset({
      nombre: '',
      tipo: 'venta',
    });
    this.mostrandoModalAlmacen.set(true);
  }

  abrirModalEditarAlmacen(almacen: Almacen): void {
    this.editandoAlmacen.set(almacen);
    this.formAlmacen.patchValue({
      nombre: almacen.nombre,
      tipo: almacen.tipo,
    });
    this.mostrandoModalAlmacen.set(true);
  }

  guardarAlmacen(): void {
    if (this.formAlmacen.invalid) {
      this.formAlmacen.markAllAsTouched();
      return;
    }

    this.procesandoForm.set(true);
    const val = this.formAlmacen.value;
    const payload: Partial<Almacen> = {
      nombre: val.nombre!,
      tipo: val.tipo!,
    };

    const editando = this.editandoAlmacen();
    if (editando) {
      this.almacenService.actualizar(editando.id, payload).subscribe({
        next: actualizado => {
          this.procesandoForm.set(false);
          this.almacenes.update(lista => lista.map(a => (a.id === actualizado.id ? actualizado : a)));
          this.mostrandoModalAlmacen.set(false);
          this.mostrarExito(`Almacén "${actualizado.nombre}" actualizado.`);
        },
        error: err => {
          this.procesandoForm.set(false);
          this.manejarError(err);
        },
      });
    } else {
      this.almacenService.crear(payload).subscribe({
        next: nuevo => {
          this.procesandoForm.set(false);
          this.almacenes.update(lista => [nuevo, ...lista]);
          this.mostrandoModalAlmacen.set(false);
          this.mostrarExito(`Almacén "${nuevo.nombre}" creado exitosamente.`);
        },
        error: err => {
          this.procesandoForm.set(false);
          this.manejarError(err);
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // LOTES (INGRESO Y TRANSFERENCIA)
  // --------------------------------------------------------------------------
  alCambiarProductoLote(evento: Event): void {
    const target = evento.target as HTMLSelectElement;
    const prodId = target.value;
    const prod = this.productos().find(p => p.id === prodId);
    if (prod) {
      const uPorPaq = prod.unidades_por_paquete || 1;
      this.formLote.patchValue({
        unidades_por_paquete: uPorPaq,
      });
      this.cambioFormLote.update(c => c + 1);
    }
  }

  abrirModalIngresarLote(): void {
    this.editandoLote.set(null);
    const primerProd = this.productos().find(p => p.activo);
    const primerProv = this.proveedores().find(p => p.activo);
    const primerAlm = this.almacenes().find(a => a.activo);
    const uPorPaq = primerProd?.unidades_por_paquete || 1;

    this.formLote.reset({
      producto_id: primerProd?.id || '',
      proveedor_id: primerProv?.id || '',
      almacen_id: primerAlm?.id || '',
      cantidad_paquetes: 1,
      unidades_por_paquete: uPorPaq,
      precio_compra_paquete: 0,
      cantidad_unidades_sueltas: 0,
      fecha_ingreso: new Date().toISOString().substring(0, 10),
      fecha_vencimiento: '',
      motivo: 'Ingreso regular de inventario',
    });
    this.cambioFormLote.update(c => c + 1);
    this.mostrandoModalLote.set(true);
  }

  abrirModalEditarLote(lote: Lote): void {
    this.editandoLote.set(lote);

    const fIngreso = lote.fecha_ingreso ? lote.fecha_ingreso.split('T')[0] : '';
    const fVenc = lote.fecha_vencimiento ? lote.fecha_vencimiento.split('T')[0] : '';

    const prod = this.productos().find(p => p.id === lote.producto_id) || lote.producto;
    const uPorPaq = prod?.unidades_por_paquete || 1;

    const paq = Number(lote.cantidad_paquetes ?? 0);
    const sueltas = Number(lote.cantidad_unidades ?? 0);
    const precioUnitario = Number(lote.precio_compra_unitario || 0);
    const precioPaquete = Number((precioUnitario * uPorPaq).toFixed(2));

    this.formLote.reset({
      producto_id: lote.producto_id,
      proveedor_id: lote.proveedor_id,
      almacen_id: lote.almacen_id,
      cantidad_paquetes: paq > 0 ? paq : (uPorPaq > 0 ? Math.floor(sueltas / uPorPaq) : 0),
      unidades_por_paquete: uPorPaq,
      precio_compra_paquete: precioPaquete,
      cantidad_unidades_sueltas: paq > 0 ? sueltas : (uPorPaq > 0 ? sueltas % uPorPaq : sueltas),
      fecha_ingreso: fIngreso,
      fecha_vencimiento: fVenc,
      motivo: 'Corrección de datos de compra',
    });
    this.cambioFormLote.update(c => c + 1);
    this.mostrandoModalLote.set(true);
  }

  guardarIngresoLote(): void {
    if (this.formLote.invalid) {
      this.formLote.markAllAsTouched();
      return;
    }

    const val = this.formLote.value;
    const paq = Number(val.cantidad_paquetes || 0);
    const uPorPaq = Number(val.unidades_por_paquete || 1);
    const sueltas = Number(val.cantidad_unidades_sueltas || 0);
    const precioPaq = Number(val.precio_compra_paquete || 0);

    const totalUnidades = (paq * uPorPaq) + sueltas;
    if (totalUnidades <= 0) {
      this.errorMsg.set('El lote debe tener al menos 1 unidad resultante.');
      return;
    }

    const precioUnitario = uPorPaq > 0 ? Number((precioPaq / uPorPaq).toFixed(2)) : 0;

    this.procesandoForm.set(true);
    const payload = {
      producto_id: val.producto_id!,
      proveedor_id: val.proveedor_id!,
      almacen_id: val.almacen_id!,
      cantidad_paquetes: paq,
      cantidad_unidades: sueltas,
      precio_compra_unitario: precioUnitario,
      fecha_ingreso: val.fecha_ingreso || new Date().toISOString().substring(0, 10),
      fecha_vencimiento: val.fecha_vencimiento || null,
      motivo: val.motivo || null,
    };

    const loteAEditar = this.editandoLote();
    if (loteAEditar) {
      this.loteService.actualizar(loteAEditar.id, payload).subscribe({
        next: () => {
          this.procesandoForm.set(false);
          this.mostrandoModalLote.set(false);
          this.editandoLote.set(null);
          this.mostrarExito('Lote actualizado con éxito.');
          this.loteService.listar().subscribe(lotes => this.lotes.set(lotes));
        },
        error: err => {
          this.procesandoForm.set(false);
          this.manejarError(err);
        },
      });
    } else {
      this.loteService.ingresar(payload).subscribe({
        next: () => {
          this.procesandoForm.set(false);
          this.mostrandoModalLote.set(false);
          this.mostrarExito('Lote ingresado con éxito al inventario.');
          this.loteService.listar().subscribe(lotes => this.lotes.set(lotes));
        },
        error: err => {
          this.procesandoForm.set(false);
          this.manejarError(err);
        },
      });
    }
  }

  abrirModalTransferirLote(lote: Lote): void {
    this.loteATransferir.set(lote);
    const destinos = this.almacenes().filter(a => a.id !== lote.almacen_id && a.activo);
    const primerDestino = destinos.length > 0 ? destinos[0].id : '';

    const stockTotal = this.calcularStockLote(lote);
    const prod = this.productos().find(p => p.id === lote.producto_id) || lote.producto;
    const uPorPaq = prod?.unidades_por_paquete || 1;
    const paqDisponibles = Math.floor(stockTotal / uPorPaq);

    this.formTransferir.reset({
      almacen_destino_id: primerDestino,
      cantidad_paquetes: paqDisponibles > 0 ? 1 : 0,
      cantidad_unidades_sueltas: paqDisponibles > 0 ? 0 : Math.min(1, stockTotal),
    });
    this.cambioFormLote.update(c => c + 1);
    this.mostrandoModalTransferir.set(true);
  }

  ejecutarTransferencia(): void {
    if (this.formTransferir.invalid) {
      this.formTransferir.markAllAsTouched();
      return;
    }

    const lote = this.loteATransferir();
    if (!lote) return;

    const val = this.formTransferir.value;
    const totalUnidades = this.unidadesTransferirCalculadas();
    if (totalUnidades <= 0) {
      this.errorMsg.set('Debe transferir al menos 1 paquete o unidad suelta.');
      return;
    }

    const stockDisponible = this.calcularStockLote(lote);
    if (totalUnidades > stockDisponible) {
      this.errorMsg.set(`La cantidad a transferir (${totalUnidades} unidades) supera el stock disponible en el lote (${stockDisponible}).`);
      return;
    }

    this.procesandoForm.set(true);
    this.loteService.transferir(lote.id, {
      almacen_destino_id: val.almacen_destino_id!,
      cantidad_unidades: totalUnidades,
    }).subscribe({
      next: res => {
        this.procesandoForm.set(false);
        this.mostrandoModalTransferir.set(false);
        this.mostrarExito(res.message || 'Transferencia realizada con éxito.');
        // Recargar lotes y almacenes
        this.loteService.listar().subscribe(lotes => this.lotes.set(lotes));
      },
      error: err => {
        this.procesandoForm.set(false);
        this.manejarError(err);
      },
    });
  }

  // --------------------------------------------------------------------------
  // CONFIRMACIÓN DE DESACTIVACIÓN LÓGICA
  // --------------------------------------------------------------------------
  solicitarDesactivar(tipo: 'producto' | 'proveedor' | 'almacen', item: { id: string; nombre: string }): void {
    let advertenciaLotes = false;

    if (tipo === 'almacen') {
      // Regla: "Muestra un aviso si intentas desactivar un almacén que tiene lotes con stock activo"
      advertenciaLotes = this.lotes().some(
        l => l.almacen_id === item.id && (Number(l.cantidad_unidades || 0) > 0 || Number(l.cantidad_paquetes || 0) > 0)
      );
    }

    this.elementoADesactivar.set({
      tipo,
      id: item.id,
      nombre: item.nombre,
      advertenciaLotes,
    });
  }

  confirmarDesactivacion(): void {
    const elem = this.elementoADesactivar();
    if (!elem) return;

    this.procesandoForm.set(true);

    if (elem.tipo === 'producto') {
      this.productoService.desactivar(elem.id).subscribe({
        next: () => {
          this.procesandoForm.set(false);
          this.productos.update(lista => lista.filter(p => p.id !== elem.id));
          this.elementoADesactivar.set(null);
          this.mostrarExito(`Producto "${elem.nombre}" desactivado correctamente.`);
        },
        error: err => {
          this.procesandoForm.set(false);
          this.manejarError(err);
        },
      });
    } else if (elem.tipo === 'proveedor') {
      this.proveedorService.desactivar(elem.id).subscribe({
        next: () => {
          this.procesandoForm.set(false);
          this.proveedores.update(lista => lista.filter(p => p.id !== elem.id));
          this.elementoADesactivar.set(null);
          this.mostrarExito(`Proveedor "${elem.nombre}" desactivado correctamente.`);
        },
        error: err => {
          this.procesandoForm.set(false);
          this.manejarError(err);
        },
      });
    } else if (elem.tipo === 'almacen') {
      this.almacenService.desactivar(elem.id).subscribe({
        next: () => {
          this.procesandoForm.set(false);
          this.almacenes.update(lista => lista.filter(a => a.id !== elem.id));
          this.elementoADesactivar.set(null);
          this.mostrarExito(`Almacén "${elem.nombre}" desactivado correctamente.`);
        },
        error: err => {
          this.procesandoForm.set(false);
          this.manejarError(err);
        },
      });
    }
  }

  cancelarDesactivacion(): void {
    this.elementoADesactivar.set(null);
  }

  // --------------------------------------------------------------------------
  // HELPERS VISUALES Y FORMATOS
  // --------------------------------------------------------------------------
  calcularEstadoVencimiento(fechaStr: string | null | undefined): 'vencido' | 'proximo' | 'normal' | 'sin_fecha' {
    if (!fechaStr) return 'sin_fecha';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const soloFecha = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
    const fecha = new Date(soloFecha + 'T00:00:00');
    fecha.setHours(0, 0, 0, 0);

    const diffMs = fecha.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return 'vencido';
    if (diffDias <= 15) return 'proximo';
    return 'normal';
  }

  formatearSoloFecha(fechaStr: string | null | undefined): string {
    if (!fechaStr) return '—';
    return fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
  }

  diasRestantesVencimiento(fechaStr: string | null | undefined): string {
    if (!fechaStr) return 'Sin fecha';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const soloFecha = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
    const fecha = new Date(soloFecha + 'T00:00:00');
    fecha.setHours(0, 0, 0, 0);

    const diffMs = fecha.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return `Venció hace ${Math.abs(diffDias)} días`;
    if (diffDias === 0) return 'Vence hoy';
    if (diffDias === 1) return 'Vence mañana';
    return `Vence en ${diffDias} días`;
  }

  formatMoneda(valor: number | string | null | undefined): string {
    const num = Number(valor || 0);
    return `$${num.toFixed(2)}`;
  }

  manejarError(err: any): void {
    const msg = err.error?.message || err.message || 'Ocurrió un error inesperado al procesar la solicitud.';
    this.errorMsg.set(msg);
  }

  mostrarExito(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => {
      if (this.successMsg() === msg) {
        this.successMsg.set(null);
      }
    }, 5000);
  }
}
