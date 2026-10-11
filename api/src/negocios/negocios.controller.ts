import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { NegociosService } from './negocios.service';
import { Roles } from '../auth/auth.decorators';

@Roles('SUPERADMIN')
@Controller('negocios')
export class NegociosController {
  constructor(private readonly service: NegociosService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      rut?: string;
      address?: string;
      phone?: string;
      adminName: string;
      adminEmail: string;
      adminPassword: string;
    },
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; rut?: string; address?: string; phone?: string; active?: boolean },
  ) {
    return this.service.update(id, body);
  }

  @Post(':id/usuarios')
  crearUsuario(
    @Param('id') id: string,
    @Body() body: { name: string; email: string; password: string; role: 'ADMIN' | 'VENDEDOR' },
  ) {
    return this.service.crearUsuario(id, body);
  }
}
