import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ExpiryLevel = 'vencido' | 'critico' | 'alerta' | 'proximo' | 'ok';

export function expiryLevel(days: number): ExpiryLevel {
  if (days < 0) return 'vencido';
  if (days <= 7) return 'critico';
  if (days <= 15) return 'alerta';
  if (days <= 30) return 'proximo';
  return 'ok';
}

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  create(data: {
    productId: string;
    lotCode: string;
    quantity: number;
    expiresAt: string;
  }) {
    return this.prisma.productBatch.create({
      data: { ...data, expiresAt: new Date(data.expiresAt) },
    });
  }

  listByProduct(productId: string) {
    return this.prisma.productBatch.findMany({
      where: { productId },
      orderBy: { expiresAt: 'asc' },
    });
  }

  async alerts(days = 30) {
    const limit = new Date(Date.now() + days * 86400000);
    const batches = await this.prisma.productBatch.findMany({
      where: { expiresAt: { lte: limit }, quantity: { gt: 0 } },
      include: { product: { select: { id: true, name: true, sku: true, barcode: true } } },
      orderBy: { expiresAt: 'asc' },
    });
    const now = Date.now();
    return batches.map((b) => {
      const d = Math.ceil((b.expiresAt.getTime() - now) / 86400000);
      return { ...b, daysToExpiry: d, level: expiryLevel(d) };
    });
  }

  remove(id: string) {
    return this.prisma.productBatch.delete({ where: { id } });
  }
}
