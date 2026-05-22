import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../logger';
import { eventBus } from '../events';
import { WebSocketMessage } from '../types';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
  subscriptions?: Set<string>;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedSocket>> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(server: http.Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: AuthenticatedSocket, req) => {
      this.handleConnection(ws, req);
    });

    this.startHeartbeat();
    this.setupEventForwarding();

    logger.info('WebSocket server initialized');
  }

  private handleConnection(ws: AuthenticatedSocket, req: http.IncomingMessage): void {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
      ws.userId = decoded.userId;
      ws.isAlive = true;
      ws.subscriptions = new Set();

      if (!this.clients.has(decoded.userId)) {
        this.clients.set(decoded.userId, new Set());
      }
      this.clients.get(decoded.userId)!.add(ws);

      ws.on('message', (data) => this.handleMessage(ws, data));
      ws.on('pong', () => { ws.isAlive = true; });
      ws.on('close', () => this.handleDisconnect(ws));
      ws.on('error', (error) => {
        logger.error('WebSocket error', { userId: ws.userId, error: error.message });
      });

      this.send(ws, {
        type: 'system',
        event: 'connected',
        data: { userId: decoded.userId },
        timestamp: new Date().toISOString(),
      });

      logger.debug('WebSocket client connected', { userId: decoded.userId });
    } catch {
      ws.close(4001, 'Invalid token');
    }
  }

  private handleMessage(ws: AuthenticatedSocket, rawData: WebSocket.RawData): void {
    try {
      const message = JSON.parse(rawData.toString()) as WebSocketMessage;

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(ws, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(ws, message);
          break;
        case 'join_room':
          this.handleJoinRoom(ws, message);
          break;
        case 'leave_room':
          this.handleLeaveRoom(ws, message);
          break;
        case 'ping':
          this.send(ws, {
            type: 'system',
            event: 'pong',
            data: {},
            timestamp: new Date().toISOString(),
          });
          break;
        default:
          eventBus.emit(`ws.${message.type}`, {
            type: message.type,
            source: 'websocket',
            data: message.data as Record<string, unknown>,
            userId: ws.userId,
          });
      }
    } catch (error) {
      logger.error('WebSocket message parse error', { error });
    }
  }

  private handleSubscribe(ws: AuthenticatedSocket, message: WebSocketMessage): void {
    const event = message.event;
    ws.subscriptions?.add(event);
    this.send(ws, {
      type: 'system',
      event: 'subscribed',
      data: { event },
      timestamp: new Date().toISOString(),
    });
  }

  private handleUnsubscribe(ws: AuthenticatedSocket, message: WebSocketMessage): void {
    const event = message.event;
    ws.subscriptions?.delete(event);
    this.send(ws, {
      type: 'system',
      event: 'unsubscribed',
      data: { event },
      timestamp: new Date().toISOString(),
    });
  }

  private handleJoinRoom(ws: AuthenticatedSocket, message: WebSocketMessage): void {
    const roomId = message.data as unknown as string;
    if (ws.userId && typeof roomId === 'string') {
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Set());
      }
      this.rooms.get(roomId)!.add(ws.userId);
      ws.subscriptions?.add(`room:${roomId}`);
    }
  }

  private handleLeaveRoom(ws: AuthenticatedSocket, message: WebSocketMessage): void {
    const roomId = message.data as unknown as string;
    if (ws.userId && typeof roomId === 'string') {
      this.rooms.get(roomId)?.delete(ws.userId);
      ws.subscriptions?.delete(`room:${roomId}`);
    }
  }

  private handleDisconnect(ws: AuthenticatedSocket): void {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.userId);
          for (const [roomId, members] of this.rooms.entries()) {
            members.delete(ws.userId);
            if (members.size === 0) {
              this.rooms.delete(roomId);
            }
          }
        }
      }
      logger.debug('WebSocket client disconnected', { userId: ws.userId });
    }
  }

  private setupEventForwarding(): void {
    eventBus.on('**', (payload) => {
      if (!payload || typeof payload !== 'object') return;
      const eventPayload = payload as { type?: string; data?: unknown; userId?: string };
      const eventType = eventPayload.type || 'unknown';

      if (eventType.startsWith('ws.')) return;

      const message: WebSocketMessage = {
        type: 'event',
        event: eventType,
        data: eventPayload.data || {},
        timestamp: new Date().toISOString(),
      };

      this.broadcastToSubscribers(eventType, message);
    });
  }

  private send(ws: AuthenticatedSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendToUser(userId: string, message: WebSocketMessage): void {
    const userClients = this.clients.get(userId);
    if (userClients) {
      for (const client of userClients) {
        this.send(client, message);
      }
    }
  }

  sendToRoom(roomId: string, message: WebSocketMessage): void {
    const roomMembers = this.rooms.get(roomId);
    if (roomMembers) {
      for (const userId of roomMembers) {
        this.sendToUser(userId, message);
      }
    }
  }

  broadcast(message: WebSocketMessage): void {
    for (const [, userClients] of this.clients) {
      for (const client of userClients) {
        this.send(client, message);
      }
    }
  }

  private broadcastToSubscribers(event: string, message: WebSocketMessage): void {
    for (const [, userClients] of this.clients) {
      for (const client of userClients) {
        if (client.subscriptions?.has(event) || client.subscriptions?.has('*')) {
          this.send(client, message);
        }
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((ws) => {
        const authWs = ws as AuthenticatedSocket;
        if (!authWs.isAlive) {
          authWs.terminate();
          return;
        }
        authWs.isAlive = false;
        authWs.ping();
      });
    }, 30000);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  isUserOnline(userId: string): boolean {
    return this.clients.has(userId);
  }

  getConnectionCount(): number {
    let count = 0;
    for (const [, clients] of this.clients) {
      count += clients.size;
    }
    return count;
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.wss) {
      this.wss.close();
    }
  }
}

export const wsManager = new WebSocketManager();
