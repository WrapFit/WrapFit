import { Module } from '@nestjs/common';
import { NotificationsCoreModule } from '../notifications/notifications.module';
import { PrintShopsModule } from '../print-shops';
import { OrderFollowUpTask } from './order-follow-up.task';
import { OrderMessagesService } from './order-messages.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PartnerController } from './partner.controller';

@Module({
  imports: [PrintShopsModule, NotificationsCoreModule],
  controllers: [OrdersController, PartnerController],
  providers: [OrdersService, OrderMessagesService, OrderFollowUpTask],
  exports: [OrdersService],
})
export class OrdersModule {}
