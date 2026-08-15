import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import type { GroupBy } from './reports.service';
import { Roles } from '../auth/auth.decorators';

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('today')
  today() {
    return this.service.today();
  }

  @Get('summary')
  summary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupBy') groupBy?: GroupBy,
  ) {
    return this.service.summary(from, to, groupBy ?? 'day');
  }

  @Roles('ADMIN')
  @Get('export.xlsx')
  async xlsx(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const buf = await this.service.exportXlsx(from, to);
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
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const buf = await this.service.exportPdf(from, to);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ventra-reporte-${from ?? 'hoy'}.pdf"`,
    );
    res.send(buf);
  }
}
