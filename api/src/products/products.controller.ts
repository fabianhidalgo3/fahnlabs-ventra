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
import { Roles, CurrentUser } from '../auth/auth.decorators';
import type { JwtUser } from '../auth/auth.decorators';
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
    @CurrentUser() user: JwtUser,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('all') all?: string,
  ) {
    return this.service.list(user.businessId, { search, categoryId, all: all === 'true' });
  }

  @Get('categories')
  categories(@CurrentUser() user: JwtUser) {
    return this.service.listCategories(user.businessId);
  }

  @Roles('ADMIN')
  @Post('categories')
  createCategory(@CurrentUser() user: JwtUser, @Body('name') name: string) {
    if (!name?.trim()) throw new BadRequestException('name requerido');
    return this.service.createCategory(user.businessId, name.trim());
  }

  @Get('by-barcode/:code')
  byBarcode(@CurrentUser() user: JwtUser, @Param('code') code: string) {
    return this.service.byBarcode(user.businessId, code);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.get(user.businessId, id);
  }

  @Roles('ADMIN')
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateProductDto) {
    return this.service.create(user.businessId, dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(user.businessId, id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.remove(user.businessId, id);
  }

  @Roles('ADMIN')
  @Post('price-bulk')
  bulkPercent(@CurrentUser() user: JwtUser, @Body() dto: BulkPercentDto) {
    return this.service.bulkPercent(user.businessId, dto);
  }

  @Roles('ADMIN')
  @Post('price-import')
  @UseInterceptors(FileInterceptor('file'))
  bulkImport(@CurrentUser() user: JwtUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo requerido (campo file)');
    return this.service.bulkImport(user.businessId, file.buffer, file.originalname);
  }

  @Roles('ADMIN')
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @CurrentUser() user: JwtUser,
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
    return this.service.setImage(user.businessId, id, `/uploads/products/${filename}`);
  }

  @Get(':id/barcode.png')
  async barcode(@CurrentUser() user: JwtUser, @Param('id') id: string, @Res() res: Response) {
    const p = await this.service.get(user.businessId, id);
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
  async qr(@CurrentUser() user: JwtUser, @Param('id') id: string, @Res() res: Response) {
    const p = await this.service.get(user.businessId, id);
    const png = await QRCode.toBuffer(
      JSON.stringify({ t: 'ventra-product', barcode: p.barcode, sku: p.sku }),
      { width: 320, margin: 1 },
    );
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  }
}
