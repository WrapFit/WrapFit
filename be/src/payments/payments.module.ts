import { Module } from '@nestjs/common';
import { BillingCoreModule } from '../billing';
import { OrdersModule } from '../orders';
import { BankTransactionsController } from './admin/bank-transactions.controller';
import { BankTransactionsService } from './admin/bank-transactions.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SepayWebhookController } from './sepay/sepay-webhook.controller';
import { SepayWebhookService } from './sepay/sepay-webhook.service';
import { VnpayController } from './vnpay/vnpay.controller';
import { VnpayGateway } from './vnpay/vnpay.gateway';
import { VnpayService } from './vnpay/vnpay.service';

@Module({
  imports: [BillingCoreModule, OrdersModule],
  controllers: [PaymentsController, SepayWebhookController, VnpayController, BankTransactionsController],
  providers: [PaymentsService, SepayWebhookService, VnpayGateway, VnpayService, BankTransactionsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
