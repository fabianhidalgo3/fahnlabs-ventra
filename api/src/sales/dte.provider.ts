import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { mkdirSync, createWriteStream } from 'fs';
import {
  VENTRA_LOGO_SVG,
  VENTRA_BLUE,
  VENTRA_INK,
  VENTRA_GRAY,
  VENTRA_GRAY_LIGHT,
  clp,
} from '../shared/branding';
// pdfmake server-side con fuentes estándar PDF (no requiere archivos de fuente)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');

export interface BoletaData {
  folio: number;
  saleNumber: number;
  createdAt: Date;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
  neto: number;
  iva: number;
  discount: number;
  total: number;
  payment: string;
  tendered?: number;
  change?: number;
}

/**
 * Interfaz del emisor de DTE. La implementación simulada genera folio local y
 * PDF de boleta. Para producción, reemplazar por un provider que use el SII
 * (SDK emisso-sii con certificado .p12) o un intermediario (OpenFactura,
 * SimpleAPI, LibreDTE) — misma interfaz, sin tocar el resto del sistema.
 */
export abstract class DteProvider {
  abstract emitirBoleta(data: BoletaData): Promise<{ pdfPath: string; provider: string }>;
}

const UPLOADS = process.env.UPLOADS_DIR ?? './uploads';

@Injectable()
export class DteSimuladoProvider extends DteProvider {
  private printer = new PdfPrinter({
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
  });

  async emitirBoleta(d: BoletaData) {
    mkdirSync(join(UPLOADS, 'boletas'), { recursive: true });
    const rel = `/uploads/boletas/boleta-${d.folio}.pdf`;

    // Fila etiqueta/valor para la sección de totales (alineada a la derecha)
    const totalRow = (
      label: string,
      value: string,
      opts: { bold?: boolean; fontSize?: number; color?: string } = {},
    ) => ({
      columns: [
        { text: label, alignment: 'left', color: opts.color ?? VENTRA_GRAY, ...opts },
        { text: value, alignment: 'right', color: opts.color ?? VENTRA_INK, ...opts },
      ],
      margin: [0, 1, 0, 1] as [number, number, number, number],
    });

    const divider = (margin: [number, number, number, number] = [0, 6, 0, 6]) => ({
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 206,
          y2: 0,
          lineWidth: 0.5,
          lineColor: VENTRA_GRAY_LIGHT,
        },
      ],
      margin,
    });

    const doc = this.printer.createPdfKitDocument({
      pageSize: { width: 226, height: 'auto' }, // 80mm térmica
      pageMargins: [10, 14, 10, 14],
      defaultStyle: { font: 'Helvetica', fontSize: 8, color: VENTRA_INK },
      content: [
        // ── Logo ─────────────────────────────────────────────
        { svg: VENTRA_LOGO_SVG, width: 110, alignment: 'center', margin: [0, 0, 0, 10] },

        // ── Identificación del documento (folio en recuadro) ─
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    {
                      text: 'BOLETA ELECTRÓNICA',
                      bold: true,
                      fontSize: 9,
                      alignment: 'center',
                      characterSpacing: 0.5,
                    },
                    {
                      text: `N° ${d.folio}`,
                      bold: true,
                      fontSize: 11,
                      alignment: 'center',
                      color: VENTRA_BLUE,
                      margin: [0, 2, 0, 0],
                    },
                    {
                      text: 'SIMULADA',
                      fontSize: 6,
                      alignment: 'center',
                      color: VENTRA_GRAY,
                      margin: [0, 2, 0, 0],
                    },
                  ],
                  margin: [4, 5, 4, 5],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => VENTRA_INK,
            vLineColor: () => VENTRA_INK,
          },
          margin: [20, 0, 20, 8],
        },
        {
          columns: [
            { text: `Venta N° ${d.saleNumber}`, color: VENTRA_GRAY, fontSize: 7.5 },
            {
              text: d.createdAt.toLocaleString('es-CL'),
              alignment: 'right',
              color: VENTRA_GRAY,
              fontSize: 7.5,
            },
          ],
          margin: [0, 0, 0, 8],
        },

        // ── Detalle de ítems ─────────────────────────────────
        {
          table: {
            headerRows: 1,
            widths: ['*', 20, 42, 46],
            body: [
              [
                { text: 'PRODUCTO', bold: true, fontSize: 6.5, color: VENTRA_GRAY },
                {
                  text: 'CANT',
                  bold: true,
                  fontSize: 6.5,
                  color: VENTRA_GRAY,
                  alignment: 'right',
                },
                {
                  text: 'PRECIO',
                  bold: true,
                  fontSize: 6.5,
                  color: VENTRA_GRAY,
                  alignment: 'right',
                },
                {
                  text: 'TOTAL',
                  bold: true,
                  fontSize: 6.5,
                  color: VENTRA_GRAY,
                  alignment: 'right',
                },
              ],
              ...d.items.map((i) => [
                { text: i.name },
                { text: String(i.quantity), alignment: 'right' },
                { text: clp(i.unitPrice), alignment: 'right' },
                { text: clp(i.total), alignment: 'right' },
              ]),
            ],
          },
          layout: {
            hLineWidth: (i: number, node: any) =>
              i === 0 || i === 1 || i === node.table.body.length ? 0.5 : 0,
            vLineWidth: () => 0,
            hLineColor: () => VENTRA_GRAY_LIGHT,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 3,
            paddingBottom: () => 3,
          },
        },

        // ── Totales ──────────────────────────────────────────
        { text: '', margin: [0, 3, 0, 0] },
        ...(d.discount > 0 ? [totalRow('Descuento', `-${clp(d.discount)}`)] : []),
        totalRow('Neto', clp(d.neto)),
        totalRow('IVA 19%', clp(d.iva)),
        {
          columns: [
            { text: 'TOTAL', bold: true, fontSize: 11 },
            {
              text: clp(d.total),
              bold: true,
              fontSize: 11,
              alignment: 'right',
              color: VENTRA_BLUE,
            },
          ],
          margin: [0, 4, 0, 2],
        },

        // ── Pago / vuelto ────────────────────────────────────
        divider(),
        totalRow('Medio de pago', d.payment, { color: VENTRA_INK }),
        ...(d.tendered != null
          ? [
              totalRow('Paga con', clp(d.tendered)),
              totalRow('Vuelto', clp(d.change ?? 0), { bold: true, color: VENTRA_INK }),
            ]
          : []),

        // ── Pie ──────────────────────────────────────────────
        divider([0, 8, 0, 6]),
        {
          text: 'Documento de prueba — no válido ante el SII',
          alignment: 'center',
          fontSize: 6.5,
          color: VENTRA_GRAY,
        },
        {
          text: 'Ventra · FHAN Labs',
          alignment: 'center',
          fontSize: 6.5,
          color: VENTRA_GRAY,
          margin: [0, 2, 0, 0],
        },
      ],
    });

    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(join(UPLOADS, 'boletas', `boleta-${d.folio}.pdf`));
      doc.pipe(stream);
      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    return { pdfPath: rel, provider: 'simulado' };
  }
}
