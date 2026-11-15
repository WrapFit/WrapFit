import { ArgumentsHost, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

const hostFor = () => {
  const response = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ method: 'GET', url: '/api/x' }) }),
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
});
