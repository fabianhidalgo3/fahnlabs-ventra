import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { FiadoService } from './fiado.service';

@Controller('fiado')
export class FiadoController {
  constructor(private readonly service: FiadoService) {}

  @Get('clientes')
  clientes() {
    return this.service.clientes();
  }

  @Post('clientes')
  crear(@Body() body: { name: string; phone?: string; note?: string }) {
    return this.service.crearCliente(body);
  }

  @Get('clientes/:id')
  detalle(@Param('id') id: string) {
    return this.service.detalle(id);
  }

  @Post('clientes/:id/abono')
  abonar(@Param('id') id: string, @Body() body: { amount: number; note?: string }) {
    return this.service.abonar(id, Number(body.amount), body.note);
  }
}
