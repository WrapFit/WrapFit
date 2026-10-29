import { Module } from '@nestjs/common';
import { AdminCreditsController, BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { CreditsService } from './credits.service';
import { EntitlementsService } from './entitlements.service';
import { PlanService } from './plan.service';

/** Credits, plan sync and entitlements, no HTTP: imported by the API (BillingModule, ExportModule) and the worker. */
@Module({
  providers: [CreditsService, PlanService, EntitlementsService],
  exports: [CreditsService, PlanService, EntitlementsService],
})
export class BillingCoreModule {}

/** API side: `GET /billing/me` and the admin grant. Imported by AppModule. */
@Module({
  imports: [BillingCoreModule],
  controllers: [BillingController, AdminCreditsController],
  providers: [BillingService],
})
export class BillingModule {}
