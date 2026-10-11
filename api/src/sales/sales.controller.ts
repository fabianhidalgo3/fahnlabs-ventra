import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import type { CreateSaleInput } from './sales.service';
import { Roles, CurrentUser } from '../auth/auth.decorators';
import type { JwtUser } from '../auth/auth.decorators';

@Controller('sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() body: CreateSaleInput) {
    return this.service.create(user.businessId, body);
  }

  @Get()
  list(@CurrentUser() user: JwtUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(user.businessId, { from, to });
  }

  @Get(':id')
  get(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.get(user.businessId, id);
  }

  @Roles('ADMIN')
  @Post(':id/void')
  void(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.void(user.businessId, id);
  }
}
