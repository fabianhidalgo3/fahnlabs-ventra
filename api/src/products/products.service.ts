import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, BulkPercentDto } from './dto';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { randomUUID } from 'crypto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private genBarcode(): string {
    // EAN-13 style interno: prefijo 200 (uso interno) + 9 dígitos + dígito verificador
    const base =
      '200' + Math.floor(Math.random() * 1e9).toString().padStart(9, '0');
    const digits = base.split('').map(Number);
    const check =
      (10 -
        (digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0) % 10)) %
      10;
    return base + check;
  }

  async list(params: { search?: string; categoryId?: string; all?: boolean }) {
    const where: Prisma.ProductWhereInput = {
      ...(params.all ? {} : { active: true }),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { sku: { contains: params.search, mode: 'insensitive' } },
              { barcode: { contains: params.search } },
            ],
          }
        : {}),
    };
    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        batches: { orderBy: { expiresAt: 'asc' }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });
    const now = Date.now();
    return products.map((p) => {
      const next = p.batches[0];
      const daysToExpiry = next
        ? Math.ceil((next.expiresAt.getTime() - now) / 86400000)
        : null;
      return { ...p, nextExpiry: next?.expiresAt ?? null, daysToExpiry };
    });
  }

  async byBarcode(barcode: string) {
    const p = await this.prisma.product.findFirst({
      where: { OR: [{ barcode }, { sku: barcode }], active: true },
      include: { category: true },
    });
    if (!p) throw new NotFoundException(`Producto no encontrado: ${barcode}`);
    return p;
  }

  async get(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, batches: { orderBy: { expiresAt: 'asc' } } },
    });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
  }

  async create(dto: CreateProductDto) {
    const sku = dto.sku ?? 'SKU-' + randomUUID().slice(0, 8).toUpperCase();
    const barcode = dto.barcode ?? this.genBarcode();
    return this.prisma.product.create({
      // CLP: montos enteros, sin decimales
      data: {
        ...dto,
        price: Math.round(dto.price),
        cost: dto.cost != null ? Math.round(dto.cost) : undefined,
        sku,
        barcode,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const prev = await this.get(id);
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        price: dto.price != null ? Math.round(dto.price) : undefined,
        cost: dto.cost != null ? Math.round(dto.cost) : undefined,
      },
    });
    if (dto.price !== undefined && Number(prev.price) !== dto.price) {
      await this.prisma.priceLog.create({
        data: {
          productId: id,
          oldPrice: prev.price,
          newPrice: dto.price,
          reason: 'edición manual',
        },
      });
    }
    return updated;
  }

  async remove(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { active: false },
    });
  }

  async setImage(id: string, imageUrl: string) {
    return this.prisma.product.update({ where: { id }, data: { imageUrl } });
  }

  async bulkPercent(dto: BulkPercentDto) {
    const where: Prisma.ProductWhereInput = {
      active: true,
      ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
    };
    const products = await this.prisma.product.findMany({ where });
    const factor = 1 + dto.percent / 100;
    await this.prisma.$transaction(
      products.flatMap((p) => {
        const newPrice = Math.round(Number(p.price) * factor);
        return [
          this.prisma.product.update({
            where: { id: p.id },
            data: { price: newPrice },
          }),
          this.prisma.priceLog.create({
            data: {
              productId: p.id,
              oldPrice: p.price,
              newPrice,
              reason: `ajuste masivo ${dto.percent}%`,
            },
          }),
        ];
      }),
    );
    return { updated: products.length, percent: dto.percent };
  }

  async bulkImport(buffer: Buffer, filename: string) {
    const rows: { key: string; price: number }[] = [];
    if (filename.toLowerCase().endsWith('.csv')) {
      const text = buffer.toString('utf8');
      for (const line of text.split(/\r?\n/).slice(1)) {
        const [key, price] = line.split(/[;,]/).map((s) => s?.trim());
        if (key && price && !isNaN(Number(price)))
          rows.push({ key, price: Number(price) });
      }
    } else {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
      const ws = wb.worksheets[0];
      ws.eachRow((row, i) => {
        if (i === 1) return; // encabezado
        const key = String(row.getCell(1).value ?? '').trim();
        const price = Number(row.getCell(2).value);
        if (key && !isNaN(price)) rows.push({ key, price });
      });
    }
    if (!rows.length)
      throw new BadRequestException(
        'Archivo sin filas válidas. Formato esperado: columna 1 = SKU o código de barras, columna 2 = precio nuevo.',
      );

    let updated = 0;
    const notFound: string[] = [];
    for (const r of rows) {
      const p = await this.prisma.product.findFirst({
        where: { OR: [{ sku: r.key }, { barcode: r.key }] },
      });
      if (!p) {
        notFound.push(r.key);
        continue;
      }
      await this.prisma.$transaction([
        this.prisma.product.update({
          where: { id: p.id },
          data: { price: r.price },
        }),
        this.prisma.priceLog.create({
          data: {
            productId: p.id,
            oldPrice: p.price,
            newPrice: r.price,
            reason: `importación ${filename}`,
          },
        }),
      ]);
      updated++;
    }
    return { totalRows: rows.length, updated, notFound };
  }

  listCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  createCategory(name: string) {
    return this.prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}
