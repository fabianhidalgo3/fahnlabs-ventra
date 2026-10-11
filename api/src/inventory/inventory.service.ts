import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  open(biz: string, note?: string) {
    return this.prisma.inventoryCount.create({ data: { businessId: biz, note } });
  }

  list(biz: string) {
    return this.prisma.inventoryCount.findMany({
      where: { businessId: biz },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async get(biz: string, id: string) {
    const count = await this.prisma.inventoryCount.findFirst({
      where: { id, businessId: biz },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
          include: { product: { select: { name: true } } },
        },
      },
    });
    if (!count) throw new NotFoundException('Conteo no encontrado');
    return count;
  }

  /** Registra un escaneo: suma qty (default 1) al conteo del producto. */
  async scan(biz: string, countId: string, barcode: string, qty = 1) {
    const count = await this.get(biz, countId);
    if (count.status !== 'ABIERTO')
      throw new BadRequestException('El conteo ya está cerrado');
    const product = await this.prisma.product.findFirst({
      where: { businessId: biz, OR: [{ barcode }, { sku: barcode }] },
    });
    if (!product)
      throw new NotFoundException(`Producto no encontrado: ${barcode}`);

    const item = await this.prisma.inventoryCountItem.upsert({
      where: { countId_productId: { countId, productId: product.id } },
      update: { counted: { increment: qty } },
      create: {
        countId,
        productId: product.id,
        barcode: product.barcode,
        expected: product.stock,
        counted: qty,
      },
    });
    return { ...item, product: { name: product.name, price: product.price } };
  }

  /** Cierra el conteo; si apply=true ajusta el stock real a lo contado. */
  async close(biz: string, id: string, apply: boolean) {
    const count = await this.get(biz, id);
    if (count.status !== 'ABIERTO')
      throw new BadRequestException('El conteo ya está cerrado');

    if (apply) {
      await this.prisma.$transaction(
        count.items.map((i) =>
          this.prisma.product.update({
            where: { id: i.productId },
            data: { stock: i.counted },
          }),
        ),
      );
    }
    return this.prisma.inventoryCount.update({
      where: { id },
      data: { status: 'CERRADO', closedAt: new Date() },
      include: { items: true },
    });
  }
}
