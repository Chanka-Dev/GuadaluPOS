export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string | null;
  foto_path?: string | null;
  unidades_por_paquete: number;
  permite_venta_por_paquete: boolean;
  precio_venta: number | string;
  precio_venta_paquete?: number | string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Almacen {
  id: string;
  nombre: string;
  tipo: 'principal' | 'venta';
  activo: boolean;
}

export interface DesgloseVendedorTurno {
  usuario_id: number;
  nombre: string;
  total: number;
  conteo: number;
  efectivo: number;
  transferencia: number;
  tarjeta: number;
}

export interface TurnoResumenContable {
  monto_inicial: number;
  ventas_efectivo: number;
  conteo_efectivo: number;
  ventas_transferencia: number;
  conteo_transferencia: number;
  ventas_tarjeta: number;
  conteo_tarjeta: number;
  monto_esperado_efectivo: number;
  total_recaudado: number;
  total_transacciones: number;
  desglose_vendedores?: DesgloseVendedorTurno[];
}

export interface TurnoCaja {
  id: string;
  usuario_id: number;
  almacen_id: string;
  monto_inicial: number | string;
  monto_final_esperado?: number | string | null;
  monto_final_contado?: number | string | null;
  fecha_apertura: string;
  fecha_cierre?: string | null;
  estado: 'abierto' | 'cerrado';
  diferencia?: number | null;
  resumen_contable?: TurnoResumenContable;
  usuarios_compartidos?: {
    id: number;
    name: string;
    email: string;
  }[];
  almacen?: Almacen;
  usuario?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface AbrirTurnoPayload {
  almacen_id: string;
  monto_inicial: number;
}

export interface VentaItemPayload {
  producto_id: string;
  cantidad: number;
  unidad: 'unidad' | 'paquete';
  precio?: number;
  lote_id?: string | null;
}

export interface RegistrarVentaPayload {
  almacen_id: string;
  turno_id?: string | null;
  metodo_pago?: string | null;
  client_uuid?: string;
  vendida_en: string;
  items: VentaItemPayload[];
}

export interface VentaPendienteLocal extends RegistrarVentaPayload {
  client_uuid: string;
  estado: 'pendiente' | 'conflicto';
  mensaje_error: string | null;
  created_at?: string;
}

export interface VentaDetalleResponse {
  id: string;
  venta_id: string;
  producto_id: string;
  lote_id?: string | null;
  cantidad: number;
  unidad: 'unidad' | 'paquete';
  precio_unitario: number | string;
  subtotal: number | string;
  producto?: Producto;
  lote?: Lote;
}

export interface VentaFiltros {
  turno_id?: string;
  almacen_id?: string;
  metodo_pago?: string;
  fecha?: string;
  usuario_id?: number;
  limit?: number;
}

export interface VentaResponse {
  id: string;
  usuario_id: number;
  almacen_id: string;
  turno_id?: string | null;
  total: number | string;
  metodo_pago?: string | null;
  client_uuid?: string | null;
  vendida_en: string;
  created_at: string;
  detalles?: VentaDetalleResponse[];
  usuario?: { id: number; name: string; email: string };
  almacen?: Almacen;
  turno?: TurnoCaja;
  offline?: boolean;
}

export interface Proveedor {
  id: string;
  nombre: string;
  telefono?: string | null;
  notas?: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Lote {
  id: string;
  producto_id: string;
  proveedor_id: string;
  almacen_id: string;
  cantidad_paquetes: number;
  cantidad_unidades: number;
  total_unidades?: number;
  precio_compra_unitario: number | string;
  fecha_ingreso: string;
  fecha_vencimiento?: string | null;
  fecha_salida?: string | null;
  estado: 'activo' | 'agotado' | 'vencido';
  created_at?: string;
  updated_at?: string;
  producto?: Producto;
  proveedor?: Proveedor;
  almacen?: Almacen;
}

export interface IngresarLotePayload {
  producto_id: string;
  proveedor_id: string;
  almacen_id: string;
  cantidad_paquetes?: number;
  cantidad_unidades?: number;
  precio_compra_unitario: number | string;
  fecha_vencimiento?: string | null;
  fecha_ingreso?: string | null;
  motivo?: string | null;
}

export interface TransferirLotePayload {
  almacen_destino_id: string;
  cantidad_unidades: number;
}

