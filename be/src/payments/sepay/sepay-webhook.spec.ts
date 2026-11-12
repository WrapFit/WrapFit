import {
  authorizationMatches,
  extractReferences,
  parseSepayDate,
  parseSepayPayload,
  SepayPayloadError,
  tokenFromAuthorization,
} from './sepay-webhook';

describe('extractReferences', () => {
  it('finds the reference in plain and prefixed content', () => {
    expect(extractReferences('WFAB23CD')).toEqual(['WFAB23CD']);
    expect(extractReferences('MBVCB.1234567.WFAB23CD.CT tu 0123 NGUYEN VAN A')).toEqual(['WFAB23CD']);
    expect(extractReferences('NGUYEN VAN A chuyen tien WFAB23CD')).toEqual(['WFAB23CD']);
  });

  it('is case-insensitive: banks upper-case the content, a customer may type lower case', () => {
    expect(extractReferences('wfab23cd')).toEqual(['WFAB23CD']);
    expect(extractReferences('thanh toan Wfab23cD')).toEqual(['WFAB23CD']);
  });

  it('survives a bank that splits the reference with spaces', () => {
    expect(extractReferences('WF AB23 CD')).toEqual(['WFAB23CD']);
    expect(extractReferences('chuyen tien WF AB23\nCD cam on')).toEqual(['WFAB23CD']);
  });

  it('ignores look-alike characters outside the reference alphabet (O, 0, I, 1)', () => {
    expect(extractReferences('WFAB0ICD')).toEqual([]);
    expect(extractReferences('WFABO1CD')).toEqual([]);
  });

  it('falls back to the code SePay recognised, and lists each candidate once', () => {
    expect(extractReferences('chuyen tien', 'WFAB23CD')).toEqual(['WFAB23CD']);
    expect(extractReferences('WFAB23CD', 'WFAB23CD')).toEqual(['WFAB23CD']);
    expect(extractReferences('WFAB23CD WFXY45ZZ', null)).toEqual(['WFAB23CD', 'WFXY45ZZ']);
  });

  it('returns nothing for content without a reference', () => {
    expect(extractReferences('')).toEqual([]);
    expect(extractReferences('NGUYEN VAN A chuyen tien an trua')).toEqual([]);
    expect(extractReferences('WF')).toEqual([]);
    expect(extractReferences('WFAB23C')).toEqual([]);
  });
});

describe('Authorization header', () => {
  const key = 'test-sepay-key-0123456789';

  it('accepts the Apikey scheme SePay sends and the Bearer scheme, any case', () => {
    expect(authorizationMatches(`Apikey ${key}`, key)).toBe(true);
    expect(authorizationMatches(`apikey ${key}`, key)).toBe(true);
    expect(authorizationMatches(`Bearer ${key}`, key)).toBe(true);
    expect(authorizationMatches(`Apikey   ${key}  `, key)).toBe(true);
  });

  it('refuses a wrong, truncated, extended, bare or missing key', () => {
    expect(authorizationMatches('Apikey wrong-key-0123456789abc', key)).toBe(false);
    expect(authorizationMatches(`Apikey ${key.slice(0, -1)}`, key)).toBe(false);
    expect(authorizationMatches(`Apikey ${key}x`, key)).toBe(false);
    expect(authorizationMatches(key, key)).toBe(false);
    expect(authorizationMatches(`Basic ${key}`, key)).toBe(false);
    expect(authorizationMatches('Apikey', key)).toBe(false);
    expect(authorizationMatches('', key)).toBe(false);
    expect(authorizationMatches(undefined, key)).toBe(false);
  });

  it('refuses everything while no key is configured', () => {
    expect(authorizationMatches('Apikey anything-at-all-123', null)).toBe(false);
    expect(authorizationMatches('Apikey ', null)).toBe(false);
    expect(authorizationMatches(undefined, null)).toBe(false);
  });

  it('reads the token out of the header', () => {
    expect(tokenFromAuthorization('Apikey abc')).toBe('abc');
    expect(tokenFromAuthorization('Bearer abc')).toBe('abc');
    expect(tokenFromAuthorization('abc')).toBeNull();
    expect(tokenFromAuthorization('Apikey a b')).toBeNull();
  });
});

describe('parseSepayPayload', () => {
  const sample = {
    id: 92704,
    gateway: 'Vietcombank',
    transactionDate: '2024-07-02 11:08:33',
    accountNumber: '1017588888',
    code: null,
    content: 'WFAB23CD',
    transferType: 'in',
    transferAmount: 19000,
    accumulated: 105000000,
    subAccount: null,
    referenceCode: 'FT24012345678',
    description: 'NGUYEN VAN A chuyen tien',
    somethingNew: 'SePay may add fields',
  };

  it('reads the documented fields and tolerates extra and null ones', () => {
    expect(parseSepayPayload(sample)).toMatchObject({
      id: 92704,
      gateway: 'Vietcombank',
      accountNumber: '1017588888',
      code: null,
      content: 'WFAB23CD',
      transferType: 'in',
      transferAmount: 19000,
      referenceCode: 'FT24012345678',
    });
    expect(parseSepayPayload({ id: 1, transferType: 'in', transferAmount: 5 }).content).toBe('');
  });

  it('accepts a numeric string id and a numeric string amount', () => {
    expect(parseSepayPayload({ ...sample, id: '92704', transferAmount: '19000' })).toMatchObject({
      id: 92704,
      transferAmount: 19000,
    });
  });

  it('lower-cases transferType', () => {
    expect(parseSepayPayload({ ...sample, transferType: 'OUT' }).transferType).toBe('out');
  });

  it.each([
    ['not an object', 'text'],
    ['an array', []],
    ['no id', { ...sample, id: undefined }],
    ['a zero id', { ...sample, id: 0 }],
    ['a fractional id', { ...sample, id: 1.5 }],
    ['no transferType', { ...sample, transferType: undefined }],
    ['a negative amount', { ...sample, transferAmount: -1 }],
    ['a text amount', { ...sample, transferAmount: 'a lot' }],
  ])('rejects %s', (_name, body) => {
    expect(() => parseSepayPayload(body)).toThrow(SepayPayloadError);
  });
});

describe('parseSepayDate', () => {
  const fallback = new Date('2000-01-01T00:00:00Z');

  it('reads SePay time as Vietnam time (GMT+7)', () => {
    expect(parseSepayDate('2024-07-02 11:08:33', fallback).toISOString()).toBe('2024-07-02T04:08:33.000Z');
  });

  it('falls back when the date is unreadable', () => {
    expect(parseSepayDate('', fallback)).toBe(fallback);
    expect(parseSepayDate('yesterday', fallback)).toBe(fallback);
    expect(parseSepayDate('2024-13-45 99:99:99', fallback)).toBe(fallback);
  });
});
