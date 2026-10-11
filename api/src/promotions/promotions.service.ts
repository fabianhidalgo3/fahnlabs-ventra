import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromoType, Prisma } from '@prisma/client';
import { CreatePromotionDto, UpdatePromotionDto } from './dto';

/** Línea de venta sobre la que se evalúan las promociones. */
export interface PromoLine {
  productId: string;
  categoryId?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface PromoDetail {
  productId: string;
  promoName: string;
  discount: number;
}

export interface PromoResult {
  totalDiscount: number;
  detail: PromoDetail[];
}

type PromoWithProducts = Prisma.PromotionGetPayload<{
  include: { products: true };
}>;

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  list(biz: string) {
    return this.prisma.promotion.findMany({
      where: { businessId: biz },
      include: {
        products: { include: { product: { select: { id: true, name: true } } } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const promo = await this.prisma.promotion.findUnique({
      where: { id },
      include: {
        products: { include: { product: { select: { id: true, name: true } } } },
        category: { select: { id: true, name: true } },
      },
    });
    if (!promo) throw new NotFoundException('Promoción no encontrada');
    return promo;
  }

  /** Valida la coherencia de los parámetros según el tipo de promoción. */
  private validateParams(dto: CreatePromotionDto | UpdatePromotionDto, type: PromoType) {
    if (type === 'PORCENTAJE') {
      if (dto.percent == null || dto.percent <= 0 || dto.percent > 100)
        throw new BadRequestException('percent debe estar entre 1 y 100');
    }
    if (type === 'PACK_PRECIO') {
      if (dto.packQty == null || dto.packQty < 2)
        throw new BadRequestException('packQty debe ser ≥ 2');
      if (dto.packPrice == null || dto.packPrice < 1)
        throw new BadRequestException('packPrice debe ser ≥ 1');
    }
    if (type === 'NXM') {
      if (dto.nTake == null || dto.mPay == null || dto.mPay < 1 || dto.nTake <= dto.mPay)
        throw new BadRequestException('NXM requiere nTake > mPay ≥ 1');
    }
    if (!dto.categoryId && !dto.productIds?.length)
      throw new BadRequestException('La promoción necesita productos o una categoría');
  }

  async create(biz: string, dto: CreatePromotionDto) {
    this.validateParams(dto, dto.type);
    return this.prisma.promotion.create({
      data: {
        businessId: biz,
        name: dto.name.trim(),
        type: dto.type,
        percent: dto.type === 'PORCENTAJE' ? dto.percent : null,
        packQty: dto.type === 'PACK_PRECIO' ? dto.packQty : null,
        packPrice: dto.type === 'PACK_PRECIO' ? dto.packPrice : null,
        nTake: dto.type === 'NXM' ? dto.nTake : null,
        mPay: dto.type === 'NXM' ? dto.mPay : null,
        categoryId: dto.categoryId || null,
        active: dto.active ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        products: dto.productIds?.length
          ? { create: dto.productIds.map((productId) => ({ productId })) }
          : undefined,
      },
      include: {
        products: { include: { product: { select: { id: true, name: true } } } },
        category: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const existing = await this.get(id);
    const type = dto.type ?? existing.type;
    // Para validar, completa con los valores existentes los campos no enviados
    const merged = {
      ...dto,
      percent: dto.percent ?? (existing.percent != null ? Number(existing.percent) : undefined),
      packQty: dto.packQty ?? existing.packQty ?? undefined,
      packPrice: dto.packPrice ?? (existing.packPrice != null ? Number(existing.packPrice) : undefined),
      nTake: dto.nTake ?? existing.nTake ?? undefined,
      mPay: dto.mPay ?? existing.mPay ?? undefined,
      categoryId: dto.categoryId !== undefined ? dto.categoryId : (existing.categoryId ?? undefined),
      productIds: dto.productIds ?? existing.products.map((p) => p.productId),
    };
    this.validateParams(merged, type);

    return this.prisma.promotion.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        type: dto.type,
        percent: type === 'PORCENTAJE' ? merged.percent : null,
        packQty: type === 'PACK_PRECIO' ? merged.packQty : null,
        packPrice: type === 'PACK_PRECIO' ? merged.packPrice : null,
        nTake: type === 'NXM' ? merged.nTake : null,
        mPay: type === 'NXM' ? merged.mPay : null,
        categoryId: merged.categoryId || null,
        active: dto.active,
        startsAt: dto.startsAt !== undefined ? (dto.startsAt ? new Date(dto.startsAt) : null) : undefined,
        endsAt: dto.endsAt !== undefined ? (dto.endsAt ? new Date(dto.endsAt) : null) : undefined,
        products: dto.productIds
          ? {
              deleteMany: {},
              create: dto.productIds.map((productId) => ({ productId })),
            }
          : undefined,
      },
      include: {
        products: { include: { product: { select: { id: true, name: true } } } },
        category: { select: { id: true, name: true } },
      },
    });
  }

  /** Borrado definitivo: elimina la promo y su relación con productos. */
  async remove(id: string) {
    await this.get(id);
    await this.prisma.$transaction([
      this.prisma.promotionProduct.deleteMany({ where: { promotionId: id } }),
      this.prisma.promotion.delete({ where: { id } }),
    ]);
    return { deleted: true };
  }

  /** Desactivar: la oferta queda apagada pero recuperable. */
  async deactivate(id: string) {
    await this.get(id);
    return this.prisma.promotion.update({
      where: { id },
      data: { active: false },
    });
  }

  /** Promociones activas y vigentes a la fecha actual. */
  private async activePromotions(biz: string): Promise<PromoWithProducts[]> {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: {
        businessId: biz,
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      include: { products: true },
    });
  }

  /** Descuento que produce una promo sobre una línea (0 si no aplica o no conviene). */
  private lineDiscount(promo: PromoWithProducts, line: PromoLine): number {
    const gross = line.unitPrice * line.quantity;
    switch (promo.type) {
      case 'PORCENTAJE': {
        if (promo.percent == null) return 0;
        return Math.round((gross * Number(promo.percent)) / 100);
      }
      case 'PACK_PRECIO': {
        // Solo múltiplos exactos del pack reciben el precio especial
        if (!promo.packQty || promo.packPrice == null) return 0;
        const packs = Math.floor(line.quantity / promo.packQty);
        if (packs <= 0) return 0;
        return Math.round(
          packs * (promo.packQty * line.unitPrice - Number(promo.packPrice)),
        );
      }
      case 'NXM': {
        if (!promo.nTake || promo.mPay == null) return 0;
        const groups = Math.floor(line.quantity / promo.nTake);
        if (groups <= 0) return 0;
        return Math.round(groups * (promo.nTake - promo.mPay) * line.unitPrice);
      }
      default:
        return 0;
    }
  }

  /** ¿La promo aplica a esta línea? (producto listado o categoría coincidente) */
  private applies(promo: PromoWithProducts, line: PromoLine): boolean {
    if (promo.products.some((pp) => pp.productId === line.productId)) return true;
    if (promo.categoryId && line.categoryId && promo.categoryId === line.categoryId)
      return true;
    return false;
  }

  /**
   * Calcula el descuento automático por ofertas para un conjunto de líneas.
   * Por cada línea se aplica LA MEJOR promoción (mayor descuento).
   */
  async computeDiscounts(biz: string, lines: PromoLine[]): Promise<PromoResult> {
    if (!lines.length) return { totalDiscount: 0, detail: [] };
    const promos = await this.activePromotions(biz);
    const detail: PromoDetail[] = [];
    let totalDiscount = 0;

    for (const line of lines) {
      let best: { promo: PromoWithProducts; discount: number } | null = null;
      for (const promo of promos) {
        if (!this.applies(promo, line)) continue;
        const discount = this.lineDiscount(promo, line);
        if (discount > 0 && (!best || discount > best.discount))
          best = { promo, discount };
      }
      if (best) {
        totalDiscount += best.discount;
        detail.push({
          productId: line.productId,
          promoName: best.promo.name,
          discount: best.discount,
        });
      }
    }
    return { totalDiscount, detail };
  }

  /**
   * Cotiza un carrito: resuelve precios desde la BD y devuelve el descuento
   * por ofertas estimado, para que el POS lo muestre en vivo.
   */
  async quote(biz: string, items: { productId: string; quantity: number }[]) {
    const products = await this.prisma.product.findMany({
      where: { businessId: biz, id: { in: items.map((i) => i.productId) } },
      select: { id: true, price: true, categoryId: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const lines: PromoLine[] = [];
    for (const item of items) {
      const p = byId.get(item.productId);
      if (!p) throw new NotFoundException(`Producto no encontrado: ${item.productId}`);
      lines.push({
        productId: p.id,
        categoryId: p.categoryId,
        quantity: item.quantity,
        unitPrice: Number(p.price),
      });
    }
    const bruto = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const { totalDiscount, detail } = await this.computeDiscounts(biz, lines);
    return { bruto, promoDiscount: totalDiscount, detail };
  }
}
