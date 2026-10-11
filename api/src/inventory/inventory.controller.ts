import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CurrentUser } from '../auth/auth.decorators';
import type { JwtUser } from '../auth/auth.decorators';

@Controller('inventory/counts')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.service.list(user.businessId);
  }

  @Post()
  open(@CurrentUser() user: JwtUser, @Body('note') note?: string) {
    return this.service.open(user.businessId, note);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.get(user.businessId, id);
  }

  @Post(':id/scan')
  scan(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: { barcode: string; qty?: number },
  ) {
    return this.service.scan(user.businessId, id, body.barcode, body.qty ?? 1);
  }

  @Post(':id/close')
  close(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body('apply') apply?: boolean) {
    return this.service.close(user.businessId, id, apply ?? false);
  }
}
