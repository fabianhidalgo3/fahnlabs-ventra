import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DteProvider } from './dte.provider';
import { Payment } from '@prisma/client';

export interface CreateSaleInput {
  items: { productId?: string; barcode?: string; quantity: number }[];
  payment?: Payment;
}

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private dte: DteProvider,
  ) {}

  async create(input: CreateSaleInput) {
    if (!input.items?.length)
      throw new BadRequestException('La venta necesita al menos un ítem');

    const sale = await this.prisma.$transaction(async (tx) => {
      const lines: {
        productId: string;
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }[] = [];

      for (const item of input.items) {
        if (item.quantity <= 0)
          throw new BadRequestException('Cantidad inválida');
        const product = item.productId
          ? await tx.product.findUnique({ where: { id: item.productId } })
          : await tx.product.findFirst({
              where: { OR: [{ barcode: item.barcode }, { sku: item.barcode }] },
            });
        if (!product)
          throw new NotFoundException(
            `Producto no encontrado: ${item.productId ?? item.barcode}`,
          );
        if (product.stock < item.quantity)
          throw new BadRequestException(
            `Stock insuficiente de "${product.name}" (quedan ${product.stock})`,
          );

        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        });

        const unitPrice = Number(product.price);
        lines.push({
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          unitPrice,
          total: unitPrice * item.quantity,
        });
      }

      // Precios con IVA incluido (práctica chilena): neto = total / 1.19
      const total = lines.reduce((s, l) => s + l.total, 0);
      const neto = Math.round(total / 1.19);
      const iva = total - neto;

      const created = await tx.sale.create({
        data: {
          subtotal: neto,
          tax: iva,
          total,
          payment: input.payment ?? 'EFECTIVO',
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              total: l.total,
            })),
          },
          boleta: { create: {} },
        },
        include: { items: { include: { product: true } }, boleta: true },
      });
      return { created, lines, neto, iva, total };
    });

    // PDF fuera de la transacción (I/O lento no debe bloquear la BD)
    const { pdfPath, provider } = await this.dte.emitirBoleta({
      folio: sale.created.boleta!.folio,
      saleNumber: sale.created.number,
      createdAt: sale.created.createdAt,
      items: sale.lines,
      neto: sale.neto,
      iva: sale.iva,
      total: sale.total,
      payment: sale.created.payment,
    });
    const boleta = await this.prisma.boleta.update({
      where: { id: sale.created.boleta!.id },
      data: { pdfPath, provider },
    });

    return { ...sale.created, boleta };
  }

  list(params: { from?: string; to?: string }) {
    return this.prisma.sale.findMany({
      where: {
        createdAt: {
          gte: params.from ? new Date(params.from) : undefined,
          lte: params.to ? new Date(params.to + 'T23:59:59') : undefined,
        },
      },
      include: { items: { include: { product: true } }, boleta: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async get(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, boleta: true },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }
}
