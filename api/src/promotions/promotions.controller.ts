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
import { Roles } from '../auth/auth.decorators';
import { CreatePromotionDto, QuoteDto, UpdatePromotionDto } from './dto';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  /** Cotización en vivo para el POS: descuento por ofertas del carrito actual. */
  @Post('quote')
  quote(@Body() dto: QuoteDto) {
    return this.service.quote(dto.items);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreatePromotionDto) {
    return this.service.create(dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
