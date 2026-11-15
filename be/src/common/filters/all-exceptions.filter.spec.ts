import { ArgumentsHost, HttpException, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

const hostFor = (url = '/api/x') => {
  const response = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ method: 'GET', url, originalUrl: url }) }),
  } as unknown as ArgumentsHost;
  return { host, response };
};

describe('AllExceptionsFilter', () => {
  it('sends Retry-After with a 429 that says when to come back', () => {
    const { host, response } = hostFor();
    new AllExceptionsFilter().catch(
      new HttpException({ code: 'STOCK_RATE_LIMITED', message: 'busy', retryAfterSeconds: 89.2 }, HttpStatus.TOO_MANY_REQUESTS),
      host,
    );
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '90');
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'STOCK_RATE_LIMITED', retryAfterSeconds: 89.2 }));
  });

  it('adds no Retry-After to other errors', () => {
    const { host, response } = hostFor();
    new AllExceptionsFilter().catch(new NotFoundException('nope'), host);
    new AllExceptionsFilter().catch(new HttpException('slow down', HttpStatus.TOO_MANY_REQUESTS), host);
    expect(response.setHeader).not.toHaveBeenCalled();
  });

  it('masks a review link token in the error log (audit finding 21)', () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { host } = hostFor('/api/review/Abc_DEFghijklmnopqrstu-9/approve');
    new AllExceptionsFilter().catch(new Error('boom'), host);
    expect(error).toHaveBeenCalledWith('GET /api/review/Abc_***/approve -> 500', expect.any(String));
    error.mockRestore();
  });
});
