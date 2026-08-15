import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
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
      WHERE "createdAt" BETWEEN ${start} AND ${end}
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
      WHERE s."createdAt" BETWEEN ${start} AND ${end}
      GROUP BY p.name ORDER BY total DESC LIMIT 10`;

    return {
      from: start,
      to: end,
      groupBy,
      totals,
      series: rows.map((r) => ({ ...r, ventas: Number(r.ventas) })),
      topProducts: top.map((t) => ({ ...t, unidades: Number(t.unidades) })),
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
      where: { createdAt: { gte: start, lte: end } },
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
    const clp = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');
    const printer = new PdfPrinter({
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    });
    const doc = printer.createPdfKitDocument({
      defaultStyle: { font: 'Helvetica', fontSize: 9 },
      content: [
        { text: 'Ventra — Reporte de ventas', bold: true, fontSize: 14 },
        {
          text: `Período: ${s.from.toLocaleDateString('es-CL')} a ${s.to.toLocaleDateString('es-CL')}`,
          margin: [0, 2, 0, 10],
        },
        {
          columns: [
            { text: `Ventas: ${s.totals.ventas}`, bold: true },
            { text: `Neto: ${clp(s.totals.neto)}` },
            { text: `IVA: ${clp(s.totals.iva)}` },
            { text: `Total: ${clp(s.totals.total)}`, bold: true },
          ],
          margin: [0, 0, 0, 10],
        },
        { text: 'Por día', bold: true, margin: [0, 6, 0, 4] },
        {
          table: {
            widths: ['*', 60, 90],
            body: [
              ['Día', 'Ventas', 'Total'].map((t) => ({ text: t, bold: true })),
              ...s.series.map((r) => [
                new Date(r.bucket).toLocaleDateString('es-CL'),
                { text: String(r.ventas), alignment: 'right' },
                { text: clp(r.total), alignment: 'right' },
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
        },
        { text: 'Top productos', bold: true, margin: [0, 12, 0, 4] },
        {
          table: {
            widths: ['*', 60, 90],
            body: [
              ['Producto', 'Unidades', 'Total'].map((t) => ({ text: t, bold: true })),
              ...s.topProducts.map((t) => [
                t.name,
                { text: String(t.unidades), alignment: 'right' },
                { text: clp(t.total), alignment: 'right' },
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
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
