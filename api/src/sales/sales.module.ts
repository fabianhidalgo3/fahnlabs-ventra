import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { DteProvider, DteSimuladoProvider } from './dte.provider';

@Module({
  controllers: [SalesController],
  providers: [
    SalesService,
    { provide: DteProvider, useClass: DteSimuladoProvider },
  ],
})
export class SalesModule {}
