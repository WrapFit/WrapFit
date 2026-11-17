import type { Redis } from 'ioredis';
import type { EventsGateway } from '../events/events.gateway';
import { NOTIFICATIONS_CHANGED, NOTIFICATIONS_CHANNEL } from './notifications.constants';
import { NotificationsPushBridge } from './notifications-push.bridge';

describe('NotificationsPushBridge', () => {
  const userId = '0190a000-0000-7000-8000-00000000000a';
  const build = () => {
    const subscriber = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn(),
    };
    const redis = { duplicate: jest.fn().mockReturnValue(subscriber) };
    const gateway = { emitToUser: jest.fn() };
    const bridge = new NotificationsPushBridge(redis as unknown as Redis, gateway as unknown as EventsGateway);
    jest.spyOn(bridge['logger'], 'warn').mockImplementation(() => undefined);
    return { bridge, redis, subscriber, gateway };
  };

  it('subscribes on its own connection and pushes to the recipient sockets', () => {
    const { bridge, redis, subscriber, gateway } = build();
    bridge.onModuleInit();
    expect(redis.duplicate).toHaveBeenCalledWith({ enableOfflineQueue: true, maxRetriesPerRequest: null });
    expect(subscriber.subscribe).toHaveBeenCalledWith(NOTIFICATIONS_CHANNEL);

    const onMessage = subscriber.on.mock.calls.find(([name]) => name === 'message')![1] as (c: string, m: string) => void;
    onMessage(NOTIFICATIONS_CHANNEL, userId);
    expect(gateway.emitToUser).toHaveBeenCalledWith(userId, NOTIFICATIONS_CHANGED, {});
  });

  it('ignores other channels and messages that are not a user id', () => {
    const { bridge, gateway } = build();
    bridge.deliver('other', userId);
    bridge.deliver(NOTIFICATIONS_CHANNEL, 'user:1');
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('never throws when the push itself fails', () => {
    const { bridge, gateway } = build();
    gateway.emitToUser.mockImplementation(() => {
      throw new Error('server not ready');
    });
    expect(() => bridge.deliver(NOTIFICATIONS_CHANNEL, userId)).not.toThrow();
  });

  it('does not fail the API start when Redis refuses the subscription', async () => {
    const { bridge, subscriber } = build();
    subscriber.subscribe.mockRejectedValue(new Error('ECONNREFUSED'));
    expect(() => bridge.onModuleInit()).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
    await bridge.onModuleDestroy();
    expect(subscriber.quit).toHaveBeenCalled();
  });
});
