// @ts-nocheck
import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database';
import { eventBus } from '../../../core/events';
import { ModuleLogger } from '../../../core/logger';
import { NotFoundError, BadRequestError } from '../../../core/errors';
import { createAuditEntry } from '../../../core/middleware/audit';
import { PaginationParams } from '../../../core/types';
import { buildPaginatedResponse } from '../../../core/utils';

const log = new ModuleLogger('BrainService');

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface KnowledgeEntry {
  pattern: string;
  response: string;
  category: string;
  confidence: number;
  usageCount: number;
  lastUsed: Date | null;
}

export class BrainService {
  private knowledge: Map<string, KnowledgeEntry> = new Map();
  private personality: Record<string, unknown> = {
    name: 'UplyBrain',
    tone: 'professional',
    humor: false,
    verbosity: 'concise',
    language: 'de',
  };

  constructor() {
    this.loadKnowledge();
  }

  private async loadKnowledge(): Promise<void> {
    try {
      const entries = await prisma.brainKnowledge.findMany();
      for (const entry of entries) {
        this.knowledge.set(entry.id, {
          pattern: entry.pattern,
          response: entry.response,
          category: entry.category,
          confidence: entry.confidence,
          usageCount: entry.usageCount,
          lastUsed: entry.lastUsed,
        });
      }
      log.info('Knowledge loaded', { entries: this.knowledge.size });
    } catch {
      log.warn('Could not load knowledge from DB, starting fresh');
    }
  }

  async chat(userId: string, message: string, conversationId?: string) {
    let conversation: { id: string; messages: ConversationMessage[] };
    if (conversationId) {
      const existing = await prisma.brainConversation.findUnique({ where: { id: conversationId } });
      if (!existing || existing.userId !== userId) throw new NotFoundError('Conversation');
      conversation = { id: existing.id, messages: (existing.messages as unknown as ConversationMessage[]) || [] };
    } else {
      const created = await prisma.brainConversation.create({ data: { userId, messages: [] as object, title: message.substring(0, 100) } });
      conversation = { id: created.id, messages: [] };
    }

    conversation.messages.push({ role: 'user', content: message, timestamp: new Date() });
    const response = await this.generateResponse(message, conversation.messages, userId);
    conversation.messages.push({ role: 'assistant', content: response, timestamp: new Date() });

    await prisma.brainConversation.update({ where: { id: conversation.id }, data: { messages: conversation.messages as object, updatedAt: new Date() } });

    return { conversationId: conversation.id, response, timestamp: new Date() };
  }

  private async generateResponse(input: string, _context: ConversationMessage[], _userId: string): Promise<string> {
    const inputLower = input.toLowerCase();

    let bestMatch: { response: string; confidence: number } | null = null;
    let bestScore = 0;

    for (const [id, entry] of this.knowledge) {
      const patternWords = entry.pattern.toLowerCase().split(/\s+/);
      const inputWords = inputLower.split(/\s+/);
      let matchCount = 0;
      for (const pw of patternWords) {
        for (const iw of inputWords) {
          if (iw.includes(pw) || pw.includes(iw)) {
            matchCount++;
            break;
          }
        }
      }
      const score = patternWords.length > 0 ? (matchCount / patternWords.length) * entry.confidence : 0;
      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestMatch = { response: entry.response, confidence: score };
        entry.usageCount++;
        entry.lastUsed = new Date();
        await prisma.brainKnowledge.update({ where: { id }, data: { usageCount: entry.usageCount, lastUsed: entry.lastUsed } }).catch(() => {});
      }
    }

    if (bestMatch && bestScore > 0.5) {
      return bestMatch.response;
    }

    if (inputLower.includes('hilfe') || inputLower.includes('help')) {
      return 'Ich bin UplyBrain, der integrierte Assistent von UplyTech. Ich kann dir bei Fragen zu unseren Produkten, Services und der Plattform helfen. Was möchtest du wissen?';
    }
    if (inputLower.includes('status') || inputLower.includes('system')) {
      return 'Alle Systeme laufen normal. Die API ist voll funktionsfähig mit allen Modulen aktiv.';
    }
    if (inputLower.includes('hallo') || inputLower.includes('hi') || inputLower.includes('hey')) {
      return 'Hallo! Wie kann ich dir helfen?';
    }

    return 'Ich habe deine Nachricht verstanden. Leider habe ich dazu noch nicht genug gelernt. Mein Wissensschatz wird stetig erweitert. Kann ich dir bei etwas anderem helfen?';
  }

  async train(data: { pattern: string; response: string; category: string; confidence?: number }, userId: string) {
    const entry = await prisma.brainKnowledge.create({
      data: { pattern: data.pattern, response: data.response, category: data.category, confidence: data.confidence || 0.8, usageCount: 0 },
    });
    this.knowledge.set(entry.id, {
      pattern: entry.pattern, response: entry.response, category: entry.category,
      confidence: entry.confidence, usageCount: 0, lastUsed: null,
    });
    await eventBus.emit('brain.trained', { type: 'brain.trained', source: 'brain-service', data: { id: entry.id, category: data.category }, userId });
    await createAuditEntry(userId, 'BRAIN_TRAINED', 'brain', entry.id);
    log.info('Brain trained', { id: entry.id, pattern: data.pattern });
    return entry;
  }

  async trainBatch(entries: Array<{ pattern: string; response: string; category: string; confidence?: number }>, userId: string) {
    let count = 0;
    for (const entry of entries) {
      await this.train(entry, userId);
      count++;
    }
    return { trained: count };
  }

  async getConversations(userId: string, params: PaginationParams) {
    const [data, total] = await Promise.all([
      prisma.brainConversation.findMany({ where: { userId }, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, createdAt: true, updatedAt: true } }),
      prisma.brainConversation.count({ where: { userId } }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async getConversation(id: string, userId: string) {
    const conv = await prisma.brainConversation.findUnique({ where: { id } });
    if (!conv || conv.userId !== userId) throw new NotFoundError('Conversation');
    return conv;
  }

  async deleteConversation(id: string, userId: string) {
    const conv = await prisma.brainConversation.findUnique({ where: { id } });
    if (!conv || conv.userId !== userId) throw new NotFoundError('Conversation');
    await prisma.brainConversation.delete({ where: { id } });
  }

  async getKnowledge(params: PaginationParams, category?: string) {
    const where: Prisma.BrainKnowledgeWhereInput = {};
    if (category) where.category = category;
    const [data, total] = await Promise.all([
      prisma.brainKnowledge.findMany({ where, skip: (params.page - 1) * params.limit, take: params.limit, orderBy: { usageCount: 'desc' } }),
      prisma.brainKnowledge.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, params);
  }

  async deleteKnowledge(id: string, userId: string) {
    this.knowledge.delete(id);
    await prisma.brainKnowledge.delete({ where: { id } });
    await createAuditEntry(userId, 'BRAIN_KNOWLEDGE_DELETED', 'brain', id);
  }

  async getPersonality() {
    return this.personality;
  }

  async updatePersonality(data: Record<string, unknown>, userId: string) {
    this.personality = { ...this.personality, ...data };
    await createAuditEntry(userId, 'BRAIN_PERSONALITY_UPDATED', 'brain', 'personality');
    return this.personality;
  }

  async getStats() {
    const knowledgeCount = this.knowledge.size;
    const conversationCount = await prisma.brainConversation.count();
    const categories = new Set<string>();
    for (const [, entry] of this.knowledge) {
      categories.add(entry.category);
    }
    return { knowledgeEntries: knowledgeCount, conversations: conversationCount, categories: Array.from(categories), personality: this.personality };
  }
}

export const brainService = new BrainService();