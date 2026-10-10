import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import type { CreateSaleInput } from './sales.service';
import { Roles } from '../auth/auth.decorators';

@Controller('sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Post()
  create(@Body() body: CreateSaleInput) {
    return this.service.create(body);
  }

  @Get()
  list(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list({ from, to });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Roles('ADMIN')
  @Post(':id/void')
  void(@Param('id') id: string) {
    return this.service.void(id);
  }
}
