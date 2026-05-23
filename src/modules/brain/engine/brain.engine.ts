import crypto from 'crypto';
import { prisma } from '../../../core/database';
import { ModuleLogger } from '../../../core/logger';
import { eventBus, EventTypes } from '../../../core/events';

const log = new ModuleLogger('BrainEngine');

export interface BrainResponse {
  output: string;
  confidence: number;
  source: string;
}

interface TokenizedInput {
  tokens: string[];
  normalized: string;
  hash: string;
}

export class BrainEngine {
  private stopWords: Set<string> = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'ist',
    'sind', 'war', 'hat', 'haben', 'wird', 'werden', 'kann', 'muss',
    'soll', 'darf', 'mit', 'von', 'zu', 'auf', 'in', 'an', 'für',
  ]);

  private tokenize(input: string): TokenizedInput {
    const normalized = input.toLowerCase().trim();
    const tokens = normalized
      .split(/[\s,.!?;:]+/)
      .filter((t) => t.length > 1 && !this.stopWords.has(t));

    const hash = crypto.createHash('md5').update(normalized).digest('hex');

    return { tokens, normalized, hash };
  }

  private calculateSimilarity(tokens1: string[], tokens2: string[]): number {
    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter((t) => set2.has(t)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  async processInput(
    input: string,
    context?: string,
    userId?: string
  ): Promise<BrainResponse> {
    const tokenized = this.tokenize(input);

    const exactMatch = await prisma.brainPattern.findFirst({
      where: { inputHash: tokenized.hash },
      orderBy: { confidence: 'desc' },
    });

    if (exactMatch && exactMatch.confidence > 0.7) {
      await this.recordAccess(exactMatch.id);

      const response: BrainResponse = {
        output: exactMatch.output,
        confidence: exactMatch.confidence,
        source: 'pattern_match',
      };

      await this.recordInteraction(input, response.output, context, userId);
      return response;
    }

    const contextPatterns = await prisma.brainPattern.findMany({
      where: context ? { context } : {},
      orderBy: { confidence: 'desc' },
      take: 100,
    });

    let bestMatch: { pattern: typeof contextPatterns[0]; score: number } | null = null;

    for (const pattern of contextPatterns) {
      const patternTokens = this.tokenize(pattern.input).tokens;
      const similarity = this.calculateSimilarity(tokenized.tokens, patternTokens);

      if (similarity > 0.5 && (!bestMatch || similarity > bestMatch.score)) {
        bestMatch = { pattern, score: similarity };
      }
    }

    if (bestMatch) {
      await this.recordAccess(bestMatch.pattern.id);

      const response: BrainResponse = {
        output: bestMatch.pattern.output,
        confidence: bestMatch.score * bestMatch.pattern.confidence,
        source: 'fuzzy_match',
      };

      await this.recordInteraction(input, response.output, context, userId);
      return response;
    }

    const memoryResponse = await this.searchMemories(tokenized.tokens, context);
    if (memoryResponse) {
      await this.recordInteraction(input, memoryResponse.output, context, userId);
      return memoryResponse;
    }

    const generatedResponse = this.generateResponse(tokenized.tokens, context);
    await this.recordInteraction(input, generatedResponse.output, context, userId);

    return generatedResponse;
  }

  private async searchMemories(
    tokens: string[],
    context?: string
  ): Promise<BrainResponse | null> {
    const memories = await prisma.brainMemory.findMany({
      where: context ? { category: context } : {},
      orderBy: { weight: 'desc' },
      take: 50,
    });

    for (const memory of memories) {
      const memoryTokens = this.tokenize(memory.key).tokens;
      const similarity = this.calculateSimilarity(tokens, memoryTokens);

      if (similarity > 0.4) {
        await prisma.brainMemory.update({
          where: { id: memory.id },
          data: {
            accessCount: { increment: 1 },
            lastAccessedAt: new Date(),
          },
        });

        return {
          output: memory.value,
          confidence: similarity * memory.weight,
          source: 'memory',
        };
      }
    }

    return null;
  }

  private generateResponse(tokens: string[], context?: string): BrainResponse {
    const greetings = ['hello', 'hi', 'hey', 'hallo', 'moin', 'servus', 'grüße'];
    const farewells = ['bye', 'goodbye', 'tschüss', 'ciao', 'auf wiedersehen'];
    const thanks = ['thanks', 'thank', 'danke', 'thx'];
    const help = ['help', 'hilfe', 'support', 'assist'];

    if (tokens.some((t) => greetings.includes(t))) {
      return {
        output: 'Hallo! Wie kann ich dir helfen? / Hello! How can I help you?',
        confidence: 0.9,
        source: 'rule_based',
      };
    }

    if (tokens.some((t) => farewells.includes(t))) {
      return {
        output: 'Auf Wiedersehen! / Goodbye!',
        confidence: 0.9,
        source: 'rule_based',
      };
    }

    if (tokens.some((t) => thanks.includes(t))) {
      return {
        output: 'Gerne! / You\'re welcome!',
        confidence: 0.9,
        source: 'rule_based',
      };
    }

    if (tokens.some((t) => help.includes(t))) {
      return {
        output: 'Ich bin das UplyTech AI Brain. Ich lerne aus Interaktionen und kann bei verschiedenen Themen helfen. Was möchtest du wissen?',
        confidence: 0.8,
        source: 'rule_based',
      };
    }

    return {
      output: `Ich habe deine Nachricht verstanden, aber ich lerne noch dazu. Kontext: ${context || 'allgemein'}. Bitte hilf mir, indem du Feedback gibst!`,
      confidence: 0.3,
      source: 'fallback',
    };
  }

  async learn(
    input: string,
    output: string,
    context?: string,
    confidence = 0.8
  ): Promise<void> {
    const tokenized = this.tokenize(input);

    await prisma.brainPattern.upsert({
      where: {
        id: (await prisma.brainPattern.findFirst({
          where: { inputHash: tokenized.hash, context: context || null },
        }))?.id || '',
      },
      create: {
        inputHash: tokenized.hash,
        input: tokenized.normalized,
        output,
        context: context || null,
        confidence,
      },
      update: {
        output,
        confidence: { increment: 0.05 },
        usageCount: { increment: 1 },
      },
    }).catch(async () => {
      await prisma.brainPattern.create({
        data: {
          inputHash: tokenized.hash,
          input: tokenized.normalized,
          output,
          context: context || null,
          confidence,
        },
      });
    });

    await eventBus.emit(EventTypes.BRAIN.LEARNED, {
      type: EventTypes.BRAIN.LEARNED,
      source: 'brain-engine',
      data: { input: tokenized.normalized, context },
    });

    log.info('Brain learned new pattern', { context });
  }

  async memorize(
    category: string,
    key: string,
    value: string,
    weight = 1.0
  ): Promise<void> {
    await prisma.brainMemory.upsert({
      where: { category_key: { category, key } },
      create: { category, key, value, weight },
      update: { value, weight },
    });

    log.info('Brain memorized', { category, key });
  }

  async forget(category: string, key: string): Promise<void> {
    await prisma.brainMemory.deleteMany({
      where: { category, key },
    });

    log.info('Brain forgot', { category, key });
  }

  async feedback(interactionId: string, rating: number): Promise<void> {
    const interaction = await prisma.brainInteraction.findUnique({
      where: { id: interactionId },
    });

    if (!interaction) return;

    await prisma.brainInteraction.update({
      where: { id: interactionId },
      data: { rating },
    });

    if (rating >= 4) {
      await this.learn(interaction.input, interaction.output, interaction.context || undefined, 0.9);
    }

    if (rating <= 2) {
      const tokenized = this.tokenize(interaction.input);
      const pattern = await prisma.brainPattern.findFirst({
        where: { inputHash: tokenized.hash },
      });

      if (pattern) {
        await prisma.brainPattern.update({
          where: { id: pattern.id },
          data: {
            confidence: { decrement: 0.1 },
            feedback: { decrement: 1 },
          },
        });
      }
    }

    log.info('Brain received feedback', { interactionId, rating });
  }

  async train(category?: string): Promise<{ patternsProcessed: number }> {
    const trainingData = await prisma.brainTrainingData.findMany({
      where: category ? { category, validated: true } : { validated: true },
    });

    let processed = 0;

    for (const data of trainingData) {
      await this.learn(data.input, data.output, data.category, data.weight);
      processed++;
    }

    await eventBus.emit(EventTypes.BRAIN.TRAINED, {
      type: EventTypes.BRAIN.TRAINED,
      source: 'brain-engine',
      data: { category, patternsProcessed: processed },
    });

    log.info('Brain training complete', { category, patternsProcessed: processed });

    return { patternsProcessed: processed };
  }

  async getStats() {
    const [patternCount, memoryCount, interactionCount, avgConfidence] = await Promise.all([
      prisma.brainPattern.count(),
      prisma.brainMemory.count(),
      prisma.brainInteraction.count(),
      prisma.brainPattern.aggregate({ _avg: { confidence: true } }),
    ]);

    return {
      patterns: patternCount,
      memories: memoryCount,
      interactions: interactionCount,
      averageConfidence: avgConfidence._avg.confidence || 0,
    };
  }

  private async recordAccess(patternId: string): Promise<void> {
    await prisma.brainPattern.update({
      where: { id: patternId },
      data: { usageCount: { increment: 1 } },
    });
  }

  private async recordInteraction(
    input: string,
    output: string,
    context?: string,
    userId?: string
  ): Promise<void> {
    await prisma.brainInteraction.create({
      data: {
        userId: userId || null,
        input,
        output,
        context: context || null,
      },
    });
  }
}

export const brainEngine = new BrainEngine();
