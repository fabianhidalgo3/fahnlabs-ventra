import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/auth.decorators';
import { Prisma, DocType } from '@prisma/client';
import sharp from 'sharp';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

const UPLOADS = process.env.UPLOADS_DIR ?? './uploads';

@Controller('purchase-docs')
export class PurchaseDocsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(
    @Query('type') type?: DocType,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    const where: Prisma.PurchaseDocWhereInput = {
      ...(type ? { type } : {}),
      ...(from || to
        ? {
            createdAt: {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to + 'T23:59:59') : undefined,
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { supplier: { contains: search, mode: 'insensitive' } },
              { folio: { contains: search, mode: 'insensitive' } },
              { note: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.purchaseDoc.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const doc = await this.prisma.purchaseDoc.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  /** Registra una guía de despacho o factura a partir de su foto. */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      type: string;
      supplier?: string;
      folio?: string;
      docDate?: string;
      amount?: string;
      note?: string;
    },
  ) {
    if (!file) throw new BadRequestException('Foto requerida (campo file)');
    if (body.type !== 'GUIA' && body.type !== 'FACTURA')
      throw new BadRequestException('type debe ser GUIA o FACTURA');

    mkdirSync(join(UPLOADS, 'docs'), { recursive: true });
    const filename = `${randomUUID()}.webp`;
    // Fotos de documentos: mantener resolución legible pero comprimida
    await sharp(file.buffer)
      .rotate() // respeta orientación EXIF de la cámara
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(join(UPLOADS, 'docs', filename));

    return this.prisma.purchaseDoc.create({
      data: {
        type: body.type,
        supplier: body.supplier?.trim() || null,
        folio: body.folio?.trim() || null,
        docDate: body.docDate ? new Date(body.docDate) : null,
        amount: body.amount && !isNaN(Number(body.amount)) ? Number(body.amount) : null,
        note: body.note?.trim() || null,
        imageUrl: `/uploads/docs/${filename}`,
      },
    });
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prisma.purchaseDoc.delete({ where: { id } });
  }
}
