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

  it('allows Cloudinary to be disabled, but not half configured', () => {
    expect(validateEnv(valid).CLOUDINARY_CLOUD_NAME).toBe('');
    expect(validateEnv(valid).CLOUDINARY_FOLDER).toBe('wrapfit');
    expect(() => validateEnv({ ...valid, CLOUDINARY_CLOUD_NAME: 'wrapfit', CLOUDINARY_API_KEY: 'key' })).toThrow(
      /CLOUDINARY_API_SECRET/,
    );
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
