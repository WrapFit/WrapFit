import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ACCESS_COOKIE, CurrentUser, Roles } from '../../common';
import { BankTransactionsQueryDto, ResolveBankTransactionDto } from './bank-transactions.dto';
import { BankTransactionsService } from './bank-transactions.service';

@ApiTags('payments')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('admin/bank-transactions')
export class BankTransactionsController {
  constructor(private readonly bankTransactions: BankTransactionsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Bank transfers received through SePay, newest first (admin); `nextBefore` continues the list. status=UNMATCHED is the reconciliation queue',
  })
  list(@Query() query: BankTransactionsQueryDto) {
    return this.bankTransactions.list(query);
  }

  @Get('payment-preview/:reference')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'The VietQR payment with this reference WF… (admin), to check it before assigning a transfer to it' })
  paymentPreview(@Param('reference') reference: string) {
    return this.bankTransactions.paymentByReference(reference);
  }

  @Post(':id/resolve')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Reconcile an UNMATCHED transfer (admin). assign { paymentReference }: confirms that payment (even expired) when the transfer covers its amount → RESOLVED; 409 if it is already PAID. ignore { note } → IGNORED. 409 when the transfer is not UNMATCHED',
  })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveBankTransactionDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.bankTransactions.resolve(id, dto, actorId);
  }
}
