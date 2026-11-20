import { INVOICE_RETENTION_YEARS, invoiceRetentionCutoff, scrubExpiredInvoiceData } from './invoice-retention';

describe('invoice retention (docs/18 Q4)', () => {
  it('keeps a record of year Y until 31/12/(Y + 10), Vietnam time', () => {
    expect(INVOICE_RETENTION_YEARS).toBe(10);
    // 1/1/2037 00:00 in Vietnam is 31/12/2036 17:00 UTC: records of 2026 become scrubbable.
    expect(invoiceRetentionCutoff(new Date('2036-12-31T17:00:00Z')).toISOString()).toBe('2026-12-31T17:00:00.000Z');
    // One minute earlier it is still 2036 in Vietnam: only records before 2026 are past retention.
    expect(invoiceRetentionCutoff(new Date('2036-12-31T16:59:00Z')).toISOString()).toBe('2025-12-31T17:00:00.000Z');
  });

  it('scrubs orders and payments with the same cutoff and reports both counts', async () => {
    const calls: unknown[][] = [];
    const db = {
      $executeRaw: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
        calls.push(values);
        return Promise.resolve(strings.join('').includes('UPDATE orders') ? 3 : 1);
      }),
    };
    const result = await scrubExpiredInvoiceData(db as never, new Date('2040-06-01T00:00:00Z'));
    expect(result).toEqual({ orders: 3, payments: 1 });
    expect(calls.map((values) => values.find((v) => typeof v === 'string' && v.endsWith('Z')))).toEqual([
      '2029-12-31T17:00:00.000Z',
      '2029-12-31T17:00:00.000Z',
    ]);
  });
});
