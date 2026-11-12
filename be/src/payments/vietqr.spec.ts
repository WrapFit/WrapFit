import { bankName, crc16, SAMPLE_ACCOUNT, vietQrPayload, vietQrSvg } from './vietqr';

/** Splits an EMVCo payload into its top-level data objects. */
function parse(payload: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (let at = 0; at < payload.length; ) {
    const id = payload.slice(at, at + 2);
    const length = Number(payload.slice(at + 2, at + 4));
    fields[id] = payload.slice(at + 4, at + 4 + length);
    at += 4 + length;
  }
  return fields;
}

const transfer = {
  bankBin: '970422',
  accountNo: '0123456789',
  accountName: 'CONG TY WRAPFIT',
  amountVnd: 19_000,
  description: 'WFABC234',
};

describe('crc16', () => {
  it('matches the CRC-16/CCITT-FALSE check value', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('pads to 4 hex digits', () => {
    expect(crc16('')).toBe('FFFF');
    expect(crc16('A')).toMatch(/^[0-9A-F]{4}$/);
  });
});

describe('vietQrPayload', () => {
  it('builds the NAPAS transfer-to-account template with amount and content', () => {
    const fields = parse(vietQrPayload(transfer));

    expect(fields['00']).toBe('01');
    expect(fields['01']).toBe('12');
    expect(fields['53']).toBe('704');
    expect(fields['54']).toBe('19000');
    expect(fields['58']).toBe('VN');

    const merchant = parse(fields['38']);
    expect(merchant['00']).toBe('A000000727');
    expect(merchant['02']).toBe('QRIBFTTA');
    expect(parse(merchant['01'])).toEqual({ '00': '970422', '01': '0123456789' });
    expect(parse(fields['62'])).toEqual({ '08': 'WFABC234' });
  });

  it('ends with the CRC of everything before it, tag 63 included', () => {
    const payload = vietQrPayload(transfer);
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
    expect(
      '00020101021238540010A00000072701240006970422011001234567890208QRIBFTTA53037045405190005802VN62120808WFABC2346304',
    ).toBe(payload.slice(0, -4));
  });

  it('keeps only characters bank apps accept in the transfer content', () => {
    const fields = parse(vietQrPayload({ ...transfer, description: 'Đơn in mẫu #12' }));
    expect(parse(fields['62'])['08']).toBe('DON IN MAU 12');
  });

  it('rejects a bad BIN, account or amount', () => {
    expect(() => vietQrPayload({ ...transfer, bankBin: '9704' })).toThrow(RangeError);
    expect(() => vietQrPayload({ ...transfer, accountNo: '01-23' })).toThrow(RangeError);
    expect(() => vietQrPayload({ ...transfer, amountVnd: 0 })).toThrow(RangeError);
    expect(() => vietQrPayload({ ...transfer, amountVnd: 1.5 })).toThrow(RangeError);
  });

  it('works with the sample account', () => {
    const payload = vietQrPayload({ ...SAMPLE_ACCOUNT, amountVnd: 49_000, description: 'WFZZZZZZ' });
    expect(parse(parse(parse(payload)['38'])['01'])['00']).toBe('970436');
  });
});

describe('bankName / vietQrSvg', () => {
  it('names known banks and falls back to the BIN', () => {
    expect(bankName('970436')).toBe('Vietcombank');
    expect(bankName('970999')).toBe('Ngân hàng 970999');
  });

  it('renders an SVG QR code', async () => {
    const svg = await vietQrSvg(vietQrPayload(transfer));
    expect(svg).toMatch(/^<svg[^>]*viewBox/);
    expect(svg).toContain('</svg>');
  });
});
