import { BadRequestException, Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common';
import { SepayPayloadError } from './sepay-webhook';
import { SepayWebhookService } from './sepay-webhook.service';

/**
 * Server-to-server: no cookie, no Origin header (OriginGuard lets such a request through), authenticated by API key.
 * The body is typed `unknown` on purpose: the global ValidationPipe rejects unknown properties, and SePay may add
 * fields to its payload at any time; `parseSepayPayload` reads only what matching needs.
 */
@ApiTags('webhooks')
@Controller('webhooks/sepay')
export class SepayWebhookController {
  constructor(private readonly sepay: SepayWebhookService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'SePay báo tiền về (header Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>): khớp mã WF… và đúng số tiền thì xác nhận thanh toán, còn lại lưu UNMATCHED',
  })
  @ApiBody({
    description:
      'Payload webhook SePay: id, gateway, transactionDate, accountNumber, code, content, transferType, transferAmount, accumulated, subAccount, referenceCode, description',
    schema: { type: 'object' },
  })
  async receive(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    // The key is checked before the body is looked at, so a stranger learns nothing about the payload rules.
    this.sepay.authorize(authorization);
    try {
      await this.sepay.handle(body);
    } catch (error) {
      if (error instanceof SepayPayloadError) throw new BadRequestException(error.message);
      throw error;
    }
    return { success: true };
  }
}
