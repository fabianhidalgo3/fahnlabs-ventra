import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FiadoService {
  constructor(private prisma: PrismaService) {}

  /** Clientes con su deuda: ventas al fiado (no anuladas) menos abonos. */
  async clientes(biz: string) {
    const customers = await this.prisma.customer.findMany({
      where: { active: true, businessId: biz },
      include: {
        sales: { where: { payment: 'FIADO', voidedAt: null }, select: { total: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { name: 'asc' },
    });
    return customers.map((c) => {
      const fiado = c.sales.reduce((s, v) => s + Number(v.total), 0);
      const abonado = c.payments.reduce((s, p) => s + Number(p.amount), 0);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        note: c.note,
        createdAt: c.createdAt,
        fiado,
        abonado,
        deuda: fiado - abonado,
      };
    });
  }

  async crearCliente(biz: string, data: { name: string; phone?: string; note?: string }) {
    if (!data.name?.trim()) throw new BadRequestException('Nombre requerido');
    const existe = await this.prisma.customer.findFirst({
      where: { businessId: biz, active: true, name: { equals: data.name.trim(), mode: 'insensitive' } },
    });
    if (existe)
      throw new BadRequestException(`Ya existe un cliente llamado "${existe.name}" — úsalo o diferencia el nombre (ej: apellido)`);
    return this.prisma.customer.create({
      data: { businessId: biz, name: data.name.trim(), phone: data.phone?.trim() || null, note: data.note?.trim() || null },
    });
  }

  /** Detalle con movimientos cronológicos (fiados y abonos). */
  async detalle(biz: string, id: string) {
    const c = await this.prisma.customer.findFirst({
      where: { id, businessId: biz },
      include: {
        sales: {
          where: { payment: 'FIADO', voidedAt: null },
          include: { items: { include: { product: { select: { name: true } } } }, boleta: true },
          orderBy: { createdAt: 'desc' },
        },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!c) throw new NotFoundException('Cliente no encontrado');
    const fiado = c.sales.reduce((s, v) => s + Number(v.total), 0);
    const abonado = c.payments.reduce((s, p) => s + Number(p.amount), 0);

    const movimientos = [
      ...c.sales.map((v) => ({
        tipo: 'FIADO' as const,
        fecha: v.createdAt,
        monto: Number(v.total),
        detalle: `Venta N° ${v.number} (${v.items.map((i) => `${i.quantity}× ${i.product.name}`).join(', ')})`,
        saleId: v.id,
        boletaPdf: v.boleta?.pdfPath ?? null,
      })),
      ...c.payments.map((p) => ({
        tipo: 'ABONO' as const,
        fecha: p.createdAt,
        monto: Number(p.amount),
        detalle: p.note ?? 'Abono',
        saleId: null,
        boletaPdf: null,
      })),
    ].sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha));

    return { id: c.id, name: c.name, phone: c.phone, note: c.note, fiado, abonado, deuda: fiado - abonado, movimientos };
  }

  async abonar(biz: string, id: string, amount: number, note?: string) {
    const monto = Math.round(Number(amount));
    if (isNaN(monto) || monto <= 0) throw new BadRequestException('Monto de abono inválido');
    const det = await this.detalle(biz, id);
    if (monto > det.deuda)
      throw new BadRequestException(`El abono ($${monto.toLocaleString('es-CL')}) supera la deuda ($${det.deuda.toLocaleString('es-CL')})`);
    await this.prisma.creditPayment.create({
      data: { customerId: id, amount: monto, note: note?.trim() || null },
    });
    return this.detalle(biz, id);
  }
}
