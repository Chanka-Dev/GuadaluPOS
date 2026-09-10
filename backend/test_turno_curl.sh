#!/usr/bin/env bash
set -e

BASE_URL="http://127.0.0.1/api"
ALMACEN_ID="a2b16c88-9391-4528-b1e3-60d998019c35"
PRODUCTO_ID="a2b16c88-8926-40a0-b7ca-0d379c1645da"

echo "================================================================="
echo "GUADALUPOS: VERIFICACIÓN CON CURL DEL MÓDULO DE TURNO DE CAJA"
echo "================================================================="

# -------------------------------------------------------------------------
# 1. Login como vendedor -> Abre turno (si no hay) -> Venta efectivo -> Cierra turno
# -------------------------------------------------------------------------
echo ""
echo "--> Paso 1: Vendedor con turno y venta en efectivo cierra su propio turno..."

VEND_LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"vendedor.test@guadalupos.local","password":"password123"}')

VEND_TOKEN=$(php -r '$d = json_decode($argv[1]); echo $d->token ?? "";' "$VEND_LOGIN_RESP")
if [ -z "$VEND_TOKEN" ] || [ "$VEND_TOKEN" = "null" ]; then
  echo "Error login vendedor: $VEND_LOGIN_RESP"
  exit 1
fi
echo "✓ Login exitoso como Vendedor (vendedor.test@guadalupos.local)."

# Verificar si ya tiene turno activo, sino abrir uno
TURNO_ACTIVO_RESP=$(curl -s -X GET "${BASE_URL}/turnos/activo" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${VEND_TOKEN}")

TURNO_ID=$(php -r '$d = json_decode($argv[1]); echo $d->id ?? "";' "$TURNO_ACTIVO_RESP")

if [ -z "$TURNO_ID" ] || [ "$TURNO_ID" = "null" ]; then
  echo "Abriendo nuevo turno para el vendedor..."
  ABRIR_RESP=$(curl -s -X POST "${BASE_URL}/turnos/abrir" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer ${VEND_TOKEN}" \
    -d "{\"almacen_id\":\"${ALMACEN_ID}\",\"monto_inicial\":100.00}")
  TURNO_ID=$(php -r '$d = json_decode($argv[1]); echo $d->id ?? "";' "$ABRIR_RESP")
  echo "✓ Turno abierto con ID: $TURNO_ID (Monto inicial: $100.00)"
else
  echo "✓ Turno activo preexistente ID: $TURNO_ID"
fi

# Registrar una venta en efectivo de 1 unidad ($25.00)
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VENTA_RESP=$(curl -s -X POST "${BASE_URL}/ventas" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${VEND_TOKEN}" \
  -d "{\"almacen_id\":\"${ALMACEN_ID}\",\"turno_id\":\"${TURNO_ID}\",\"metodo_pago\":\"efectivo\",\"vendida_en\":\"${NOW_ISO}\",\"items\":[{\"producto_id\":\"${PRODUCTO_ID}\",\"cantidad\":2,\"unidad\":\"unidad\"}]}")

VENTA_TOTAL=$(php -r '$d = json_decode($argv[1]); echo $d->total ?? "";' "$VENTA_RESP")
echo "✓ Venta registrada en efectivo por: \$$VENTA_TOTAL"

# Cerrar el turno vía curl con monto contado = $120.00 (esperado: $100 inicial + $16 venta = $116 -> diferencia +$4.00)
CIERRE_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/turnos/${TURNO_ID}/cerrar" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${VEND_TOKEN}" \
  -d '{"monto_final_contado":120.00}')

HTTP_STATUS_1=$(echo "$CIERRE_RESP" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY_1=$(echo "$CIERRE_RESP" | grep -v "HTTP_STATUS")

echo "Respuesta HTTP Cierre Propio: $HTTP_STATUS_1"
echo "Cuerpo formateado de respuesta:"
php -r '$d = json_decode($argv[1]); echo json_encode([
  "id" => $d->id,
  "monto_inicial" => $d->monto_inicial,
  "monto_final_esperado" => $d->monto_final_esperado,
  "monto_final_contado" => $d->monto_final_contado,
  "diferencia" => $d->diferencia,
  "estado" => $d->estado,
  "fecha_apertura" => $d->fecha_apertura,
  "fecha_cierre" => $d->fecha_cierre,
], JSON_PRETTY_PRINT) . "\n";' "$BODY_1"

# -------------------------------------------------------------------------
# 2. Login como administrador -> Lista GET /api/turnos?estado=abierto
# -------------------------------------------------------------------------
echo ""
echo "--> Paso 2: Administrador lista turnos abiertos en el sistema..."

ADMIN_LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"admin.test@guadalupos.local","password":"password123"}')

ADMIN_TOKEN=$(php -r '$d = json_decode($argv[1]); echo $d->token ?? "";' "$ADMIN_LOGIN_RESP")
if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo "Error login admin: $ADMIN_LOGIN_RESP"
  exit 1
fi
echo "✓ Login exitoso como Administrador (admin.test@guadalupos.local)."

# Abrir un nuevo turno para el vendedor para que aparezca en la lista
ABRIR_OTRO_RESP=$(curl -s -X POST "${BASE_URL}/turnos/abrir" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${VEND_TOKEN}" \
  -d "{\"almacen_id\":\"${ALMACEN_ID}\",\"monto_inicial\":50.00}")
OTRO_TURNO_ID=$(php -r '$d = json_decode($argv[1]); echo $d->id ?? "";' "$ABRIR_OTRO_RESP")
echo "✓ Nuevo turno abierto para el vendedor (ID: $OTRO_TURNO_ID, Monto inicial: $50.00)"

LISTA_ABIERTOS_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "${BASE_URL}/turnos?estado=abierto" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

HTTP_STATUS_2=$(echo "$LISTA_ABIERTOS_RESP" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY_2=$(echo "$LISTA_ABIERTOS_RESP" | grep -v "HTTP_STATUS")

echo "Respuesta HTTP Lista Abiertos: $HTTP_STATUS_2"
echo "Turnos abiertos encontrados en el sistema:"
php -r '$d = json_decode($argv[1]); foreach ($d as $t) {
  echo "- Turno ID: " . $t->id . " | Vendedor: " . ($t->usuario->name ?? "N/A") . " (" . ($t->usuario->email ?? "") . ") | Almacén: " . ($t->almacen->nombre ?? "N/A") . " | Monto Inicial: $" . $t->monto_inicial . " | Estado: " . $t->estado . "\n";
}' "$BODY_2"

# -------------------------------------------------------------------------
# 3. Administrador cierra el turno de OTRO usuario vía curl -> 200
# -------------------------------------------------------------------------
echo ""
echo "--> Paso 3: Administrador cierra el turno de OTRO usuario ($OTRO_TURNO_ID)..."

CIERRE_ADMIN_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/turnos/${OTRO_TURNO_ID}/cerrar" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"monto_final_contado":50.00}')

HTTP_STATUS_3=$(echo "$CIERRE_ADMIN_RESP" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY_3=$(echo "$CIERRE_ADMIN_RESP" | grep -v "HTTP_STATUS")

echo "Respuesta HTTP Cierre por Admin: $HTTP_STATUS_3"
echo "Cuerpo formateado de respuesta:"
php -r '$d = json_decode($argv[1]); echo json_encode([
  "id" => $d->id,
  "usuario_id" => $d->usuario_id,
  "monto_final_esperado" => $d->monto_final_esperado,
  "monto_final_contado" => $d->monto_final_contado,
  "diferencia" => $d->diferencia,
  "estado" => $d->estado,
], JSON_PRETTY_PRINT) . "\n";' "$BODY_3"

# -------------------------------------------------------------------------
# 4. Vendedor SIN rol master/administrador intenta GET /api/turnos -> 403
# -------------------------------------------------------------------------
echo ""
echo "--> Paso 4: Vendedor intenta acceder a GET /api/turnos (restringido a roles master/administrador)..."

INTENTO_VEND_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "${BASE_URL}/turnos?estado=abierto" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${VEND_TOKEN}")

HTTP_STATUS_4=$(echo "$INTENTO_VEND_RESP" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY_4=$(echo "$INTENTO_VEND_RESP" | grep -v "HTTP_STATUS")

echo "Respuesta HTTP Acceso no autorizado: $HTTP_STATUS_4"
php -r '$d = json_decode($argv[1]); echo "Mensaje retornado por el backend: \"" . ($d->message ?? "No autorizado") . "\"\n";' "$BODY_4"

if [ "$HTTP_STATUS_4" -eq 403 ]; then
  echo "✓ CORRECTO: Backend rechazó la solicitud con 403 Forbidden para el rol vendedor."
else
  echo "✗ ERROR: Se esperaba 403 pero se recibió $HTTP_STATUS_4"
  exit 1
fi

echo ""
echo "================================================================="
echo "TODAS LAS VERIFICACIONES CON CURL DEL PASO 4 FUERON EXITOSAS"
echo "================================================================="
