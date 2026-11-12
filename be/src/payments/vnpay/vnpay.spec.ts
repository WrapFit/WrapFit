import {
  buildPayUrl,
  isVnpaySuccess,
  signParams,
  verifyQuery,
  vnpayAmount,
  vnpayAmountOf,
  vnpayDate,
  vnpayIp,
} from './vnpay';

// Vectors were produced outside this code: `printf '%s' "<sorted, encoded name=value pairs>" | openssl dgst -sha512 -hmac <secret>`.
const SECRET = 'abcdefghijklmnopqrstuvwxyz012345';
const PAY_SIGNED =
  'vnp_Amount=1900000&vnp_Command=pay&vnp_CreateDate=20261110170000&vnp_CurrCode=VND&vnp_ExpireDate=20261110171500' +
  '&vnp_IpAddr=203.0.113.5&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+WFABCDEF&vnp_OrderType=other' +
  '&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A3000%2Fpayments%2Fvnpay-return&vnp_TmnCode=ABCD1234&vnp_TxnRef=WFABCDEF&vnp_Version=2.1.0';
const PAY_HASH =
  '95dc720e9983b5f226422db30c2f4b3f3163bc964c5cfbe25e5422018cf51c892782a0167f4b3d8495dd1ac859ccf6b15eff96b82993ffd93cf4b3cfc9c78602';
const RETURN_HASH =
  'dd4b59c55c2f84ce9b567f40b0cef4f8509debfcf5f47d0dbe54a66747eb0489ddad76aca293eb9edea618e4b1b13bba3a879e2adf1fd7afd466d75e48a8c31e';

const created = new Date('2026-11-10T10:00:00.000Z'); // 17:00:00 in GMT+7
const input = {
  payUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  tmnCode: 'ABCD1234',
  hashSecret: SECRET,
  returnUrl: 'http://localhost:3000/payments/vnpay-return',
  reference: 'WFABCDEF',
  amountVnd: 19_000,
  ipAddr: '203.0.113.5',
  createdAt: created,
  expiresAt: new Date(created.getTime() + 15 * 60_000),
  orderInfo: 'Thanh toan WFABCDEF',
};

/** What VNPay appends to the return URL / IPN after a successful payment. */
const returnQuery = (over: Record<string, string> = {}): Record<string, string> => ({
  vnp_Amount: '1900000',
  vnp_BankCode: 'NCB',
  vnp_OrderInfo: 'Thanh toan WFABCDEF',
  vnp_ResponseCode: '00',
  vnp_TmnCode: 'ABCD1234',
  vnp_TransactionNo: '14000001',
  vnp_TransactionStatus: '00',
  vnp_TxnRef: 'WFABCDEF',
  vnp_SecureHash: RETURN_HASH,
  ...over,
});

describe('vnpay', () => {
  describe('buildPayUrl', () => {
    it('signs the sorted, URL-encoded parameters with HMAC-SHA512 (fixed vector)', () => {
      expect(buildPayUrl(input)).toBe(`${input.payUrl}?${PAY_SIGNED}&vnp_SecureHash=${PAY_HASH}`);
    });

    it('sends the amount times 100, the reference as TxnRef and the payment expiry as ExpireDate', () => {
      const url = new URL(buildPayUrl(input));
      expect(url.searchParams.get('vnp_Amount')).toBe('1900000');
      expect(vnpayAmount(79_000)).toBe(7_900_000);
      expect(url.searchParams.get('vnp_TxnRef')).toBe('WFABCDEF');
      expect(url.searchParams.get('vnp_ExpireDate')).toBe('20261110171500');
      expect(url.searchParams.get('vnp_Version')).toBe('2.1.0');
      expect(url.searchParams.get('vnp_Command')).toBe('pay');
      expect(url.searchParams.get('vnp_CurrCode')).toBe('VND');
      expect(url.searchParams.get('vnp_ReturnUrl')).toBe(input.returnUrl);
      expect(url.searchParams.get('vnp_OrderInfo')).toBe('Thanh toan WFABCDEF');
    });

    it('the URL it builds verifies', () => {
      const url = new URL(buildPayUrl(input));
      const query = Object.fromEntries(url.searchParams.entries());
      expect(verifyQuery(query, SECRET).valid).toBe(true);
    });
  });

  describe('vnpayDate', () => {
    it('is yyyyMMddHHmmss in GMT+7', () => {
      expect(vnpayDate(new Date('2026-11-10T10:00:00.000Z'))).toBe('20261110170000');
      // 17:30 UTC is already the next day in Vietnam.
      expect(vnpayDate(new Date('2026-12-31T17:30:05.000Z'))).toBe('20270101003005');
      expect(vnpayDate(new Date('2026-01-02T00:00:00.000Z'))).toBe('20260102070000');
    });

    it('does not depend on the time zone of the server', () => {
      const previous = process.env.TZ;
      try {
        for (const tz of ['UTC', 'America/Los_Angeles', 'Asia/Ho_Chi_Minh', 'Pacific/Kiritimati']) {
          process.env.TZ = tz;
          expect(vnpayDate(new Date('2026-11-10T10:00:00.000Z'))).toBe('20261110170000');
        }
      } finally {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
      }
    });
  });

  describe('signParams', () => {
    it('encodes a space as +, so "Thanh toan X" and "Thanh+toan+X" differ only by the encoding', () => {
      expect(signParams({ vnp_OrderInfo: 'Thanh toan X' }, SECRET)).toBe(signParams({ vnp_OrderInfo: 'Thanh toan X' }, SECRET));
      expect(signParams({ vnp_OrderInfo: 'Thanh toan X' }, SECRET)).not.toBe(signParams({ vnp_OrderInfo: 'Thanh+toan+X' }, SECRET));
    });

    it('does not depend on the order the parameters come in', () => {
      expect(signParams({ vnp_B: '2', vnp_A: '1' }, SECRET)).toBe(signParams({ vnp_A: '1', vnp_B: '2' }, SECRET));
    });
  });

  describe('verifyQuery', () => {
    it('accepts a correctly signed return query (fixed vector) and hands back the vnp_ parameters', () => {
      const { valid, params } = verifyQuery(returnQuery(), SECRET);
      expect(valid).toBe(true);
      expect(params).toMatchObject({ vnp_TxnRef: 'WFABCDEF', vnp_TransactionNo: '14000001' });
      expect(params).not.toHaveProperty('vnp_SecureHash');
    });

    it('ignores vnp_SecureHashType, parameters that are not vnp_*, and the case of the hash', () => {
      const query = returnQuery({ vnp_SecureHashType: 'HmacSHA512', utm: 'x', vnp_SecureHash: RETURN_HASH.toUpperCase() });
      expect(verifyQuery(query, SECRET).valid).toBe(true);
    });

    it('rejects a tampered parameter, a wrong secret, a missing or short hash and a repeated parameter', () => {
      expect(verifyQuery(returnQuery({ vnp_Amount: '100' }), SECRET).valid).toBe(false);
      expect(verifyQuery(returnQuery({ vnp_ResponseCode: '24' }), SECRET).valid).toBe(false);
      expect(verifyQuery(returnQuery({ vnp_TxnRef: 'WFZZZZZZ' }), SECRET).valid).toBe(false);
      expect(verifyQuery(returnQuery({ extra: '1', vnp_Extra: '1' }), SECRET).valid).toBe(false);
      expect(verifyQuery(returnQuery(), 'another-secret-another-secret-0000').valid).toBe(false);
      expect(verifyQuery(returnQuery({ vnp_SecureHash: '' }), SECRET).valid).toBe(false);
      expect(verifyQuery(returnQuery({ vnp_SecureHash: RETURN_HASH.slice(0, 64) }), SECRET).valid).toBe(false);
      expect(verifyQuery({ ...returnQuery(), vnp_TxnRef: ['WFABCDEF', 'WFABCDEF'] }, SECRET)).toEqual({ valid: false, params: {} });
      const { vnp_SecureHash: _hash, ...unsigned } = returnQuery();
      expect(verifyQuery(unsigned, SECRET).valid).toBe(false);
    });

    it('gives back no parameters when the signature is wrong', () => {
      expect(verifyQuery(returnQuery({ vnp_Amount: '1' }), SECRET)).toEqual({ valid: false, params: {} });
    });
  });

  describe('helpers', () => {
    it('isVnpaySuccess needs ResponseCode 00 and TransactionStatus 00', () => {
      expect(isVnpaySuccess({ vnp_ResponseCode: '00', vnp_TransactionStatus: '00' })).toBe(true);
      expect(isVnpaySuccess({ vnp_ResponseCode: '00', vnp_TransactionStatus: '02' })).toBe(false);
      expect(isVnpaySuccess({ vnp_ResponseCode: '24', vnp_TransactionStatus: '02' })).toBe(false);
      expect(isVnpaySuccess({})).toBe(false);
    });

    it('vnpayAmountOf reads whole numbers only', () => {
      expect(vnpayAmountOf({ vnp_Amount: '1900000' })).toBe(1_900_000);
      expect(vnpayAmountOf({ vnp_Amount: '19000.5' })).toBeNull();
      expect(vnpayAmountOf({ vnp_Amount: '-1' })).toBeNull();
      expect(vnpayAmountOf({})).toBeNull();
    });

    it('vnpayIp unwraps IPv4-mapped IPv6 and falls back to loopback for addresses the gateway refuses', () => {
      expect(vnpayIp('203.0.113.5')).toBe('203.0.113.5');
      expect(vnpayIp('::ffff:203.0.113.5')).toBe('203.0.113.5');
      expect(vnpayIp('2001:db8::1')).toBe('2001:db8::1');
      expect(vnpayIp('::1')).toBe('127.0.0.1');
      expect(vnpayIp(undefined)).toBe('127.0.0.1');
    });
  });
});
