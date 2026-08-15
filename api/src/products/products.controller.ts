import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, BulkPercentDto } from './dto';
import * as bwipjs from 'bwip-js';
import * as QRCode from 'qrcode';
import sharp from 'sharp';
import { join } from 'path';
import { mkdirSync } from 'fs';

const UPLOADS = process.env.UPLOADS_DIR ?? './uploads';

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('all') all?: string,
  ) {
    return this.service.list({ search, categoryId, all: all === 'true' });
  }

  @Get('categories')
  categories() {
    return this.service.listCategories();
  }

  @Post('categories')
  createCategory(@Body('name') name: string) {
    if (!name?.trim()) throw new BadRequestException('name requerido');
    return this.service.createCategory(name.trim());
  }

  @Get('by-barcode/:code')
  byBarcode(@Param('code') code: string) {
    return this.service.byBarcode(code);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('price-bulk')
  bulkPercent(@Body() dto: BulkPercentDto) {
    return this.service.bulkPercent(dto);
  }

  @Post('price-import')
  @UseInterceptors(FileInterceptor('file'))
  bulkImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo requerido (campo file)');
    return this.service.bulkImport(file.buffer, file.originalname);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido (campo file)');
    mkdirSync(join(UPLOADS, 'products'), { recursive: true });
    const filename = `${id}.webp`;
    await sharp(file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(join(UPLOADS, 'products', filename));
    return this.service.setImage(id, `/uploads/products/${filename}`);
  }

  @Get(':id/barcode.png')
  async barcode(@Param('id') id: string, @Res() res: Response) {
    const p = await this.service.get(id);
    const png = await bwipjs.toBuffer({
      bcid: p.barcode.length === 13 ? 'ean13' : 'code128',
      text: p.barcode,
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: 'center',
    });
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  }

  @Get(':id/qr.png')
  async qr(@Param('id') id: string, @Res() res: Response) {
    const p = await this.service.get(id);
    const png = await QRCode.toBuffer(
      JSON.stringify({ t: 'ventra-product', barcode: p.barcode, sku: p.sku }),
      { width: 320, margin: 1 },
    );
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  }
}
