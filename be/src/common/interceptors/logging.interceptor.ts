import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { loggableUrl } from '../utils/log-url.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    // The request id is added by AppLogger; `user` is set by JwtAuthGuard on authenticated routes.
    const log = (status: number) => {
      const userId = (request.user as { id?: string } | undefined)?.id;
      const user = userId ? ` user=${userId}` : '';
      this.logger.log(`${request.method} ${loggableUrl(request.originalUrl)} ${status} +${Date.now() - startedAt}ms${user}`);
    };

    return next.handle().pipe(
      tap({
        next: () => log(response.statusCode),
        error: (error: unknown) => log(error instanceof HttpException ? error.getStatus() : 500),
      }),
    );
  }
}
