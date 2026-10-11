import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { BatchesModule } from './batches/batches.module';
import { SalesModule } from './sales/sales.module';
import { ReportsModule } from './reports/reports.module';
import { InventoryModule } from './inventory/inventory.module';
import { PurchaseDocsModule } from './purchase-docs/purchase-docs.module';
import { AssistantModule } from './assistant/assistant.module';
import { CashModule } from './cash/cash.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { FiadoModule } from './fiado/fiado.module';
import { PromotionsModule } from './promotions/promotions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    BatchesModule,
    SalesModule,
    ReportsModule,
    InventoryModule,
    PurchaseDocsModule,
    AssistantModule,
    CashModule,
    WhatsappModule,
    FiadoModule,
    PromotionsModule,
  ],
})
export class AppModule {}
