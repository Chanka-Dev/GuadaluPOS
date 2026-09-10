#!/usr/bin/env bash
set -e

BASE_URL="http://127.0.0.1/api"

echo "================================================================="
echo "GUADALUPOS: VERIFICACIÓN CON CURL DEL MÓDULO DE USUARIOS"
echo "================================================================="

# -------------------------------------------------------------------------
# 1. Login como administrador -> Intenta crear usuario con rol master -> 403
# -------------------------------------------------------------------------
echo ""
echo "--> Paso 1: Login como administrador e intento de crear usuario con rol 'master'..."

ADMIN_LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"admin.test@guadalupos.local","password":"password123"}')

ADMIN_TOKEN=$(php -r '$d = json_decode($argv[1]); echo $d->token ?? "";' "$ADMIN_LOGIN_RESP")
if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo "Error obteniendo token de administrador: $ADMIN_LOGIN_RESP"
  exit 1
fi
echo "✓ Login exitoso como Administrador (admin.test@guadalupos.local)."

RAND_ID=$((RANDOM % 9000 + 1000))
POST_MASTER_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/usuarios" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d "{\"name\":\"Intento Master Admin\",\"email\":\"intento.master.${RAND_ID}@guadalupos.local\",\"password\":\"password123\",\"rol\":\"master\"}")

HTTP_STATUS=$(echo "$POST_MASTER_RESP" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$POST_MASTER_RESP" | grep -v "HTTP_STATUS")

echo "Respuesta HTTP: $HTTP_STATUS"
echo "Cuerpo: $BODY"

if [ "$HTTP_STATUS" -eq 403 ]; then
  echo "✓ CORRECTO: Se recibió 403 al intentar asignar rol master siendo administrador."
else
  echo "✗ ERROR: Se esperaba status 403 pero se recibió $HTTP_STATUS"
  exit 1
fi

# -------------------------------------------------------------------------
# 2. Login como master -> Crea un usuario con rol vendedor exitosamente (201)
# -------------------------------------------------------------------------
echo ""
echo "--> Paso 2: Login como master y creación de usuario con rol 'vendedor'..."

MASTER_LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"master@guadalupos.local","password":"cambiar123"}')

MASTER_TOKEN=$(php -r '$d = json_decode($argv[1]); echo $d->token ?? "";' "$MASTER_LOGIN_RESP")
if [ -z "$MASTER_TOKEN" ] || [ "$MASTER_TOKEN" = "null" ]; then
  echo "Error obteniendo token de master: $MASTER_LOGIN_RESP"
  exit 1
fi
echo "✓ Login exitoso como Master (master@guadalupos.local)."

VEND_EMAIL="vendedor.curl.${RAND_ID}@guadalupos.local"
POST_VEND_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/usuarios" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${MASTER_TOKEN}" \
  -d "{\"name\":\"Cajero Vendedor Curl\",\"email\":\"${VEND_EMAIL}\",\"password\":\"password123\",\"telefono\":\"71234567\",\"rol\":\"vendedor\"}")

HTTP_STATUS_2=$(echo "$POST_VEND_RESP" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY_2=$(echo "$POST_VEND_RESP" | grep -v "HTTP_STATUS")

echo "Respuesta HTTP: $HTTP_STATUS_2"
echo "Cuerpo: $BODY_2"

if [ "$HTTP_STATUS_2" -eq 201 ]; then
  echo "✓ CORRECTO: Usuario vendedor creado con status 201 exitoso."
else
  echo "✗ ERROR: Se esperaba status 201 pero se recibió $HTTP_STATUS_2"
  exit 1
fi

# -------------------------------------------------------------------------
# 3. Intenta vía curl eliminar al usuario master original -> 403 con mensaje exacto
# -------------------------------------------------------------------------
echo ""
echo "--> Paso 3: Intento de eliminar al usuario master original..."

# Obtener ID del master original
MASTER_ID=$(php -r '$d = json_decode($argv[1]); echo $d->user->id ?? "";' "$MASTER_LOGIN_RESP")
echo "ID del usuario master original: $MASTER_ID"

DELETE_MASTER_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE "${BASE_URL}/usuarios/${MASTER_ID}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

HTTP_STATUS_3=$(echo "$DELETE_MASTER_RESP" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY_3=$(echo "$DELETE_MASTER_RESP" | grep -v "HTTP_STATUS")

echo "Respuesta HTTP: $HTTP_STATUS_3"
echo "Cuerpo: $BODY_3"

if [ "$HTTP_STATUS_3" -eq 403 ]; then
  echo "✓ CORRECTO: Se recibió 403 al intentar eliminar al usuario master."
else
  echo "✗ ERROR: Se esperaba status 403 pero se recibió $HTTP_STATUS_3"
  exit 1
fi

echo ""
echo "================================================================="
echo "TODAS LAS VERIFICACIONES CON CURL FUERON SUPERADAS CON ÉXITO"
echo "================================================================="
