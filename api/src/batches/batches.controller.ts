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
import { Roles, CurrentUser } from '../auth/auth.decorators';
import type { JwtUser } from '../auth/auth.decorators';

@Controller('batches')
export class BatchesController {
  constructor(private readonly service: BatchesService) {}

  @Get('alerts')
  alerts(@CurrentUser() user: JwtUser, @Query('days') days?: string) {
    return this.service.alerts(user.businessId, days ? Number(days) : 30);
  }

  @Get('product/:productId')
  byProduct(@Param('productId') productId: string) {
    return this.service.listByProduct(productId);
  }

  @Roles('ADMIN')
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

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
