import { configuration } from './configuration';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const valid = {
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };

  it('applies defaults and converts numeric strings', () => {
    const env = validateEnv({ ...valid, PORT: '4000' });
    expect(env.PORT).toBe(4000);
    expect(env.JWT_ACCESS_TTL_SECONDS).toBe(900);
    expect(env.SWAGGER_ENABLED).toBe('true');
  });

  it('treats SEPAY_WEBHOOK_API_KEY as optional but refuses a short or spaced one', () => {
    expect(validateEnv(valid).SEPAY_WEBHOOK_API_KEY).toBe('');
    expect(validateEnv({ ...valid, SEPAY_WEBHOOK_API_KEY: 'a'.repeat(32) }).SEPAY_WEBHOOK_API_KEY).toBe('a'.repeat(32));
    expect(() => validateEnv({ ...valid, SEPAY_WEBHOOK_API_KEY: 'short' })).toThrow(/SEPAY_WEBHOOK_API_KEY/);
    expect(() => validateEnv({ ...valid, SEPAY_WEBHOOK_API_KEY: `${'a'.repeat(16)} ${'b'.repeat(16)}` })).toThrow(
      /SEPAY_WEBHOOK_API_KEY/,
    );
  });

  it('needs VNPAY_TMN_CODE and VNPAY_HASH_SECRET together, and defaults to the sandbox', () => {
    const env = validateEnv(valid);
    expect([env.VNPAY_TMN_CODE, env.VNPAY_HASH_SECRET, env.VNPAY_RETURN_URL]).toEqual(['', '', '']);
    expect(env.VNPAY_PAY_URL).toBe('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');

    const both = { ...valid, VNPAY_TMN_CODE: 'ABCD1234', VNPAY_HASH_SECRET: 'x'.repeat(32) };
    expect(validateEnv(both).VNPAY_TMN_CODE).toBe('ABCD1234');
    expect(() => validateEnv({ ...valid, VNPAY_TMN_CODE: 'ABCD1234' })).toThrow(/VNPAY_TMN_CODE and VNPAY_HASH_SECRET/);
    expect(() => validateEnv({ ...valid, VNPAY_HASH_SECRET: 'x'.repeat(32) })).toThrow(/VNPAY_TMN_CODE and VNPAY_HASH_SECRET/);
    expect(() => validateEnv({ ...both, VNPAY_TMN_CODE: 'short' })).toThrow(/VNPAY_TMN_CODE/);
    expect(() => validateEnv({ ...both, VNPAY_RETURN_URL: 'not a url' })).toThrow(/VNPAY_RETURN_URL/);
  });

  it('refuses PAYMENT_SIMULATION=true in production with a real VietQR account (docs/25 item 6)', () => {
    const bank = { VIETQR_BANK_BIN: '970436', VIETQR_ACCOUNT_NO: '0123456789', VIETQR_ACCOUNT_NAME: 'CONG TY WRAPFIT' };
    const production = { ...valid, NODE_ENV: 'production' };
    expect(() => validateEnv({ ...production, ...bank, PAYMENT_SIMULATION: 'true' })).toThrow(
      /PAYMENT_SIMULATION=true is refused in production/,
    );
    // Real money without simulation, a demo with the sample account, or simulation outside production: allowed.
    expect(validateEnv({ ...production, ...bank, PAYMENT_SIMULATION: 'false' }).PAYMENT_SIMULATION).toBe('false');
    expect(validateEnv({ ...production, PAYMENT_SIMULATION: 'true' }).PAYMENT_SIMULATION).toBe('true');
    expect(validateEnv({ ...valid, ...bank, PAYMENT_SIMULATION: 'true' }).PAYMENT_SIMULATION).toBe('true');
  });

  it('rejects short JWT secrets', () => {
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL: _omit, ...rest } = valid;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('allows Google login to be left unconfigured', () => {
    const env = validateEnv(valid);
    expect(env.GOOGLE_CLIENT_ID).toBe('');
    expect(env.FRONTEND_URL).toBe('http://localhost:3000');
  });

  it('rejects a Google client id without its secret', () => {
    expect(() => validateEnv({ ...valid, GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com' })).toThrow(
      /GOOGLE_CLIENT_SECRET/,
    );
  });

  it('allows storage to be disabled, but not half configured', () => {
    expect(validateEnv(valid).STORAGE_BUCKET).toBe('');
    expect(() => validateEnv({ ...valid, STORAGE_BUCKET: 'wrapfit', STORAGE_ACCESS_KEY_ID: 'key' })).toThrow(
      /STORAGE_SECRET_ACCESS_KEY, STORAGE_PUBLIC_URL/,
    );
  });

  it('ignores variables it does not know, such as those of a removed service left in an old .env (docs/25 item 9)', () => {
    const leftover = { OLD_CDN_CLOUD_NAME: 'wrapfit', OLD_CDN_API_KEY: 'only-half-set' };
    expect(validateEnv({ ...valid, ...leftover }).PORT).toBe(validateEnv(valid).PORT);
    expect(JSON.stringify(configuration({ ...valid, ...leftover }))).not.toContain('only-half-set');
  });

  it('uses haiku for fast AI and keeps AI_MODEL as an alias of AI_MODEL_FAST', () => {
    const env = validateEnv(valid);
    expect(env.AI_MODEL_FAST).toBe('claude-haiku-5-5');
    expect(env.AI_MODEL_PREMIUM).toBe('claude-opus-5-5');
    expect(validateEnv({ ...valid, AI_MODEL: 'claude-sonnet-5-5' }).AI_MODEL_FAST).toBe('claude-sonnet-5-5');
    expect(
      validateEnv({ ...valid, AI_MODEL: 'claude-sonnet-5-5', AI_MODEL_FAST: 'claude-haiku-5-5' }).AI_MODEL_FAST,
    ).toBe('claude-haiku-5-5');
  });

  it('accepts an empty or numeric AI_MONTHLY_BUDGET_USD only', () => {
    expect(validateEnv(valid).AI_MONTHLY_BUDGET_USD).toBe('');
    expect(validateEnv({ ...valid, AI_MONTHLY_BUDGET_USD: '7.5' }).AI_MONTHLY_BUDGET_USD).toBe('7.5');
    expect(() => validateEnv({ ...valid, AI_MONTHLY_BUDGET_USD: '20$' })).toThrow(/AI_MONTHLY_BUDGET_USD/);
  });
});
