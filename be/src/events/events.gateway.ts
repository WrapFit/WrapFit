import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Role } from '@prisma/client';
import { parse as parseCookies } from 'cookie';
import { Namespace, Socket } from 'socket.io';
import { ACCESS_COOKIE, AuthUser, ConfigService, JwtPayload, SESSIONS_REVOKED, SessionsRevokedEvent } from '../common';
import { PrismaService } from '../shared/prisma';

/**
 * Real-time channel: Socket.IO namespace `/events`, served under `/api/socket.io` so that the `wf_access`
 * cookie (path `/api`) is sent with the handshake and the Next.js `/api/*` proxy covers it.
 *
 * Browser:  io(`${API_ORIGIN}/events`, { path: '/api/socket.io', withCredentials: true })
 * Other clients may pass the access token instead: { auth: { token: '<accessToken>' } }
 * Every socket joins the room `user:<id>` (and `admins` for admins). The token is checked once, at the handshake: a
 * socket is closed when its access token expires (the client reconnects with the refreshed cookie) and when the
 * sessions of its user are revoked (SESSIONS_REVOKED).
 */
@WebSocketGateway({ namespace: 'events', path: '/api/socket.io' })
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  private server: Namespace;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Namespace): void {
    // Handshake authentication: reject the connection before it is established.
    server.use(async (socket, next) => {
      try {
        const token = this.extractToken(socket);
        if (!token) throw new Error('Missing token');

        const payload = await this.jwtService.verifyAsync<JwtPayload & { exp?: number }>(token, {
          secret: this.config.get('auth.jwt.accessSecret'),
        });
        if (typeof payload.exp !== 'number') throw new Error('Token without expiry');
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, role: true, isActive: true, sessionVersion: true },
        });
        if (!user || !user.isActive) throw new Error('Inactive user');
        if (user.sessionVersion !== (payload.sv ?? 0)) throw new Error('Session revoked');

        const authUser: AuthUser = { id: user.id, email: user.email, role: user.role };
        socket.data.user = authUser;
        socket.data.expiresAt = payload.exp * 1000;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const user = client.data.user as AuthUser;
    await client.join(`user:${user.id}`);
    if (user.role === Role.ADMIN) await client.join('admins');
    // setTimeout holds at most ~24.8 days; access tokens live minutes.
    const lifetime = Math.min(Math.max((client.data.expiresAt as number) - Date.now(), 0), 2 ** 31 - 1);
    client.data.expiryTimer = setTimeout(() => client.disconnect(true), lifetime);
    this.logger.log(`Client connected: ${client.id} (user ${user.id})`);
  }

  handleDisconnect(client: Socket): void {
    clearTimeout(client.data.expiryTimer as NodeJS.Timeout | undefined);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing() {
    return { event: 'pong', data: { timestamp: new Date().toISOString() } };
  }

  @OnEvent(SESSIONS_REVOKED)
  closeSessions({ userId }: SessionsRevokedEvent): void {
    this.server.in(`user:${userId}`).disconnectSockets(true);
  }

  /** Sends an event to every connected client. */
  emitToAll(event: string, payload: unknown): void {
    this.server.emit(event, payload);
  }

  /** Sends an event to all sockets of one user (any device). */
  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  private extractToken(socket: Socket): string | undefined {
    const fromAuth = socket.handshake.auth?.token;
    if (typeof fromAuth === 'string' && fromAuth) return fromAuth;

    const header = socket.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7);

    const cookieHeader = socket.handshake.headers.cookie;
    return cookieHeader ? parseCookies(cookieHeader)[ACCESS_COOKIE] : undefined;
  }
}
