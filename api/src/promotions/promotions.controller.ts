import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { Roles, CurrentUser } from '../auth/auth.decorators';
import type { JwtUser } from '../auth/auth.decorators';
import { CreatePromotionDto, QuoteDto, UpdatePromotionDto } from './dto';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.service.list(user.businessId);
  }

  /** Cotización en vivo para el POS: descuento por ofertas del carrito actual. */
  @Post('quote')
  quote(@CurrentUser() user: JwtUser, @Body() dto: QuoteDto) {
    return this.service.quote(user.businessId, dto.items);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Roles('ADMIN')
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreatePromotionDto) {
    return this.service.create(user.businessId, dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
