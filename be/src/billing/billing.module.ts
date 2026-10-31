import { Module } from '@nestjs/common';
import { AdminCreditsController, BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { CreditsService } from './credits.service';
import { EntitlementsService } from './entitlements.service';
import { PlanService } from './plan.service';
import { XuWalletService } from './xu-wallet.service';

/**
 * Credits, the xu wallet, plan sync and entitlements, no HTTP: imported by the API (BillingModule, ExportModule,
 * AiModule) and the worker.
 */
@Module({
  providers: [CreditsService, XuWalletService, PlanService, EntitlementsService],
  exports: [CreditsService, XuWalletService, PlanService, EntitlementsService],
})
export class BillingCoreModule {}

/** API side: `GET /billing/me` and the admin grant. Imported by AppModule. */
@Module({
  imports: [BillingCoreModule],
  controllers: [BillingController, AdminCreditsController],
  providers: [BillingService],
})
export class BillingModule {}
