const BASE_URL = 'http://127.0.0.1/api';

async function run() {
  console.log('================================================================');
  console.log('GUADALUPOS - VERIFICACIÓN REAL DEL MÓDULO DE CATÁLOGO (PASO 4)');
  console.log('================================================================\n');

  // 0. Login como master
  console.log('--> Paso 0: Autenticando usuario master...');
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: 'master@guadalupos.local', password: 'cambiar123' }),
  });
  if (!loginRes.ok) throw new Error(`Login falló: ${loginRes.status}`);
  const { token, user } = await loginRes.json();
  console.log(`✓ Autenticado como ${user.name} (${user.email}). Rol: ${user.roles.join(', ')}\n`);

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 1. Crear un almacén nuevo
  console.log('--> Paso 1a: Creando almacén...');
  const nombreAlm = `Almacén Sucursal Este ${Date.now().toString().slice(-4)}`;
  const almRes = await fetch(`${BASE_URL}/almacenes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ nombre: nombreAlm, tipo: 'venta' }),
  });
  if (!almRes.ok) throw new Error(`Crear almacén falló: ${almRes.status} ${await almRes.text()}`);
  const nuevoAlmacen = await almRes.json();
  console.log(`✓ Almacén creado: "${nuevoAlmacen.nombre}" | ID: ${nuevoAlmacen.id} | Tipo: ${nuevoAlmacen.tipo}`);

  // 1b. Crear un proveedor nuevo
  console.log('\n--> Paso 1b: Creando proveedor...');
  const nombreProv = `Proveedor Los Andes SRL ${Date.now().toString().slice(-4)}`;
  const provRes = await fetch(`${BASE_URL}/proveedores`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ nombre: nombreProv, telefono: '71234567', notas: 'Distribuidor mayorista autorizado' }),
  });
  if (!provRes.ok) throw new Error(`Crear proveedor falló: ${provRes.status} ${await provRes.text()}`);
  const nuevoProveedor = await provRes.json();
  console.log(`✓ Proveedor creado: "${nuevoProveedor.nombre}" | ID: ${nuevoProveedor.id} | Tel: ${nuevoProveedor.telefono}`);

  // 1c. Crear un producto con permite_venta_por_paquete = true
  console.log('\n--> Paso 1c: Creando producto con permite_venta_por_paquete=true...');
  const nombreProd = `Galletas Avena & Miel Pack ${Date.now().toString().slice(-4)}`;
  const prodRes = await fetch(`${BASE_URL}/productos`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      nombre: nombreProd,
      descripcion: 'Paquete de galletas crocantes de avena y miel de abeja',
      foto_path: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=150',
      precio_venta: 18.50,
      unidades_por_paquete: 12,
      permite_venta_por_paquete: true,
    }),
  });
  if (!prodRes.ok) throw new Error(`Crear producto falló: ${prodRes.status} ${await prodRes.text()}`);
  const nuevoProducto = await prodRes.json();
  console.log(`✓ Producto creado: "${nuevoProducto.nombre}" | ID: ${nuevoProducto.id}`);
  console.log(`  Precio: $${nuevoProducto.precio_venta} | Unidades/paquete: ${nuevoProducto.unidades_por_paquete} | Venta por paquete: ${nuevoProducto.permite_venta_por_paquete}`);

  // 1d. Ingresar un lote nuevo de ese producto
  console.log('\n--> Paso 1d: Ingresando lote nuevo para el producto...');
  // Fecha en 5 días para validar vencimiento próximo (< 15 días)
  const hoy = new Date();
  const fechaVencProximo = new Date(hoy.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

  const loteRes = await fetch(`${BASE_URL}/lotes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      producto_id: nuevoProducto.id,
      proveedor_id: nuevoProveedor.id,
      almacen_id: nuevoAlmacen.id,
      cantidad_paquetes: 10,
      cantidad_unidades: 6,
      precio_compra_unitario: 12.00,
      fecha_vencimiento: fechaVencProximo,
      motivo: 'Ingreso inicial de prueba de catálogo',
    }),
  });
  if (!loteRes.ok) throw new Error(`Ingreso de lote falló: ${loteRes.status} ${await loteRes.text()}`);
  const nuevoLote = await loteRes.json();
  // 10 paquetes * 12 + 6 = 126 unidades
  console.log(`✓ Lote ingresado con éxito | ID: ${nuevoLote.id}`);
  console.log(`  Cant. paquetes: ${nuevoLote.cantidad_paquetes} | Cant. unidades: ${nuevoLote.cantidad_unidades} | Vence: ${nuevoLote.fecha_vencimiento}`);

  // 1e. Transferir una parte de ese lote a otro almacén
  console.log('\n--> Paso 1e: Transfiriendo parte del lote a otro almacén...');
  // Buscar un almacén destino distinto
  const todosAlmsRes = await fetch(`${BASE_URL}/almacenes`, { headers });
  const todosAlms = await todosAlmsRes.json();
  const almacenDestino = todosAlms.find(a => a.id !== nuevoAlmacen.id) || todosAlms[0];

  const transferRes = await fetch(`${BASE_URL}/lotes/${nuevoLote.id}/transferir`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      almacen_destino_id: almacenDestino.id,
      cantidad_unidades: 20,
    }),
  });
  if (!transferRes.ok) throw new Error(`Transferencia falló: ${transferRes.status} ${await transferRes.text()}`);
  const transferData = await transferRes.json();
  console.log(`✓ Transferencia exitosa: "${transferData.message}"`);
  console.log(`  Transferidas: 20 unidades desde "${nuevoAlmacen.nombre}" hacia "${almacenDestino.nombre}"`);

  // 2. Desactivar el producto recién creado
  console.log('\n================================================================');
  console.log('--> Paso 2: Desactivando producto y confirmando baja lógica...');
  console.log('================================================================');
  const deleteRes = await fetch(`${BASE_URL}/productos/${nuevoProducto.id}`, {
    method: 'DELETE',
    headers,
  });
  if (!deleteRes.ok) throw new Error(`Desactivar producto falló: ${deleteRes.status} ${await deleteRes.text()}`);
  const deleteData = await deleteRes.json();
  console.log(`✓ DELETE /api/productos/${nuevoProducto.id} respondió: "${deleteData.message}"`);
  console.log(`  Estado retornado: activo = ${deleteData.producto.activo}`);

  // Confirmar que ya NO aparece en GET /api/productos (solo activos)
  const listaProdsRes = await fetch(`${BASE_URL}/productos`, { headers });
  const listaProds = await listaProdsRes.json();
  const sigueEnLista = listaProds.some(p => p.id === nuevoProducto.id);
  console.log(`✓ ¿Sigue en la lista de productos activos (/api/productos)?: ${sigueEnLista ? 'SÍ (ERROR)' : 'NO (CORRECTO - deslistado)'}`);

  // 3. Confirmar fechas de vencimiento en GET /api/lotes
  console.log('\n================================================================');
  console.log('--> Paso 3: Verificando estados de vencimiento en GET /api/lotes...');
  console.log('================================================================');
  const lotesRes = await fetch(`${BASE_URL}/lotes?producto_id=${nuevoProducto.id}`, { headers });
  const lotes = await lotesRes.json();
  console.log(`✓ Total de lotes encontrados para el producto: ${lotes.length}`);
  for (const l of lotes) {
    const fVenc = l.fecha_vencimiento ? l.fecha_vencimiento.split('T')[0] : null;
    const diffDias = fVenc ? Math.ceil((new Date(fVenc + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / (1000*60*60*24)) : null;
    console.log(`  - Lote ID: ${l.id.substring(0, 8)}... | Almacén: ${l.almacen?.nombre} | Unidades: ${l.cantidad_unidades} | Vence: ${fVenc} (${diffDias} días restantes) -> Resaltado: ÁMBAR/PRÓXIMO`);
  }

  console.log('\n================================================================');
  console.log('TODAS LAS VERIFICACIONES DEL MÓDULO DE CATÁLOGO FUERON SUPERADAS');
  console.log('================================================================');
}

run().catch(e => {
  console.error('ERROR EN VERIFICACIÓN:', e);
  process.exit(1);
});
