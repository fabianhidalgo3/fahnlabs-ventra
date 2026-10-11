import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import type { GroupBy } from './reports.service';
import { Roles, CurrentUser } from '../auth/auth.decorators';
import type { JwtUser } from '../auth/auth.decorators';

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('today')
  today(@CurrentUser() user: JwtUser) {
    return this.service.today(user.businessId);
  }

  @Get('summary')
  summary(
    @CurrentUser() user: JwtUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupBy') groupBy?: GroupBy,
  ) {
    return this.service.summary(user.businessId, from, to, groupBy ?? 'day');
  }

  @Roles('ADMIN')
  @Get('export.xlsx')
  async xlsx(
    @CurrentUser() user: JwtUser,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const buf = await this.service.exportXlsx(user.businessId, from, to);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ventra-ventas-${from ?? 'hoy'}.xlsx"`,
    );
    res.send(buf);
  }

  @Roles('ADMIN')
  @Get('export.pdf')
  async pdf(
    @CurrentUser() user: JwtUser,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const buf = await this.service.exportPdf(user.businessId, from, to);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ventra-reporte-${from ?? 'hoy'}.pdf"`,
    );
    res.send(buf);
  }
}
