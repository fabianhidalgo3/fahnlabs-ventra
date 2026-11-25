# Ventra — Hoja de contexto

Sistema de ventas multinegocio (POS para minimarkets) de **FHAN Labs**.
Fecha de este snapshot: 2026-10-13.

## Stack

| Capa | Tecnología | Puerto |
|---|---|---|
| API | NestJS 11 + Prisma 6 + PostgreSQL 16 | **3010** |
| Web admin/POS | Angular 21 standalone + Tailwind 4 (base TailAdmin) + AG Grid 36 + ApexCharts | **4310** |
| Móvil | Ionic (totales del día + inventario con escáner) | 8101 |
| Base de datos | Postgres 16 en Docker (`admin` / `adminpass`, db `ventra`) | **5433** |
| IA asistente | Ollama local `llama3.1:8b` | 11434 |
| WhatsApp | whatsapp-web.js + LocalAuth (sesión en `api/.wwebjs_auth`, excluida del zip) | — |

Versiones ancladas (no subir sin revisar): `prisma@6` / `@prisma/client@6` (la 7 rompe config), `pdfmake@0.2` (la 0.3 elimina PdfPrinter).

## Estructura

```
ventra/
├── api/        NestJS: auth, products, sales, cash, fiado, promotions,
│               purchase-docs, inventory, reports, negocios, assistant,
│               whatsapp, batches. Prisma en api/prisma (schema + seeds).
├── web/        Angular: src/app/core (api/auth/theme/viewport/confirm/grid/charts),
│               shared/layout (sidebar colapsable + top-nav móvil),
│               pages/ventra (pos, productos, producto-detalle, ventas, caja,
│               fiado, ofertas, documentos, usuarios, negocios, reportes,
│               asistente, login). PWA: public/manifest.webmanifest + icons.
└── mobile/     App Ionic.
```

## Cómo levantar

```bash
# 1. Postgres (Docker)
docker start <contenedor-postgres-5433>   # o docker run postgres:16 en :5433

# 2. API
cd api && npm install && npx prisma migrate deploy && node prisma/seed.js
npm run start:dev          # :3010

# 3. Web (proxy /api y /uploads → :3010)
cd web && npm install
npx ng serve --port 4310 --proxy-config proxy.conf.json --host 0.0.0.0
```

Seeds opcionales en `api/prisma/`: `seed-users.js`, `seed-promos.js`,
`seed-products-masivo.js` (500 productos), `seed-imagenes-reales.js`
(fotos reales desde Open Food Facts, lento: 6,5 s por request).

## Usuarios demo

| Email | Pass | Rol | Negocio |
|---|---|---|---|
| admin@fhanlabs.cl | admin123 | ADMIN | FHAN Market |
| vendedor@fhanlabs.cl | vendedor123 | VENDEDOR | FHAN Market |

Hay además un SUPERADMIN y un segundo negocio de prueba (Almacén Las Rosas / María)
para validar el aislamiento multi-tenant. **Cambiar estas contraseñas antes de
exponer la app públicamente.**

## Modelo / reglas de negocio clave

- **Multi-tenant**: `businessId` en casi todas las tablas; uniques compuestos
  (`[businessId, sku]`, `[businessId, barcode]`, `[businessId, name]`). Todo método
  de servicio recibe `biz` como primer parámetro desde `user.businessId`.
  SUPERADMIN salta el RolesGuard y gestiona negocios en `/negocios`.
- **POS**: no vende con caja cerrada (abre turno rápido desde el banner).
  Descuentos 5 %/10 % + promociones (PORCENTAJE / PACK_PRECIO / NXM), fiado
  (requiere cliente), boleta 80 mm en PDF (pdfmake) con DTE simulado (SII pendiente
  de proveedor real vía `dte.provider.ts`).
- **Fiado**: clientes con deuda, abonos capados a la deuda, recordatorio por
  WhatsApp (link wa.me). Nombres de cliente únicos por negocio.
- **CLP**: directiva `clpMoneda` — puntos de miles en vivo, se guarda entero.
- **Guías/facturas**: foto → webp 1600px (sharp), grilla paginada con modal de
  detalle editable y descarga.

## Quirks conocidos

- Matar la API: `kill -9 $(lsof -t -iTCP:3010)` (WhatsApp cuelga el SIGTERM).
- WhatsApp "browser already running": el servicio se auto-repara
  (`limpiarSesionBloqueada()`); manual: `pkill -f "wwebjs_auth/[s]ession"` + borrar `Singleton*`.
- `ng serve` queda obsoleto tras editar archivos por scripts externos → reiniciar.
- Chrome: `overflow-hidden` en `<button>` colapsa la altura automática.
- Postgres: un valor nuevo de enum no se puede usar en la misma transacción de migración.
- Prisma Decimal serializa como string: usar `Number()` antes de comparar.
- Publicación externa: `cloudflared tunnel --url http://localhost:4310`
  (URL rota en cada reinicio; `allowedHosts: ['.trycloudflare.com']` ya configurado).

## Pendientes

- Integración real de boletas electrónicas SII (hay proveedor simulado).
- Repo git local sin remoto (ofrecido push a GitHub privado, sin confirmar).
- Categorías duplicadas "Aseo" vs "Aseo y Hogar" (merge pendiente).
- Contraseñas demo sin rotar.
