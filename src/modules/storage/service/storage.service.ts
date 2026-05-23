// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';
import crypto from 'crypto';
import path from 'path';

const log = new ModuleLogger('StorageService');

export class StorageService {
  async getFiles(userId: string, params: PaginationParams, folderId?: string) {
    const where: Prisma.StorageFileWhereInput = { ownerId: userId, folderId: folderId || null, isDeleted: false };
    const [data, total] = await Promise.all([
      prisma.storageFile.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { createdAt: 'desc' } }),
      prisma.storageFile.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getFileById(id: string, userId: string) {
    const file = await prisma.storageFile.findUnique({ where: { id } });
    if (!file || file.ownerId !== userId) throw new NotFoundError('File');
    return file;
  }

  async uploadFile(data: { name: string; mimeType: string; size: number; path: string; folderId?: string }, userId: string) {
    const ext = path.extname(data.name);
    const storagePath = `uploads/${userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const file = await prisma.storageFile.create({
      data: { name: data.name, mimeType: data.mimeType, size: data.size, storagePath, ownerId: userId, folderId: data.folderId || null, isPublic: false },
    });
    await eventBus.emit('storage.file_uploaded', { type: 'storage.file_uploaded', source: 'storage-service', data: { id: file.id, name: file.name, size: file.size }, userId });
    await createAuditEntry(userId, 'FILE_UPLOADED', 'storage', file.id, { name: data.name, size: data.size } as object);
    log.info('File uploaded', { id: file.id, name: data.name });
    return file;
  }

  async createFolder(data: { name: string; parentId?: string }, userId: string) {
    const folder = await prisma.storageFolder.create({ data: { name: data.name, ownerId: userId, parentId: data.parentId || null } });
    return folder;
  }

  async getFolders(userId: string, parentId?: string) {
    return prisma.storageFolder.findMany({ where: { ownerId: userId, parentId: parentId || null }, orderBy: { name: 'asc' },
      include: { _count: { select: { files: true, children: true } } } });
  }

  async deleteFile(id: string, userId: string) {
    const file = await prisma.storageFile.findUnique({ where: { id } });
    if (!file || file.ownerId !== userId) throw new NotFoundError('File');
    await prisma.storageFile.update({ where: { id }, data: { isDeleted: true } });
    await createAuditEntry(userId, 'FILE_DELETED', 'storage', id);
  }

  async deleteFolder(id: string, userId: string) {
    const folder = await prisma.storageFolder.findUnique({ where: { id } });
    if (!folder || folder.ownerId !== userId) throw new NotFoundError('Folder');
    await prisma.storageFile.updateMany({ where: { folderId: id }, data: { isDeleted: true } });
    await prisma.storageFolder.delete({ where: { id } });
    await createAuditEntry(userId, 'FOLDER_DELETED', 'storage', id);
  }

  async rename(id: string, name: string, userId: string) {
    const file = await prisma.storageFile.findUnique({ where: { id } });
    if (!file || file.ownerId !== userId) throw new NotFoundError('File');
    return prisma.storageFile.update({ where: { id }, data: { name } });
  }

  async moveFile(id: string, folderId: string | null, userId: string) {
    const file = await prisma.storageFile.findUnique({ where: { id } });
    if (!file || file.ownerId !== userId) throw new NotFoundError('File');
    return prisma.storageFile.update({ where: { id }, data: { folderId } });
  }

  async shareFile(id: string, targetUserId: string, permission: string, userId: string) {
    const file = await prisma.storageFile.findUnique({ where: { id } });
    if (!file || file.ownerId !== userId) throw new NotFoundError('File');
    await prisma.storageShare.create({ data: { fileId: id, sharedWithId: targetUserId, permission: permission || 'READ' } });
    await createAuditEntry(userId, 'FILE_SHARED', 'storage', id, { targetUserId } as object);
  }

  async getSharedWithMe(userId: string, params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.storageShare.findMany({ where: { sharedWithId: userId }, skip: (params.page - 1) * params.limit, take: params.limit,
        include: { file: true } }),
      prisma.storageShare.count({ where: { sharedWithId: userId } }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getUsage(userId: string) {
    const result = await prisma.storageFile.aggregate({ where: { ownerId: userId, isDeleted: false }, _sum: { size: true }, _count: true });
    return { totalSize: result._sum.size || 0, fileCount: result._count };
  }

  async togglePublic(id: string, userId: string) {
    const file = await prisma.storageFile.findUnique({ where: { id } });
    if (!file || file.ownerId !== userId) throw new NotFoundError('File');
    return prisma.storageFile.update({ where: { id }, data: { isPublic: !file.isPublic } });
  }
}

export const storageService = new StorageService();