import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DteProvider } from './dte.provider';
import { PromotionsService } from '../promotions/promotions.service';
import { Payment } from '@prisma/client';

export interface CreateSaleInput {
  items: { productId?: string; barcode?: string; quantity: number }[];
  payment?: Payment;
  /** Descuento en pesos sobre el total de la venta. */
  discount?: number;
  /** Con cuánto paga el cliente (efectivo) para calcular vuelto. */
  tendered?: number;
}

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private dte: DteProvider,
    private promotions: PromotionsService,
  ) {}

  async create(input: CreateSaleInput) {
    if (!input.items?.length)
      throw new BadRequestException('La venta necesita al menos un ítem');

    const sale = await this.prisma.$transaction(async (tx) => {
      const lines: {
        productId: string;
        categoryId: string | null;
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
          categoryId: product.categoryId,
          name: product.name,
          quantity: item.quantity,
          unitPrice,
          total: unitPrice * item.quantity,
        });
      }

      // Precios con IVA incluido (práctica chilena): neto = total / 1.19
      const bruto = lines.reduce((s, l) => s + l.total, 0);
      // Descuento automático por ofertas/promociones vigentes (la mejor por línea)
      const promo = await this.promotions.computeDiscounts(
        lines.map((l) => ({
          productId: l.productId,
          categoryId: l.categoryId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      );
      // Sale.discount guarda la suma: descuento manual + descuento por ofertas,
      // con el clamp existente al bruto.
      const manualDiscount = Math.max(Math.round(input.discount ?? 0), 0);
      const discount = Math.min(manualDiscount + promo.totalDiscount, bruto);
      const total = bruto - discount;
      const neto = Math.round(total / 1.19);
      const iva = total - neto;

      const tendered =
        input.tendered != null && input.tendered >= total
          ? Math.round(input.tendered)
          : null;
      const change = tendered != null ? tendered - total : null;

      const created = await tx.sale.create({
        data: {
          subtotal: neto,
          tax: iva,
          discount,
          total,
          tendered,
          change,
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
      return { created, lines, neto, iva, discount, total, tendered, change };
    });

    // PDF fuera de la transacción (I/O lento no debe bloquear la BD)
    const { pdfPath, provider } = await this.dte.emitirBoleta({
      folio: sale.created.boleta!.folio,
      saleNumber: sale.created.number,
      createdAt: sale.created.createdAt,
      items: sale.lines,
      neto: sale.neto,
      iva: sale.iva,
      discount: sale.discount,
      total: sale.total,
      payment: sale.created.payment,
      tendered: sale.tendered ?? undefined,
      change: sale.change ?? undefined,
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

  /** Anula la venta: devuelve el stock y marca la boleta como ANULADA. */
  async void(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true, boleta: true },
      });
      if (!sale) throw new NotFoundException('Venta no encontrada');
      if (sale.voidedAt) throw new BadRequestException('La venta ya está anulada');

      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      if (sale.boleta) {
        await tx.boleta.update({
          where: { id: sale.boleta.id },
          data: { status: 'ANULADA' },
        });
      }
      return tx.sale.update({
        where: { id },
        data: { voidedAt: new Date() },
        include: { items: { include: { product: true } }, boleta: true },
      });
    });
  }
}
