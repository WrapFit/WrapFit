import { configuration } from './configuration';

describe('configuration', () => {
  const valid = {
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };

  it('groups the validated environment by feature, with numbers and booleans', () => {
    const config = configuration({ ...valid, NODE_ENV: 'development', PORT: '4000', STORAGE_FORCE_PATH_STYLE: 'true' });
    expect(config.app.port).toBe(4000);
    expect(config.app.swaggerEnabled).toBe(true);
    expect(config.app.trustProxy).toBe(false);
    expect(config.auth.jwt.accessTtlSeconds).toBe(900);
    expect(config.storage.forcePathStyle).toBe(true);
    expect(config.mail.smtp).toMatchObject({ host: 'localhost', port: 1025, secure: false });
  });

  it('fails like env.validation on an invalid environment', () => {
    expect(() => configuration({ ...valid, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('derives the email token secret from JWT_REFRESH_SECRET when AUTH_TOKEN_SECRET is empty', () => {
    expect(configuration(valid).auth.tokenSecret).toBe(valid.JWT_REFRESH_SECRET);
    expect(configuration({ ...valid, AUTH_TOKEN_SECRET: 'c'.repeat(32) }).auth.tokenSecret).toBe('c'.repeat(32));
  });

  it('turns secure cookies on by default in production only', () => {
    expect(configuration({ ...valid, NODE_ENV: 'development' }).auth.cookieSecure).toBe(false);
    expect(configuration({ ...valid, NODE_ENV: 'production' }).auth.cookieSecure).toBe(true);
  });

  it('keeps an explicit COOKIE_SECURE over the production default', () => {
    expect(configuration({ ...valid, NODE_ENV: 'production', COOKIE_SECURE: 'false' }).auth.cookieSecure).toBe(false);
    expect(configuration({ ...valid, NODE_ENV: 'development', COOKIE_SECURE: 'true' }).auth.cookieSecure).toBe(true);
  });

  it('keeps the rest of a namespace when production overrides one key of it', () => {
    const config = configuration({ ...valid, NODE_ENV: 'production' });
    expect(config.auth.jwt.accessSecret).toBe(valid.JWT_ACCESS_SECRET);
    expect(config.auth.google.callbackUrl).toBe('http://localhost:8080/api/auth/google/callback');
  });
});
