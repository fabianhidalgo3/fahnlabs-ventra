# Ventra — by FHAN Labs

Sistema de venta para negocios: inventario, POS con escáner, boleta electrónica, vencimientos, reportes y app móvil.

## Estructura

| Carpeta | Qué es | Puerto |
|---|---|---|
| `api/` | Backend NestJS 11 + Prisma 6 + PostgreSQL | 3010 |
| `web/` | Panel web Angular 20 (template TailAdmin + Tailwind 4) | 4310 |
| `mobile/` | App móvil Ionic 8 + Angular (totales del día + inventario con escáner) | 8101 |

## Requisitos

- Node 20+ (probado con 24)
- PostgreSQL — usa el contenedor Docker local en puerto **5433** (`admin`/`adminpass`), base `ventra`

## Cómo correr

```bash
# API
cd api && npm i && npx prisma migrate dev && node prisma/seed.js && npm run start:dev

# Web
cd web && npm i && npx ng serve --port 4310

# Móvil (navegador)
cd mobile && npm i && npx ng serve --port 8101
```

## Funcionalidades

- **Productos**: CRUD, categorías, imágenes (subida → webp 800px), código de barras EAN-13 interno autogenerado, PNG de barras y QR por producto.
- **Precios masivos**: ajuste porcentual (global o por categoría) e importación CSV/XLSX (col 1 = SKU o código, col 2 = precio nuevo). Todo queda auditado en `PriceLog`.
- **Vencimientos**: lotes por producto con fecha; alertas por nivel — crítico ≤7 días, alerta ≤15, próximo ≤30 — con badges en tablas.
- **POS**: input siempre listo para pistola lectora (funciona como teclado), carrito, IVA 19% incluido en precios (neto = total/1.19), medios de pago.
- **Boleta electrónica**: se emite al cobrar, con folio y PDF 80mm. La emisión está detrás de la interfaz `DteProvider` (`api/src/sales/dte.provider.ts`); hoy corre `DteSimuladoProvider`. Para producción real con SII: implementar un provider con certificado .p12 (SDK `emisso-sii`) o un intermediario (OpenFactura, SimpleAPI, LibreDTE) sin tocar el resto.
- **Reportes**: resúmenes por día/semana/mes con rango de fechas, top productos, export **XLSX** y **PDF**.
- **Inventario móvil**: conteos abiertos/cerrados, escaneo por cámara (BarcodeDetector) o input manual, diferencia esperado vs contado, cierre con o sin ajuste de stock.

## App móvil en teléfono real

1. Cambiar `API_URL` en `mobile/src/app/core/api.service.ts` por la IP LAN del Mac (ej. `http://192.168.1.20:3010/api`).
2. `npx ionic capacitor add ios` (o `android`), `npx ionic capacitor run ios`.
3. Para escáner nativo de mejor calidad: `@capacitor-mlkit/barcode-scanning`.

## Navegación del código

El grafo de código se genera con `graphify update . --no-cluster` (salida en `graphify-out/graph.json`).

## Configuración

`api/.env` (no se versiona) define `DATABASE_URL` y los secretos de la API. La sesión de WhatsApp Web
(`api/.wwebjs_auth/`) se crea al vincular el teléfono y tampoco se versiona.

## Autor

© 2026 Fabián Hidalgo · FAHNLABS. Todos los derechos reservados.
