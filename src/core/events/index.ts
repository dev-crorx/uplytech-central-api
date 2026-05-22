import { EventEmitter2 } from 'eventemitter2';
import { logger } from '../logger';
import { prisma } from '../database';

export interface EventPayload {
  type: string;
  source: string;
  data: Record<string, unknown>;
  userId?: string;
  timestamp?: Date;
}

class EventBus {
  private emitter: EventEmitter2;
  private static instance: EventBus;

  private constructor() {
    this.emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      maxListeners: 100,
      verboseMemoryLeak: true,
    });
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  async emit(event: string, payload: EventPayload): Promise<void> {
    const enrichedPayload: EventPayload = {
      ...payload,
      timestamp: new Date(),
    };

    this.emitter.emit(event, enrichedPayload);

    try {
      await prisma.eventLog.create({
        data: {
          type: event,
          source: payload.source,
          data: payload.data as object,
          status: 'processed',
          processedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to persist event', { event, error });
    }
  }

  on(event: string, handler: (payload: EventPayload) => void | Promise<void>): void {
    this.emitter.on(event, async (payload: EventPayload) => {
      try {
        await handler(payload);
      } catch (error) {
        logger.error('Event handler error', { event, error });
      }
    });
  }

  off(event: string, handler: (payload: EventPayload) => void): void {
    this.emitter.off(event, handler);
  }

  once(event: string, handler: (payload: EventPayload) => void | Promise<void>): void {
    this.emitter.once(event, async (payload: EventPayload) => {
      try {
        await handler(payload);
      } catch (error) {
        logger.error('Event handler error', { event, error });
      }
    });
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}

export const eventBus = EventBus.getInstance();

export const EventTypes = {
  AUTH: {
    LOGIN: 'auth.login',
    LOGOUT: 'auth.logout',
    REGISTER: 'auth.register',
    PASSWORD_RESET: 'auth.password_reset',
    TOKEN_REFRESH: 'auth.token_refresh',
    TWO_FACTOR_ENABLED: 'auth.two_factor_enabled',
    API_KEY_CREATED: 'auth.api_key_created',
    PASSKEY_REGISTERED: 'auth.passkey_registered',
  },
  USER: {
    CREATED: 'user.created',
    UPDATED: 'user.updated',
    DELETED: 'user.deleted',
    STATUS_CHANGED: 'user.status_changed',
    ROLE_ASSIGNED: 'user.role_assigned',
    ROLE_REMOVED: 'user.role_removed',
  },
  TEAM: {
    CREATED: 'team.created',
    UPDATED: 'team.updated',
    DELETED: 'team.deleted',
    MEMBER_ADDED: 'team.member_added',
    MEMBER_REMOVED: 'team.member_removed',
  },
  GROUP: {
    CREATED: 'group.created',
    UPDATED: 'group.updated',
    DELETED: 'group.deleted',
    MEMBER_ADDED: 'group.member_added',
    MEMBER_REMOVED: 'group.member_removed',
  },
  BLOG: {
    CREATED: 'blog.created',
    UPDATED: 'blog.updated',
    PUBLISHED: 'blog.published',
    DELETED: 'blog.deleted',
  },
  COMMENT: {
    CREATED: 'comment.created',
    UPDATED: 'comment.updated',
    DELETED: 'comment.deleted',
  },
  REACTION: {
    ADDED: 'reaction.added',
    REMOVED: 'reaction.removed',
  },
  TICKET: {
    CREATED: 'ticket.created',
    UPDATED: 'ticket.updated',
    ASSIGNED: 'ticket.assigned',
    RESOLVED: 'ticket.resolved',
    CLOSED: 'ticket.closed',
    MESSAGE_ADDED: 'ticket.message_added',
  },
  FRIEND: {
    REQUEST_SENT: 'friend.request_sent',
    REQUEST_ACCEPTED: 'friend.request_accepted',
    REQUEST_REJECTED: 'friend.request_rejected',
    REMOVED: 'friend.removed',
  },
  PRODUCT: {
    CREATED: 'product.created',
    UPDATED: 'product.updated',
    DELETED: 'product.deleted',
  },
  LICENSE: {
    CREATED: 'license.created',
    ACTIVATED: 'license.activated',
    REVOKED: 'license.revoked',
    EXPIRED: 'license.expired',
  },
  DEVICE: {
    REGISTERED: 'device.registered',
    UPDATED: 'device.updated',
    REMOVED: 'device.removed',
  },
  PAYMENT: {
    CREATED: 'payment.created',
    COMPLETED: 'payment.completed',
    FAILED: 'payment.failed',
    REFUNDED: 'payment.refunded',
  },
  SUBSCRIPTION: {
    CREATED: 'subscription.created',
    RENEWED: 'subscription.renewed',
    CANCELLED: 'subscription.cancelled',
    EXPIRED: 'subscription.expired',
  },
  NOTIFICATION: {
    SENT: 'notification.sent',
    READ: 'notification.read',
  },
  CHAT: {
    MESSAGE_SENT: 'chat.message_sent',
    ROOM_CREATED: 'chat.room_created',
    MEMBER_JOINED: 'chat.member_joined',
    MEMBER_LEFT: 'chat.member_left',
  },
  EMAIL: {
    SENT: 'email.sent',
    RECEIVED: 'email.received',
    FAILED: 'email.failed',
  },
  STORAGE: {
    FILE_UPLOADED: 'storage.file_uploaded',
    FILE_DELETED: 'storage.file_deleted',
  },
  ECONOMY: {
    TRANSFER: 'economy.transfer',
    PURCHASE: 'economy.purchase',
    REWARD: 'economy.reward',
  },
  TOURNAMENT: {
    CREATED: 'tournament.created',
    STARTED: 'tournament.started',
    COMPLETED: 'tournament.completed',
    MATCH_COMPLETED: 'tournament.match_completed',
  },
  STREAM: {
    STARTED: 'stream.started',
    STOPPED: 'stream.stopped',
    VIEWER_UPDATE: 'stream.viewer_update',
  },
  BRAIN: {
    QUERY: 'brain.query',
    LEARNED: 'brain.learned',
    TRAINED: 'brain.trained',
  },
  SYSTEM: {
    HEALTH_CHECK: 'system.health_check',
    ERROR: 'system.error',
    MAINTENANCE: 'system.maintenance',
  },
} as const;
