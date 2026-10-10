import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import {
  VENTRA_LOGO_SVG,
  VENTRA_BLUE,
  VENTRA_INK,
  VENTRA_GRAY,
  VENTRA_GRAY_LIGHT,
  VENTRA_BG_SOFT,
  VENTRA_BG_KPI,
  clp,
} from '../shared/branding';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');

export type GroupBy = 'day' | 'week' | 'month';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private range(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(new Date().toDateString());
    const end = to ? new Date(to + 'T23:59:59.999') : new Date();
    return { start, end };
  }

  async summary(from?: string, to?: string, groupBy: GroupBy = 'day') {
    const { start, end } = this.range(from, to);
    const rows = await this.prisma.$queryRaw<
      { bucket: Date; ventas: bigint; total: number; neto: number; iva: number }[]
    >`
      SELECT date_trunc(${groupBy}, "createdAt") AS bucket,
             count(*)::bigint AS ventas,
             coalesce(sum(total), 0)::float AS total,
             coalesce(sum(subtotal), 0)::float AS neto,
             coalesce(sum(tax), 0)::float AS iva
      FROM "Sale"
      WHERE "createdAt" BETWEEN ${start} AND ${end} AND "voidedAt" IS NULL
      GROUP BY bucket ORDER BY bucket`;

    const totals = rows.reduce(
      (a, r) => ({
        ventas: a.ventas + Number(r.ventas),
        total: a.total + r.total,
        neto: a.neto + r.neto,
        iva: a.iva + r.iva,
      }),
      { ventas: 0, total: 0, neto: 0, iva: 0 },
    );

    const top = await this.prisma.$queryRaw<
      { name: string; unidades: bigint; total: number }[]
    >`
      SELECT p.name, sum(si.quantity)::bigint AS unidades, sum(si.total)::float AS total
      FROM "SaleItem" si
      JOIN "Sale" s ON s.id = si."saleId"
      JOIN "Product" p ON p.id = si."productId"
      WHERE s."createdAt" BETWEEN ${start} AND ${end} AND s."voidedAt" IS NULL
      GROUP BY p.name ORDER BY total DESC LIMIT 10`;

    const byPaymentRaw = await this.prisma.sale.groupBy({
      by: ['payment'],
      where: { createdAt: { gte: start, lte: end }, voidedAt: null },
      _count: true,
      _sum: { total: true },
    });

    return {
      from: start,
      to: end,
      groupBy,
      totals,
      series: rows.map((r) => ({ ...r, ventas: Number(r.ventas) })),
      topProducts: top.map((t) => ({ ...t, unidades: Number(t.unidades) })),
      byPayment: byPaymentRaw.map((p) => ({
        payment: p.payment,
        ventas: p._count,
        total: Number(p._sum.total ?? 0),
      })),
    };
  }

  async today() {
    const today = new Date().toISOString().slice(0, 10);
    const s = await this.summary(today, today, 'day');
    const lastSales = await this.prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { items: { include: { product: true } }, boleta: true },
    });
    return { ...s, lastSales };
  }

  async exportXlsx(from?: string, to?: string): Promise<Buffer> {
    const { start, end } = this.range(from, to);
    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end }, voidedAt: null },
      include: { items: { include: { product: true } }, boleta: true },
      orderBy: { createdAt: 'asc' },
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Ventas');
    ws.columns = [
      { header: 'N° Venta', key: 'number', width: 10 },
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'Folio boleta', key: 'folio', width: 12 },
      { header: 'Producto', key: 'producto', width: 32 },
      { header: 'Cantidad', key: 'cantidad', width: 10 },
      { header: 'Precio unit.', key: 'precio', width: 12 },
      { header: 'Total línea', key: 'totalLinea', width: 12 },
      { header: 'Total venta', key: 'total', width: 12 },
      { header: 'Pago', key: 'pago', width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const s of sales)
      for (const [i, it] of s.items.entries())
        ws.addRow({
          number: s.number,
          fecha: s.createdAt.toLocaleString('es-CL'),
          folio: s.boleta?.folio,
          producto: it.product.name,
          cantidad: it.quantity,
          precio: Number(it.unitPrice),
          totalLinea: Number(it.total),
          total: i === 0 ? Number(s.total) : undefined,
          pago: i === 0 ? s.payment : undefined,
        });
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async exportPdf(from?: string, to?: string): Promise<Buffer> {
    const s = await this.summary(from, to, 'day');
    const printer = new PdfPrinter({
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    });

    // Celda KPI con fondo gris claro y valor destacado
    const kpi = (label: string, value: string) => ({
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                {
                  text: label.toUpperCase(),
                  fontSize: 7.5,
                  color: VENTRA_GRAY,
                  characterSpacing: 0.5,
                },
                { text: value, bold: true, fontSize: 13, color: VENTRA_INK, margin: [0, 3, 0, 0] },
              ],
              margin: [10, 8, 10, 8],
              fillColor: VENTRA_BG_KPI,
            },
          ],
        ],
      },
      layout: 'noBorders',
    });

    // Layout de tabla: encabezado azul, zebra striping suave, sin líneas verticales
    const brandedTableLayout = {
      hLineWidth: (i: number, node: any) =>
        i === 0 || i === 1 || i === node.table.body.length ? 0.5 : 0,
      vLineWidth: () => 0,
      hLineColor: () => VENTRA_GRAY_LIGHT,
      fillColor: (rowIndex: number) =>
        rowIndex === 0 ? VENTRA_BLUE : rowIndex % 2 === 0 ? VENTRA_BG_SOFT : null,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    };
    const th = (text: string, alignment: 'left' | 'right' = 'left') => ({
      text,
      bold: true,
      color: '#FFFFFF',
      fontSize: 9,
      alignment,
    });

    const generado = new Date().toLocaleString('es-CL');

    const doc = printer.createPdfKitDocument({
      pageSize: 'A4',
      pageMargins: [40, 42, 40, 60],
      defaultStyle: { font: 'Helvetica', fontSize: 9, color: VENTRA_INK },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          {
            text: `Generado el ${generado} · Ventra by FHAN Labs`,
            fontSize: 7.5,
            color: VENTRA_GRAY,
          },
          {
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'right',
            fontSize: 7.5,
            color: VENTRA_GRAY,
          },
        ],
        margin: [40, 24, 40, 0],
      }),
      content: [
        // ── Encabezado: logo + título/período ────────────────
        {
          columns: [
            { svg: VENTRA_LOGO_SVG, width: 120, margin: [0, 2, 0, 0] },
            {
              stack: [
                { text: 'Reporte de ventas', bold: true, fontSize: 16, alignment: 'right' },
                {
                  text: `Período: ${s.from.toLocaleDateString('es-CL')} — ${s.to.toLocaleDateString('es-CL')}`,
                  alignment: 'right',
                  color: VENTRA_GRAY,
                  margin: [0, 4, 0, 0],
                },
              ],
            },
          ],
        },
        {
          canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: VENTRA_BLUE },
          ],
          margin: [0, 12, 0, 16],
        },

        // ── KPIs ─────────────────────────────────────────────
        {
          columns: [
            kpi('Ventas', String(s.totals.ventas)),
            kpi('Neto', clp(s.totals.neto)),
            kpi('IVA', clp(s.totals.iva)),
            kpi('Total', clp(s.totals.total)),
          ],
          columnGap: 10,
          margin: [0, 0, 0, 20],
        },

        // ── Por día ──────────────────────────────────────────
        { text: 'Por día', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 70, 100],
            body: [
              [th('Día'), th('Ventas', 'right'), th('Total', 'right')],
              ...s.series.map((r) => [
                new Date(r.bucket).toLocaleDateString('es-CL'),
                { text: String(r.ventas), alignment: 'right' },
                { text: clp(r.total), alignment: 'right' },
              ]),
            ],
          },
          layout: brandedTableLayout,
        },

        // ── Top productos ────────────────────────────────────
        { text: 'Top productos', bold: true, fontSize: 11, margin: [0, 18, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 70, 100],
            body: [
              [th('Producto'), th('Unidades', 'right'), th('Total', 'right')],
              ...s.topProducts.map((t) => [
                t.name,
                { text: String(t.unidades), alignment: 'right' },
                { text: clp(t.total), alignment: 'right' },
              ]),
            ],
          },
          layout: brandedTableLayout,
        },
      ],
    });
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }
}
