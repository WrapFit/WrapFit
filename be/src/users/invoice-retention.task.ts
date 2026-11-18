import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../shared/prisma';
import { scrubExpiredInvoiceData } from './invoice-retention';

/**
 * Every day at 03:30 (Vietnam time), removes the personal data of deleted accounts from accounting records whose legal
 * retention is over (scrubExpiredInvoiceData, docs/28 Q4). Records only cross the line on 1 January, so most runs
 * change nothing. Running it twice, or on several instances at once, is harmless.
 */
@Injectable()
export class InvoiceRetentionTask {
  private readonly logger = new Logger(InvoiceRetentionTask.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('30 3 * * *', { name: 'invoice-retention', timeZone: 'Asia/Ho_Chi_Minh' })
  async run(): Promise<void> {
    try {
      const { orders, payments } = await scrubExpiredInvoiceData(this.prisma);
      if (orders || payments) this.logger.log(`invoice.retention scrubbed orders=${orders} payments=${payments}`);
    } catch (error) {
      // A failed run is retried by the next day's run; never let it crash the process.
      this.logger.error('invoice.retention failed', error instanceof Error ? error.stack : String(error));
    }
  }
}
