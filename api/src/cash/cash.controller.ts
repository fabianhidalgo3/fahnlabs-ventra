import { Body, Controller, Get, Post } from '@nestjs/common';
import { CashService } from './cash.service';
import { CurrentUser } from '../auth/auth.decorators';
import type { JwtUser } from '../auth/auth.decorators';

@Controller('cash')
export class CashController {
  constructor(private readonly service: CashService) {}

  @Get('current')
  current(@CurrentUser() user: JwtUser) {
    return this.service.current(user.businessId);
  }

  @Get('history')
  history(@CurrentUser() user: JwtUser) {
    return this.service.history(user.businessId);
  }

  @Post('open')
  open(@CurrentUser() user: JwtUser, @Body('openingCash') openingCash: number) {
    return this.service.open(user.businessId, Number(openingCash));
  }

  @Post('close')
  close(@CurrentUser() user: JwtUser, @Body() body: { countedCash: number; note?: string }) {
    return this.service.close(user.businessId, Number(body.countedCash), body.note);
  }
}
