import { Module } from '@nestjs/common';
import { PurchaseDocsController } from './purchase-docs.controller';

@Module({
  controllers: [PurchaseDocsController],
})
export class PurchaseDocsModule {}
