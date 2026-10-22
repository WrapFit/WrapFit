import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { allowedOrigins, ConfigService, parseCorsOrigins, requestIdMiddleware, SocketIoAdapter } from './common';

/** Shared bootstrap configuration, used by app.ts and the e2e tests. */
export function middleware(app: INestApplication): void {
  const config = app.get(ConfigService);
  const origins = parseCorsOrigins(config.get('app.corsOrigins'));
  const swaggerEnabled = config.get('app.swaggerEnabled');

  // First: everything after it (logs, errors, queued jobs) knows the request id.
  app.use(requestIdMiddleware);
  app.use(
    helmet(
      swaggerEnabled
        ? {
            // Swagger UI needs inline scripts/styles.
            contentSecurityPolicy: {
              directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                'script-src': ["'self'", "'unsafe-inline'"],
                'img-src': ["'self'", 'data:', 'validator.swagger.io'],
              },
            },
          }
        : undefined,
    ),
  );
  app.use(cookieParser());
  // Canvas states (up to 300 elements) can exceed the 100 kB default. Images go to object storage, not the body.
  (app as NestExpressApplication).useBodyParser('json', { limit: '1mb' });
  // Behind Caddy every request comes from the proxy: trust one hop so req.ip is the client (rate limits, sessions).
  if (config.get('app.trustProxy')) (app as NestExpressApplication).set('trust proxy', 1);
  app.enableCors({ origin: origins, credentials: origins !== '*' });

  // Every route lives under /api/* so the Next.js frontend can proxy it same-origin (`rewrites: /api/:path*`).
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // ...and reject requests that send them
      transform: true,
    }),
  );

  app.useWebSocketAdapter(
    new SocketIoAdapter(app, origins, allowedOrigins(config.get('app.corsOrigins'), config.get('app.frontendUrl'))),
  );
  app.enableShutdownHooks();
}
