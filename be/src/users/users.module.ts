import { Module } from '@nestjs/common';
import { InvoiceRetentionTask } from './invoice-retention.task';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, InvoiceRetentionTask],
  exports: [UsersService],
})
export class UsersModule {}
