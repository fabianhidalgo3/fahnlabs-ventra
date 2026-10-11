import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CashService {
  constructor(private prisma: PrismaService) {}

  private openSession(biz: string) {
    return this.prisma.cashSession.findFirst({ where: { status: 'ABIERTA', businessId: biz } });
  }

  async open(biz: string, openingCash: number) {
    if (openingCash == null || isNaN(openingCash) || openingCash < 0)
      throw new BadRequestException('openingCash inválido');
    const existing = await this.openSession(biz);
    if (existing)
      throw new BadRequestException(
        'Ya hay una caja abierta. Ciérrala antes de abrir otra.',
      );
    return this.prisma.cashSession.create({
      data: { businessId: biz, openingCash: Math.round(openingCash) },
    });
  }

  /** Resumen de la caja abierta: ventas por medio de pago desde la apertura. */
  async current(biz: string) {
    const session = await this.openSession(biz);
    if (!session) return { session: null };

    const sales = await this.prisma.sale.findMany({
      where: { businessId: biz, createdAt: { gte: session.openedAt }, voidedAt: null },
      select: { payment: true, total: true },
    });
    const byPayment: Record<string, { ventas: number; total: number }> = {};
    for (const s of sales) {
      byPayment[s.payment] ??= { ventas: 0, total: 0 };
      byPayment[s.payment].ventas++;
      byPayment[s.payment].total += Number(s.total);
    }
    const totalVentas = sales.reduce((a, s) => a + Number(s.total), 0);
    const efectivo = byPayment['EFECTIVO']?.total ?? 0;
    return {
      session,
      byPayment,
      totalVentas,
      ventas: sales.length,
      // Lo que debería haber en el cajón: fondo inicial + ventas en efectivo
      expectedCash: Number(session.openingCash) + efectivo,
    };
  }

  async close(biz: string, countedCash: number, note?: string) {
    if (countedCash == null || isNaN(countedCash) || countedCash < 0)
      throw new BadRequestException('countedCash inválido');
    const summary = await this.current(biz);
    if (!summary.session) throw new BadRequestException('No hay caja abierta');
    const expected = summary.expectedCash ?? 0;
    const counted = Math.round(countedCash);
    return this.prisma.cashSession.update({
      where: { id: summary.session.id },
      data: {
        status: 'CERRADA',
        closedAt: new Date(),
        countedCash: counted,
        expectedCash: expected,
        difference: counted - expected,
        note: note?.trim() || null,
      },
    });
  }

  history(biz: string) {
    return this.prisma.cashSession.findMany({
      where: { businessId: biz },
      orderBy: { openedAt: 'desc' },
      take: 30,
    });
  }
}
