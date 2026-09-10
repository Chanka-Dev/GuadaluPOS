# 🛒 GuadaluPOS

<p align="center">
  <img src="https://img.shields.io/badge/Versi%C3%B3n-1.2.0--production-emerald?style=for-the-badge&logo=git" alt="Versión">
  <img src="https://img.shields.io/badge/Estado-En_Producci%C3%B3n-blue?style=for-the-badge" alt="Estado">
  <img src="https://img.shields.io/badge/Backend-Laravel_12-FF2D20?style=for-the-badge&logo=laravel" alt="Laravel">
  <img src="https://img.shields.io/badge/Frontend-Angular_19-DD0031?style=for-the-badge&logo=angular" alt="Angular">
  <img src="https://img.shields.io/badge/Base_de_Datos-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Modo-Offline--First-F59E0B?style=for-the-badge" alt="Offline-First">
</p>

---

## 📖 ¿Qué es GuadaluPOS?

**GuadaluPOS** es un sistema integral de **Punto de Venta (POS) y Gestión de Inventarios por Lotes**, diseñado específicamente para negocios comerciales, distribuidoras y puestos de venta de alta rotación (como bebidas, abarrotes y productos empaquetados).

El sistema resuelve las problemáticas críticas de los comercios reales:
1. **Doble modalidad de venta**: Venta minorista por unidades sueltas y venta mayorista por paquetes completos con precios diferenciados.
2. **Trazabilidad estricta por Lotes y Vencimientos (FEFO)**: Despacho automático de la mercadería más próxima a vencer o selección manual para ventas mayoristas negociadas.
3. **Caja Compartida**: Permite que dos o más operadores en un mismo puesto compartan la misma gaveta física y fondo inicial sin duplicar caja, manteniendo la trazabilidad exacta de quién vendió cada producto.
4. **Cuadre Contable Preciso (Efectivo vs QR/Banco)**: Separa el dinero físico que debe existir en la gaveta del dinero digital cobrado vía QR o transferencia bancaria.
5. **Auditoría y Corrección en Vivo**: Vista de historial de ventas con corrección inmediata del método de cobro ante confusiones en mostrador.
6. **Márgenes y Utilidades en Tiempo Real**: Cálculo exacto del costo de adquisición según el lote vendido, ganancia neta y margen comercial (protegido exclusivamente para roles directivos).
7. **Resiliencia Offline**: Capacidad de registrar ventas sin conexión a internet mediante IndexedDB local y sincronización inteligente automática al recuperar conectividad.

---

## 🚀 Estado del Proyecto y Versión Actual

| Atributo | Detalle |
| :--- | :--- |
| **Versión Actual** | `v1.2.0 (Stable / Production)` |
| **Etapa de Desarrollo** | **En Producción Activa**: Operando en vivo con inventario real, lotes vigentes y soporte multi-almacén. |
| **Arquitectura** | Desacoplada: **Laravel 12 REST API** + **Angular 19 SPA Standalone con Signals** |
| **Documentación Técnica** | Consulta [ARCHITECTURE.md](./ARCHITECTURE.md) para diagramas de datos, flujo offline y detalles internos. |

---

## ✨ Características Principales

### 📦 1. Gestión Inteligente de Inventario y Lotes
- **Unidades y Paquetes**: Configuración por producto de cuántas unidades contiene cada paquete y si permite venta empaquetada.
- **Ingreso Simplificado**: Registro de compras indicando cantidad de paquetes y precio por paquete; el sistema calcula automáticamente las unidades totales y el costo unitario de compra.
- **Despacho FEFO / Lote Específico**: Las ventas descuentan automáticamente del lote con vencimiento más próximo, o permiten al supervisor elegir el lote origen en ventas al por mayor.
- **Transferencias entre Almacenes**: Movimientos de stock entre almacén central y puestos de venta por paquetes completos y unidades adicionales.

### 👥 2. Turnos de Caja y Modalidad Compartida
- **Apertura de Turno**: Registro de fondo inicial en efectivo y selección de almacén de despacho.
- **Detección de Caja Abierta**: Si otro compañero ya inició el turno en ese almacén, el segundo operador puede unirse con un solo clic a la misma caja física.
- **Desglose al Cierre**: El arqueo presenta el dinero recaudado en la gaveta y el desglose de ventas por cada operador.

### 💰 3. Cuadre Contable y Transparencia Financiera
- **Segregación de Canales**:
  - 💵 **Efectivo Físico**: `Monto Inicial + Ventas en Efectivo` = Dinero exacto esperado en el cajón.
  - 📱 **QR / Transferencia**: Registrado como dinero directo en cuenta bancaria (no afecta la gaveta física).
  - 💳 **Tarjetas**: Liquidación electrónica vía terminal POS.
- **Historial de Ventas (`/ventas`)**: Búsqueda por ticket, cliente, vendedor o producto; filtros por turno, día o almacén.
- **Corrección de Cobro**: Si una venta se marcó como efectivo pero fue por QR, se corrige en segundos recalculando el arqueo de caja de inmediato.

### 💎 4. Analítica de Costos y Utilidades (Confidencialidad por Roles)
- **Cálculo de Costo Real**: Basado en el `precio_compra_unitario` del lote de origen.
- **KPIs Directivos**: Costo de mercadería vendida, Ganancia Neta y Margen Comercial % sobre las ventas filtradas.
- **Privacidad**: Ocultamiento estricto a nivel de API y Frontend para cajeros en mostrador (`rol: vendedor`). Solo visible para `master`, `administrador` y `supervisor`.

### 📶 5. Operatividad Offline-First
- **Almacenamiento Local**: Uso de `IndexedDB` y `localStorage` para catálogos y colas de ventas locales con UUID único `client_uuid`.
- **Sincronización Transaccional**: Detección automática del evento `online` con conciliación idempotente contra la base de datos central.

---

## 🛠️ Stack Tecnológico

### Backend
- **Framework**: [Laravel 12.x](https://laravel.com/) (PHP 8.2+)
- **Base de Datos**: [PostgreSQL 16](https://www.postgresql.org/)
- **Autenticación**: [Laravel Sanctum](https://laravel.com/docs/sanctum) (Tokens SPA con cookies seguras)
- **Control de Acceso**: [Spatie Laravel-Permission](https://spatie.be/docs/laravel-permission) (`master`, `administrador`, `supervisor`, `vendedor`)

### Frontend
- **Framework**: [Angular 19.x](https://angular.dev/) (Standalone Components, Signals & Control Flow)
- **Estilos**: Vanilla CSS moderno con tema Dark Mode, Glassmorphism y diseño responsivo adaptado a pantallas táctiles y escritorios.
- **PWA & Offline**: Service Worker de Angular + IndexedDB (`idb`).
- **Pruebas**: Vitest / Angular Testing TestBed (32 pruebas unitarias con 100% de aprobación).

### Infraestructura & Despliegue
- **Servidor Web**: Nginx con Reverse Proxy para API y soporte de SPA HTML5 routing.
- **SO**: Linux Ubuntu LTS.

---

## 📂 Estructura del Repositorio

```text
GuadaluPOS/
├── backend/                  # API REST Laravel 12
│   ├── app/
│   │   ├── Http/Controllers/ # Controladores (Venta, Turno, Lote, Producto, etc.)
│   │   ├── Models/          # Modelos Eloquent y relaciones contables
│   │   └── Services/        # Lógica de dominio (VentaService, TurnoCajaService)
│   ├── database/
│   │   ├── migrations/      # Esquema de base de datos PostgreSQL
│   │   └── seeders/         # Datos iniciales (Usuarios, Roles, Almacenes)
│   └── routes/api.php       # Endpoints REST protegidos con Sanctum
│
├── frontend/                 # Aplicación SPA Angular 19
│   ├── src/app/
│   │   ├── core/            # Servicios (Sync, Turno, Venta, Auth) y Modelos
│   │   ├── layout/          # Barra de navegación y perfil de usuario
│   │   └── pages/           # Vistas principales:
│   │       ├── catalogo/    # Productos, Lotes y Transferencias
│   │       ├── inicio/      # Dashboard de bienvenida
│   │       ├── turno/       # Arqueo, fondo y cierre de caja
│   │       ├── usuarios/    # Gestión de accesos y roles
│   │       ├── venta/       # Terminal Punto de Venta (POS)
│   │       └── ventas/      # Historial de ventas, auditoría y utilidades
│   └── angular.json         # Configuración y presupuestos de empaquetado
│
├── ARCHITECTURE.md           # Especificación técnica y arquitectura interna
├── README.md                 # Este documento
└── .gitignore                # Reglas de exclusión para secrets, dist y vendor
```

---

## ⚙️ Instalación y Puesta en Marcha

### Requisitos Previos
- PHP 8.2+ con extensiones `pdo_pgsql`, `mbstring`, `bcmath`, `curl`.
- Composer 2.x
- Node.js 20+ y npm 10+
- PostgreSQL 15+

### 1. Configuración del Backend
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate

# Configurar credenciales de base de datos en .env
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=guadalupos
# DB_USERNAME=tu_usuario
# DB_PASSWORD=tu_contraseña

php artisan migrate --seed
```

### 2. Configuración del Frontend
```bash
cd ../frontend
npm install
npm run build -- --configuration production
```

### 3. Ejecución de Pruebas Automatizadas
```bash
# Pruebas Frontend
cd frontend
npm test -- --watch=false

# Pruebas Backend
cd ../backend
php artisan test
```

---

## 👥 Roles y Permisos del Sistema

1. **Master / Propietario**: Acceso total al sistema, configuración de almacenes, costos de compra, márgenes de utilidad, gestión de usuarios de cualquier nivel y modificación de precios en ventas mayoristas.
2. **Administrador**: Gestión operativa, altas de inventario y lotes, auditoría de ventas, utilidades y usuarios (excepto master).
3. **Supervisor**: Control de inventario, transferencias entre almacenes, venta mayorista con modificación autorizada de precios y auditoría de utilidades.
4. **Vendedor**: Operación ágil en mostrador: apertura/cierre o unión a turno compartido, cobro de ventas en efectivo/QR/tarjeta y consulta de tickets del turno sin acceso a costos ni utilidades.

---

## 📄 Licencia

Este proyecto es software privado desarrollado por **Chanka-Dev**. Todos los derechos reservados.
