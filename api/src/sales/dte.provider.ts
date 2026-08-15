import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { mkdirSync, createWriteStream } from 'fs';
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
  total: number;
  payment: string;
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
    const clp = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

    const doc = this.printer.createPdfKitDocument({
      pageSize: { width: 226, height: 'auto' }, // 80mm térmica
      pageMargins: [10, 10, 10, 10],
      defaultStyle: { font: 'Helvetica', fontSize: 8 },
      content: [
        { text: 'VENTRA by FHAN Labs', bold: true, fontSize: 11, alignment: 'center' },
        { text: 'BOLETA ELECTRÓNICA (SIMULADA)', alignment: 'center', margin: [0, 2] },
        { text: `Folio N° ${d.folio}  ·  Venta N° ${d.saleNumber}`, alignment: 'center' },
        { text: d.createdAt.toLocaleString('es-CL'), alignment: 'center', margin: [0, 0, 0, 6] },
        {
          table: {
            widths: ['*', 22, 45, 50],
            body: [
              ['Producto', 'Cant', 'Precio', 'Total'].map((t) => ({ text: t, bold: true })),
              ...d.items.map((i) => [
                i.name,
                { text: String(i.quantity), alignment: 'right' },
                { text: clp(i.unitPrice), alignment: 'right' },
                { text: clp(i.total), alignment: 'right' },
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
        },
        { text: `Neto: ${clp(d.neto)}`, alignment: 'right', margin: [0, 6, 0, 0] },
        { text: `IVA 19%: ${clp(d.iva)}`, alignment: 'right' },
        { text: `TOTAL: ${clp(d.total)}`, alignment: 'right', bold: true, fontSize: 10 },
        { text: `Pago: ${d.payment}`, alignment: 'right', margin: [0, 2] },
        {
          text: 'Timbre Electrónico SII — SIMULACIÓN (no válida tributariamente)',
          alignment: 'center',
          fontSize: 6,
          margin: [0, 8, 0, 0],
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
