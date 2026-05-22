import { prisma } from '../../../core/database';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { brainEngine } from '../engine/brain.engine';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('BrainService');

export class BrainService {
  async query(input: string, context?: string, userId?: string) {
    const response = await brainEngine.processInput(input, context, userId);

    await createAuditEntry(userId || null, 'BRAIN_QUERY', 'brain', null, {
      input,
      context,
      confidence: response.confidence,
      source: response.source,
    });

    return response;
  }

  async teach(input: string, output: string, context?: string, userId?: string) {
    await brainEngine.learn(input, output, context);

    await createAuditEntry(userId || null, 'BRAIN_TEACH', 'brain', null, {
      input,
      context,
    });

    log.info('Brain taught new pattern', { context, userId });

    return { success: true, message: 'Pattern learned successfully' };
  }

  async memorize(category: string, key: string, value: string, weight?: number, userId?: string) {
    await brainEngine.memorize(category, key, value, weight);

    await createAuditEntry(userId || null, 'BRAIN_MEMORIZE', 'brain', null, {
      category,
      key,
    });

    return { success: true, message: 'Memory stored successfully' };
  }

  async forget(category: string, key: string, userId?: string) {
    await brainEngine.forget(category, key);

    await createAuditEntry(userId || null, 'BRAIN_FORGET', 'brain', null, {
      category,
      key,
    });

    return { success: true, message: 'Memory removed successfully' };
  }

  async feedback(interactionId: string, rating: number, userId?: string) {
    await brainEngine.feedback(interactionId, rating);

    await createAuditEntry(userId || null, 'BRAIN_FEEDBACK', 'brain', interactionId, {
      rating,
    });

    return { success: true, message: 'Feedback recorded successfully' };
  }

  async train(category?: string, userId?: string) {
    const result = await brainEngine.train(category);

    await createAuditEntry(userId || null, 'BRAIN_TRAIN', 'brain', null, {
      category,
      patternsProcessed: result.patternsProcessed,
    });

    return result;
  }

  async addTrainingData(
    category: string,
    input: string,
    output: string,
    weight = 1.0,
    userId?: string
  ) {
    const data = await prisma.brainTrainingData.create({
      data: { category, input, output, weight },
    });

    await createAuditEntry(userId || null, 'BRAIN_ADD_TRAINING_DATA', 'brain', data.id, {
      category,
    });

    return data;
  }

  async validateTrainingData(id: string, userId?: string) {
    const data = await prisma.brainTrainingData.findUnique({ where: { id } });
    if (!data) {
      throw new NotFoundError('Training data');
    }

    const updated = await prisma.brainTrainingData.update({
      where: { id },
      data: { validated: true },
    });

    await createAuditEntry(userId || null, 'BRAIN_VALIDATE_TRAINING_DATA', 'brain', id);

    return updated;
  }

  async getTrainingData(params: PaginationParams, category?: string) {
    const where = category ? { category } : {};

    const [data, total] = await Promise.all([
      prisma.brainTrainingData.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.brainTrainingData.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async getMemories(params: PaginationParams, category?: string) {
    const where = category ? { category } : {};

    const [data, total] = await Promise.all([
      prisma.brainMemory.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { weight: 'desc' },
      }),
      prisma.brainMemory.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async getPatterns(params: PaginationParams, context?: string) {
    const where = context ? { context } : {};

    const [data, total] = await Promise.all([
      prisma.brainPattern.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { confidence: 'desc' },
      }),
      prisma.brainPattern.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async getInteractions(params: PaginationParams, userId?: string) {
    const where = userId ? { userId } : {};

    const [data, total] = await Promise.all([
      prisma.brainInteraction.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.brainInteraction.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async getStats() {
    return brainEngine.getStats();
  }
}

export const brainService = new BrainService();
