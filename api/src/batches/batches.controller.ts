import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { BatchesService } from './batches.service';

@Controller('batches')
export class BatchesController {
  constructor(private readonly service: BatchesService) {}

  @Get('alerts')
  alerts(@Query('days') days?: string) {
    return this.service.alerts(days ? Number(days) : 30);
  }

  @Get('product/:productId')
  byProduct(@Param('productId') productId: string) {
    return this.service.listByProduct(productId);
  }

  @Post()
  create(
    @Body()
    body: {
      productId: string;
      lotCode: string;
      quantity: number;
      expiresAt: string;
    },
  ) {
    return this.service.create(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
