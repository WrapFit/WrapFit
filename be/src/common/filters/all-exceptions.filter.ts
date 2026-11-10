import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { currentRequestId } from '../context/request-context';

interface NormalizedError {
  status: number;
  message: string | string[];
  error: string;
  /** Extra fields of an HttpException body, e.g. `fitCheck` on a 422 or a stable `code` (never added for 5xx other than 503). */
  details?: Record<string, unknown>;
}

/** 401 -> "Unauthorized", 404 -> "Not Found" (HttpStatus keys are UPPER_SNAKE_CASE). */
function statusText(status: number): string {
  const key = HttpStatus[status];
  if (!key) return 'Error';
  return key
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { status, message, error, details } = this.normalize(exception);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      ...details,
      statusCode: status,
      error,
      message,
      path: request.url,
      // Quoted by users in bug reports: finds the matching log lines.
      requestId: currentRequestId(),
      timestamp: new Date().toISOString(),
    });
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        return { status, message: body, error: statusText(status) };
      }
      const { message, error, statusCode: _statusCode, ...details } = body as {
        message?: string | string[];
        error?: string;
        statusCode?: number;
      } & Record<string, unknown>;
      return {
        status,
        message: message ?? exception.message,
        error: error ?? statusText(status),
        // 503 is a deliberate answer ("not configured / paused") with a stable `code` the client branches on; other 5xx stay opaque.
        details: status < 500 || status === HttpStatus.SERVICE_UNAVAILABLE ? details : undefined,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return { status: 409, message: 'Resource already exists', error: 'Conflict' };
        case 'P2025':
          return { status: 404, message: 'Resource not found', error: 'Not Found' };
        case 'P2003':
          return { status: 409, message: 'Related resource constraint failed', error: 'Conflict' };
        case 'P2023':
          return { status: 400, message: 'Malformed identifier', error: 'Bad Request' };
      }
    }

    return { status: 500, message: 'Internal server error', error: 'Internal Server Error' };
  }
}
