// @ts-nocheck
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('FriendsService');

export class FriendsService {
  async getFriends(userId: string, params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.friend.findMany({
        where: { OR: [{ userId }, { friendId: userId }] },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatar: true, status: true } },
          friend: { select: { id: true, username: true, displayName: true, avatar: true, status: true } },
        },
      }),
      prisma.friend.count({ where: { OR: [{ userId }, { friendId: userId }] } }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) throw new BadRequestError('Cannot send friend request to yourself');

    const existing = await prisma.friendRequest.findFirst({
      where: { OR: [{ senderId, receiverId }, { senderId: receiverId, receiverId: senderId }] },
    });
    if (existing) throw new BadRequestError('Friend request already exists');

    const alreadyFriends = await prisma.friend.findFirst({
      where: { OR: [{ userId: senderId, friendId: receiverId }, { userId: receiverId, friendId: senderId }] },
    });
    if (alreadyFriends) throw new BadRequestError('Already friends');

    const request = await prisma.friendRequest.create({
      data: { senderId, receiverId, status: 'PENDING' },
      include: { sender: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });

    await eventBus.emit('friends.request_sent', { type: 'friends.request_sent', source: 'friends-service', data: { senderId, receiverId }, userId: senderId });
    log.info('Friend request sent', { senderId, receiverId });
    return request;
  }

  async acceptRequest(requestId: string, userId: string) {
    const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundError('Friend request');
    if (request.receiverId !== userId) throw new BadRequestError('Not authorized to accept this request');
    if (request.status !== 'PENDING') throw new BadRequestError('Request is not pending');

    await prisma.$transaction([
      prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED' } }),
      prisma.friend.create({ data: { userId: request.senderId, friendId: request.receiverId } }),
    ]);

    await eventBus.emit('friends.request_accepted', { type: 'friends.request_accepted', source: 'friends-service', data: { senderId: request.senderId, receiverId: request.receiverId }, userId });
    log.info('Friend request accepted', { requestId });
  }

  async rejectRequest(requestId: string, userId: string) {
    const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundError('Friend request');
    if (request.receiverId !== userId) throw new BadRequestError('Not authorized to reject this request');

    await prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
    await eventBus.emit('friends.request_rejected', { type: 'friends.request_rejected', source: 'friends-service', data: { requestId }, userId });
  }

  async removeFriend(userId: string, friendId: string) {
    const friendship = await prisma.friend.findFirst({
      where: { OR: [{ userId, friendId }, { userId: friendId, friendId: userId }] },
    });
    if (!friendship) throw new NotFoundError('Friendship');

    await prisma.friend.delete({ where: { id: friendship.id } });
    await eventBus.emit('friends.removed', { type: 'friends.removed', source: 'friends-service', data: { userId, friendId }, userId });
    log.info('Friend removed', { userId, friendId });
  }

  async blockUser(userId: string, blockedId: string) {
    if (userId === blockedId) throw new BadRequestError('Cannot block yourself');

    const friendship = await prisma.friend.findFirst({
      where: { OR: [{ userId, friendId: blockedId }, { userId: blockedId, friendId: userId }] },
    });
    if (friendship) await prisma.friend.delete({ where: { id: friendship.id } });

    await prisma.friendRequest.deleteMany({
      where: { OR: [{ senderId: userId, receiverId: blockedId }, { senderId: blockedId, receiverId: userId }] },
    });

    await createAuditEntry(userId, 'USER_BLOCKED', 'friend', blockedId);
    log.info('User blocked', { userId, blockedId });
  }

  async getPendingRequests(userId: string, params: PaginationParams) {
    const where = { receiverId: userId, status: 'PENDING' };
    const [data, total] = await Promise.all([
      prisma.friendRequest.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { id: true, username: true, displayName: true, avatar: true } } },
      }),
      prisma.friendRequest.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getSentRequests(userId: string, params: PaginationParams) {
    const where = { senderId: userId, status: 'PENDING' };
    const [data, total] = await Promise.all([
      prisma.friendRequest.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: { receiver: { select: { id: true, username: true, displayName: true, avatar: true } } },
      }),
      prisma.friendRequest.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getMutualFriends(userId: string, otherUserId: string) {
    const myFriends = await prisma.friend.findMany({
      where: { OR: [{ userId }, { friendId: userId }] },
    });
    const myFriendIds = myFriends.map(f => f.userId === userId ? f.friendId : f.userId);

    const theirFriends = await prisma.friend.findMany({
      where: { OR: [{ userId: otherUserId }, { friendId: otherUserId }] },
    });
    const theirFriendIds = theirFriends.map(f => f.userId === otherUserId ? f.friendId : f.userId);

    const mutualIds = myFriendIds.filter(id => theirFriendIds.includes(id));

    return prisma.user.findMany({
      where: { id: { in: mutualIds } },
      select: { id: true, username: true, displayName: true, avatar: true },
    });
  }
}

export const friendsService = new FriendsService();