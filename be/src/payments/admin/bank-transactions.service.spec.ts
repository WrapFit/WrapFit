import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BankTxStatus, PaymentConfirmation, PaymentProvider, PaymentStatus } from '@prisma/client';
import type { PrismaService } from '../../shared/prisma';
import type { PaymentsService } from '../payments.service';
import { BankTransactionsService } from './bank-transactions.service';

type BankTxRow = { id: string; externalId: string; amountVnd: number; status: BankTxStatus; extractedReference: string | null };
type PaymentRow = { id: string; amountVnd: number; status: PaymentStatus; provider: PaymentProvider };

const bankTx = (over: Partial<BankTxRow> = {}): BankTxRow => ({
  id: 'tx-1',
  externalId: '9001',
  amountVnd: 19_000,
  status: BankTxStatus.UNMATCHED,
  extractedReference: null,
  ...over,
});
const payment = (over: Partial<PaymentRow> = {}): PaymentRow => ({
  id: 'pay-1',
  amountVnd: 19_000,
  status: PaymentStatus.EXPIRED,
  provider: PaymentProvider.VIETQR,
  ...over,
});

/** The service over a fake transaction holding one bank transaction row and the payments the lookup can see. */
function setup({ row = bankTx() as BankTxRow | null, payments = [payment()], ignoreCount = 1 } = {}) {
  const update = jest.fn().mockResolvedValue({});
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue(row ? [{ id: row.id }] : []),
    bankTransaction: { findUniqueOrThrow: jest.fn().mockResolvedValue(row), update },
    payment: {
      findFirst: jest.fn(async ({ where }: { where: { provider: PaymentProvider } }) =>
        payments.find((p) => p.provider === where.provider) ?? null,
      ),
    },
  };
  const view = { id: 'tx-1', status: BankTxStatus.RESOLVED };
  const prisma = {
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    bankTransaction: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 'tx-1',
        externalId: '9001',
        gateway: 'VCB',
        accountNo: '1',
        amountVnd: 19_000,
        content: 'x',
        bankReference: 'FT1',
        extractedReference: null,
        transactionAt: new Date(),
        status: view.status,
        unmatchedReason: null,
        resolvedBy: null,
        resolvedNote: null,
        createdAt: new Date(),
        payment: null,
      }),
      updateMany: jest.fn().mockResolvedValue({ count: ignoreCount }),
      findUnique: jest.fn().mockResolvedValue(row ? { status: row.status } : null),
    },
  } as unknown as PrismaService;
  const confirmPaid = jest.fn().mockResolvedValue({});
  const service = new BankTransactionsService(prisma, { confirmPaid } as unknown as PaymentsService);
  return { service, tx, update, confirmPaid, prisma };
}

describe('BankTransactionsService.resolve assign', () => {
  it('confirms the payment as ADMIN even when expired, then marks the transfer RESOLVED', async () => {
    const { service, confirmPaid, update } = setup();
    await service.resolve('tx-1', { action: 'assign', paymentReference: 'WFAB23CD', note: 'khách chuyển trễ' }, 'admin-1');

    expect(confirmPaid).toHaveBeenCalledWith(expect.anything(), 'pay-1', {
      via: PaymentConfirmation.ADMIN,
      providerTxnId: '9001',
      allowExpired: true,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'tx-1' },
      data: {
        status: BankTxStatus.RESOLVED,
        paymentId: 'pay-1',
        extractedReference: 'WFAB23CD',
        resolvedBy: 'admin-1',
        resolvedNote: 'khách chuyển trễ',
      },
    });
  });

  it('accepts a transfer larger than the payment and refuses a smaller one', async () => {
    const over = setup({ row: bankTx({ amountVnd: 25_000 }) });
    await over.service.resolve('tx-1', { action: 'assign', paymentReference: 'WFAB23CD' }, 'admin-1');
    expect(over.confirmPaid).toHaveBeenCalledTimes(1);

    const under = setup({ row: bankTx({ amountVnd: 18_999 }) });
    await expect(
      under.service.resolve('tx-1', { action: 'assign', paymentReference: 'WFAB23CD' }, 'admin-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(under.confirmPaid).not.toHaveBeenCalled();
    expect(under.update).not.toHaveBeenCalled();
  });

  it('answers 409 for an already PAID payment and for a transfer that is not UNMATCHED', async () => {
    const paid = setup({ payments: [payment({ status: PaymentStatus.PAID })] });
    await expect(
      paid.service.resolve('tx-1', { action: 'assign', paymentReference: 'WFAB23CD' }, 'admin-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(paid.confirmPaid).not.toHaveBeenCalled();

    const done = setup({ row: bankTx({ status: BankTxStatus.RESOLVED }) });
    await expect(
      done.service.resolve('tx-1', { action: 'assign', paymentReference: 'WFAB23CD' }, 'admin-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(done.confirmPaid).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown transfer, an unknown reference and a VNPay payment', async () => {
    const missing = setup({ row: null });
    await expect(
      missing.service.resolve('tx-1', { action: 'assign', paymentReference: 'WFAB23CD' }, 'admin-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    const unknown = setup({ payments: [] });
    await expect(
      unknown.service.resolve('tx-1', { action: 'assign', paymentReference: 'WFAB23CD' }, 'admin-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    const vnpay = setup({ payments: [payment({ provider: PaymentProvider.VNPAY })] });
    await expect(
      vnpay.service.resolve('tx-1', { action: 'assign', paymentReference: 'WFAB23CD' }, 'admin-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(vnpay.confirmPaid).not.toHaveBeenCalled();
  });

  it('locks the transfer row before reading it', async () => {
    const { service, tx } = setup();
    await service.resolve('tx-1', { action: 'assign', paymentReference: 'WFAB23CD' }, 'admin-1');
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.bankTransaction.findUniqueOrThrow.mock.invocationCallOrder[0]);
  });
});

describe('BankTransactionsService.resolve ignore', () => {
  it('moves an UNMATCHED transfer to IGNORED with the admin and the note', async () => {
    const { service, prisma } = setup();
    await service.resolve('tx-1', { action: 'ignore', note: 'đã hoàn tiền tay' }, 'admin-1');
    expect(prisma.bankTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: 'tx-1', status: BankTxStatus.UNMATCHED },
      data: { status: BankTxStatus.IGNORED, resolvedBy: 'admin-1', resolvedNote: 'đã hoàn tiền tay' },
    });
  });

  it('answers 409 when the transfer was handled already and 404 when it does not exist', async () => {
    const handled = setup({ row: bankTx({ status: BankTxStatus.IGNORED }), ignoreCount: 0 });
    await expect(handled.service.resolve('tx-1', { action: 'ignore', note: 'x' }, 'admin-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    const missing = setup({ row: null, ignoreCount: 0 });
    await expect(missing.service.resolve('tx-1', { action: 'ignore', note: 'x' }, 'admin-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
