import { ExecutionContext, Logger, NotFoundException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { loggableUrl } from '../utils/log-url.util';
import { LoggingInterceptor } from './logging.interceptor';

const TOKEN = 'Abc_DEFghijklmnopqrstu-9';

const contextFor = (method: string, originalUrl: string, statusCode = 200) =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => ({ method, originalUrl }), getResponse: () => ({ statusCode }) }),
  }) as unknown as ExecutionContext;

describe('loggableUrl (audit finding 21)', () => {
  it('keeps the first 4 characters of a review token and masks the rest', () => {
    expect(loggableUrl(`/api/review/${TOKEN}`)).toBe('/api/review/Abc_***');
    expect(loggableUrl(`/api/review/${TOKEN}/comments`)).toBe('/api/review/Abc_***/comments');
    expect(loggableUrl(`/api/review/${TOKEN}/approve?x=1`)).toBe('/api/review/Abc_***/approve?x=1');
  });

  it('leaves other paths alone, the owner side of the review included', () => {
    expect(loggableUrl('/api/projects/7f1c/review/link')).toBe('/api/projects/7f1c/review/link');
    expect(loggableUrl('/api/templates?page=2')).toBe('/api/templates?page=2');
  });
});

describe('LoggingInterceptor', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => log.mockRestore());

  it('never writes a full review token to the access log', async () => {
    const interceptor = new LoggingInterceptor();
    await lastValueFrom(interceptor.intercept(contextFor('GET', `/api/review/${TOKEN}`), { handle: () => of({}) }));
    await lastValueFrom(
      interceptor.intercept(contextFor('POST', `/api/review/${TOKEN}/comments`), {
        handle: () => throwError(() => new NotFoundException()),
      }),
    ).catch(() => undefined);

    const lines = log.mock.calls.map(([line]) => String(line));
    expect(lines).toEqual([expect.stringMatching(/^GET \/api\/review\/Abc_\*\*\* 200 /), expect.stringMatching(/^POST \/api\/review\/Abc_\*\*\*\/comments 404 /)]);
    for (const line of lines) expect(line).not.toContain(TOKEN.slice(4));
  });
});
