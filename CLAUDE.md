# CLAUDE.md — Ventra (FHAN Labs)

Sistema de ventas multinegocio (POS para minimarkets): inventario, POS con escáner, boleta electrónica, fiado, promociones, reportes, asistente y app móvil.

**Contexto completo (stack, puertos, usuarios demo, reglas de negocio, quirks y pendientes):** @CONTEXTO.md
Al terminar un cambio relevante, actualiza `CONTEXTO.md` (fecha del snapshot, qué cambió, pendientes). Manténlo breve.

## Cómo orientarte sin leer todo

1. Si existe `graphify-out/GRAPH_REPORT.md` o `graphify-out/graph.json`, consúltalo primero para ubicar módulos y relaciones; regenerarlo: `graphify update . --no-cluster`.
2. Mapa rápido:

| Necesito… | Dónde |
|---|---|
| Endpoints y lógica de negocio | `api/src/<módulo>/` (auth, products, sales, cash, fiado, promotions, purchase-docs, inventory, reports, negocios, assistant, whatsapp, batches) |
| Esquema de datos y seeds | `api/prisma/schema.prisma`, `api/prisma/*.js` |
| Emisión de boletas (DTE) | `api/src/sales/dte.provider.ts` |
| Pantallas del panel y POS | `web/src/app/pages/ventra/` |
| Servicios del front (api, auth, tema, gráficos) | `web/src/app/core/` |
| Layout (sidebar, navegación) | `web/src/app/shared/layout/` |
| App móvil | `mobile/src/app/` (URL de la API en `core/api.service.ts`) |

## Reglas que no se deben romper

- Multi-tenant: todo método de servicio recibe `biz` (de `user.businessId`) y filtra por `businessId`.
- Versiones ancladas: `prisma@6` / `@prisma/client@6`, `pdfmake@0.2`.
- Precios con IVA 19 % incluido; montos CLP enteros.
- Interfaz y textos en español.
