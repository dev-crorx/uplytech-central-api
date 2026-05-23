import { Prisma, ChatRoomType, ChatMessageType } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';
import crypto from 'crypto';

const log = new ModuleLogger('ChatService');

export class ChatService {
  async getRooms(userId: string, params: PaginationParams) {
    const where = { members: { some: { userId } } };
    const [data, total] = await Promise.all([
      prisma.chatRoom.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { members: true, messages: true } } } }),
      prisma.chatRoom.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async createRoom(data: { name: string; type: string; isEncrypted?: boolean }, userId: string) {
    const room = await prisma.chatRoom.create({
      data: { name: data.name, type: (data.type || 'GROUP') as ChatRoomType, isEncrypted: data.isEncrypted || false, creatorId: userId },
    });
    await prisma.chatRoomMember.create({ data: { roomId: room.id, userId, role: 'ADMIN' } });
    await eventBus.emit('chat.room_created', { type: 'chat.room_created', source: 'chat-service', data: { roomId: room.id }, userId });
    log.info('Chat room created', { id: room.id, name: room.name });
    return room;
  }

  async createDirectMessage(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new BadRequestError('Cannot create DM with yourself');
    const existing = await prisma.chatRoom.findFirst({
      where: { type: 'DIRECT', AND: [{ members: { some: { userId } } }, { members: { some: { userId: targetUserId } } }] },
    });
    if (existing) return existing;
    const room = await prisma.chatRoom.create({ data: { name: 'DM', type: 'DIRECT' as ChatRoomType, creatorId: userId } });
    await prisma.chatRoomMember.createMany({ data: [{ roomId: room.id, userId, role: 'MEMBER' }, { roomId: room.id, userId: targetUserId, role: 'MEMBER' }] });
    return room;
  }

  async getMessages(roomId: string, userId: string, params: PaginationParams) {
    const isMember = await prisma.chatRoomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
    if (!isMember) throw new BadRequestError('Not a member of this room');
    const [data, total] = await Promise.all([
      prisma.chatMessage.findMany({ where: { roomId }, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' },
        include: { sender: { select: { id: true, username: true, displayName: true, avatar: true } } } }),
      prisma.chatMessage.count({ where: { roomId } }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async sendMessage(roomId: string, userId: string, content: string, type: string) {
    const isMember = await prisma.chatRoomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
    if (!isMember) throw new BadRequestError('Not a member of this room');
    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
    let finalContent = content;
    if (room?.isEncrypted) {
      const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-32-byte-encryption-key!!');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      finalContent = iv.toString('hex') + ':' + cipher.update(content, 'utf8', 'hex') + cipher.final('hex');
    }
    const message = await prisma.chatMessage.create({
      data: { roomId, senderId: userId, content: finalContent, type: (type || 'TEXT') as ChatMessageType },
      include: { sender: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });
    await prisma.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } });
    await eventBus.emit('chat.message_sent', { type: 'chat.message_sent', source: 'chat-service', data: { roomId, messageId: message.id }, userId });
    return message;
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundError('Message');
    if (msg.senderId !== userId) throw new BadRequestError('Can only delete your own messages');
    await prisma.chatMessage.update({ where: { id: messageId }, data: { isDeleted: true, content: '[deleted]' } });
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundError('Message');
    if (msg.senderId !== userId) throw new BadRequestError('Can only edit your own messages');
    return prisma.chatMessage.update({ where: { id: messageId }, data: { content } });
  }

  async addMember(roomId: string, targetUserId: string, userId: string) {
    const member = await prisma.chatRoomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
    if (!member || member.role !== 'ADMIN') throw new BadRequestError('Only admins can add members');
    const existing = await prisma.chatRoomMember.findUnique({ where: { roomId_userId: { roomId, userId: targetUserId } } });
    if (existing) throw new BadRequestError('Already a member');
    await prisma.chatRoomMember.create({ data: { roomId, userId: targetUserId, role: 'MEMBER' } });
    await eventBus.emit('chat.member_added', { type: 'chat.member_added', source: 'chat-service', data: { roomId, targetUserId }, userId });
  }

  async removeMember(roomId: string, targetUserId: string, userId: string) {
    const member = await prisma.chatRoomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
    if (!member || member.role !== 'ADMIN') throw new BadRequestError('Only admins can remove members');
    await prisma.chatRoomMember.deleteMany({ where: { roomId, userId: targetUserId } });
  }

  async leaveRoom(roomId: string, userId: string) {
    await prisma.chatRoomMember.deleteMany({ where: { roomId, userId } });
    await eventBus.emit('chat.member_left', { type: 'chat.member_left', source: 'chat-service', data: { roomId }, userId });
  }

  async markAsRead(roomId: string, userId: string) {
    await prisma.chatRoomMember.update({ where: { roomId_userId: { roomId, userId } }, data: { lastReadAt: new Date() } });
  }

  async searchMessages(roomId: string, query: string, params: PaginationParams) {
    const where: Prisma.ChatMessageWhereInput = { roomId, content: { contains: query }, isDeleted: false };
    const [data, total] = await Promise.all([
      prisma.chatMessage.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' },
        include: { sender: { select: { id: true, username: true, displayName: true } } } }),
      prisma.chatMessage.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getUnreadCount(userId: string) {
    const memberships = await prisma.chatRoomMember.findMany({ where: { userId }, select: { roomId: true, lastReadAt: true } });
    let total = 0;
    for (const m of memberships) {
      const count = await prisma.chatMessage.count({ where: { roomId: m.roomId, createdAt: { gt: m.lastReadAt || new Date(0) }, senderId: { not: userId } } });
      total += count;
    }
    return { unreadCount: total };
  }
}

export const chatService = new ChatService();