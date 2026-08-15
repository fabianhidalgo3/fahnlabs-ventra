import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory/counts')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  open(@Body('note') note?: string) {
    return this.service.open(note);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post(':id/scan')
  scan(
    @Param('id') id: string,
    @Body() body: { barcode: string; qty?: number },
  ) {
    return this.service.scan(id, body.barcode, body.qty ?? 1);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Body('apply') apply?: boolean) {
    return this.service.close(id, apply ?? false);
  }
}
