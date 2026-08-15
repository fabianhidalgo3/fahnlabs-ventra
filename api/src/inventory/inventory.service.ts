import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  open(note?: string) {
    return this.prisma.inventoryCount.create({ data: { note } });
  }

  list() {
    return this.prisma.inventoryCount.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async get(id: string) {
    const count = await this.prisma.inventoryCount.findUnique({
      where: { id },
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
  async scan(countId: string, barcode: string, qty = 1) {
    const count = await this.get(countId);
    if (count.status !== 'ABIERTO')
      throw new BadRequestException('El conteo ya está cerrado');
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ barcode }, { sku: barcode }] },
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
  async close(id: string, apply: boolean) {
    const count = await this.get(id);
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
