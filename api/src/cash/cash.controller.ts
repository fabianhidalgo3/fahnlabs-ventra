import { Body, Controller, Get, Post } from '@nestjs/common';
import { CashService } from './cash.service';

@Controller('cash')
export class CashController {
  constructor(private readonly service: CashService) {}

  @Get('current')
  current() {
    return this.service.current();
  }

  @Get('history')
  history() {
    return this.service.history();
  }

  @Post('open')
  open(@Body('openingCash') openingCash: number) {
    return this.service.open(Number(openingCash));
  }

  @Post('close')
  close(@Body() body: { countedCash: number; note?: string }) {
    return this.service.close(Number(body.countedCash), body.note);
  }
}
