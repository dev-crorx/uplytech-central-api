import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('ChatService');

export class ChatService {
  async findAll(params: PaginationParams, filters?: Record<string, unknown>) {
    const where: Prisma.ChatRoomWhereInput = {};

    if (filters) {
      Object.assign(where, filters);
    }

    const [data, total] = await Promise.all([
      prisma.chatRoom.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' } as Prisma.ChatRoomOrderByWithRelationInput,
        include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } } }
      }),
      prisma.chatRoom.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findById(id: string) {
    const record = await prisma.chatRoom.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } } }
    });

    if (!record) {
      throw new NotFoundError('ChatRoom');
    }

    return record;
  }

  async create(data: Prisma.ChatRoomCreateInput, userId?: string) {
    
    
    

    const record = await prisma.chatRoom.create({ data });

    await eventBus.emit('chat.created', {
      type: 'chat.created',
      source: 'chat-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'CREATE', 'chat', record.id);

    log.info('ChatRoom created', { id: record.id });

    return record;
  }

  async update(id: string, data: Prisma.ChatRoomUpdateInput, userId?: string) {
    const existing = await prisma.chatRoom.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('ChatRoom');
    }

    const record = await prisma.chatRoom.update({
      where: { id },
      data,
    });

    await eventBus.emit('chat.updated', {
      type: 'chat.updated',
      source: 'chat-service',
      data: { id: record.id },
      userId,
    });

    await createAuditEntry(userId || null, 'UPDATE', 'chat', id);

    log.info('ChatRoom updated', { id });

    return record;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.chatRoom.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('ChatRoom');
    }

    await prisma.chatRoom.delete({ where: { id } });

    await eventBus.emit('chat.deleted', {
      type: 'chat.deleted',
      source: 'chat-service',
      data: { id },
      userId,
    });

    await createAuditEntry(userId || null, 'DELETE', 'chat', id);

    log.info('ChatRoom deleted', { id });
  }

  async search(query: string, params: PaginationParams) {
    const where: Prisma.ChatRoomWhereInput = {
      name: { contains: query },
    };

    const [data, total] = await Promise.all([
      prisma.chatRoom.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.chatRoom.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }
}

export const chatService = new ChatService();
