import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { FiadoService } from './fiado.service';
import { CurrentUser } from '../auth/auth.decorators';
import type { JwtUser } from '../auth/auth.decorators';

@Controller('fiado')
export class FiadoController {
  constructor(private readonly service: FiadoService) {}

  @Get('clientes')
  clientes(@CurrentUser() user: JwtUser) {
    return this.service.clientes(user.businessId);
  }

  @Post('clientes')
  crear(@CurrentUser() user: JwtUser, @Body() body: { name: string; phone?: string; note?: string }) {
    return this.service.crearCliente(user.businessId, body);
  }

  @Get('clientes/:id')
  detalle(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.detalle(user.businessId, id);
  }

  @Post('clientes/:id/abono')
  abonar(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() body: { amount: number; note?: string }) {
    return this.service.abonar(user.businessId, id, Number(body.amount), body.note);
  }
}
