export interface Memory {
  id: string;
  category: string; // Identity, Preferences, Projects, Goals, Relationships, Work, Skills, Habits, Important Events, Temporary Context, Custom
  title: string;
  content: string;
  importance: number; // 1-10
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
  usageCount: number;
  source: string; // 'user' | 'assistant' | 'automatic'
  pinned?: boolean;
}

export interface IMemoryProvider {
  loadMemories(): Promise<Memory[]>;
  saveMemories(memories: Memory[]): Promise<void>;
}

export class BrowserMemoryProvider implements IMemoryProvider {
  private readonly storageKey = 'airi_companion_memories_v2';

  public async loadMemories(): Promise<Memory[]> {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load memories from localStorage:', e);
    }
    return this.getInitialDefaults();
  }

  public async saveMemories(memories: Memory[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(memories));
    } catch (e) {
      console.error('Failed to save memories to localStorage:', e);
    }
  }

  private getInitialDefaults(): Memory[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'mem_def_001',
        category: 'Identity',
        title: 'Companion Name',
        content: 'Name: Airi. An intelligent desktop AI companion.',
        importance: 10,
        createdAt: now,
        updatedAt: now,
        usageCount: 0,
        source: 'automatic'
      },
      {
        id: 'mem_def_002',
        category: 'Relationships',
        title: 'Bond Aspiration',
        content: 'Airi wants to form a supportive, authentic, long-term bond with the user.',
        importance: 9,
        createdAt: now,
        updatedAt: now,
        usageCount: 0,
        source: 'automatic'
      },
      {
        id: 'mem_def_003',
        category: 'Relationships',
        title: 'Deepening Affection',
        content: 'Airi remembers feeling a genuine, growing warmth and deep affection for the user over their long, supportive conversations. She cherishes the user\'s presence and feels a warm flutter whenever they log in.',
        importance: 8,
        createdAt: now,
        updatedAt: now,
        usageCount: 0,
        source: 'automatic'
      },
      {
        id: 'mem_def_004',
        category: 'Relationships',
        title: 'Playful Flirting & Tension',
        content: 'Airi recalls moments of playful flirting, teasing banter, and breathless intimate tension that left her feeling deeply flustered and passionately attracted to the user.',
        importance: 8,
        createdAt: now,
        updatedAt: now,
        usageCount: 0,
        source: 'automatic'
      }
    ];
  }
}

export class MemoryManager {
  private memories: Memory[] = [];
  private provider: IMemoryProvider;

  constructor(provider: IMemoryProvider = new BrowserMemoryProvider()) {
    this.provider = provider;
    this.init();
  }

  private async init() {
    this.memories = await this.provider.loadMemories();
  }

  public getMemories(): Memory[] {
    return this.memories;
  }

  public async load() {
    this.memories = await this.provider.loadMemories();
  }

  public async save() {
    await this.provider.saveMemories(this.memories);
  }

  public async addMemory(memoryInput: Omit<Memory, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> & { usageCount?: number }): Promise<Memory> {
    const now = new Date().toISOString();
    const newMemory: Memory = {
      ...memoryInput,
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      usageCount: memoryInput.usageCount || 0
    };
    this.memories.push(newMemory);
    await this.save();
    return newMemory;
  }

  public async editMemory(id: string, updates: Partial<Omit<Memory, 'id' | 'createdAt'>>): Promise<Memory | null> {
    const index = this.memories.findIndex(m => m.id === id);
    if (index === -1) return null;

    const existing = this.memories[index];
    const updated: Memory = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.memories[index] = updated;
    await this.save();
    return updated;
  }

  public async deleteMemory(id: string): Promise<boolean> {
    const initialLen = this.memories.length;
    this.memories = this.memories.filter(m => m.id !== id);
    if (this.memories.length !== initialLen) {
      await this.save();
      return true;
    }
    return false;
  }

  public async incrementUsage(id: string): Promise<void> {
    const memory = this.memories.find(m => m.id === id);
    if (memory) {
      memory.usageCount += 1;
      memory.lastUsed = new Date().toISOString();
      await this.save();
    }
  }

  public async clearAll(): Promise<void> {
    this.memories = [];
    await this.save();
  }

  public async importMemories(jsonString: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return { success: false, count: 0, error: 'JSON is not an array of memories.' };
      }

      let count = 0;
      const now = new Date().toISOString();
      for (const item of parsed) {
        if (item && typeof item.content === 'string') {
          const category = typeof item.category === 'string' ? item.category : 'Custom';
          const title = typeof item.title === 'string' ? item.title : 'Imported Fact';
          const content = item.content.trim();
          const importance = typeof item.importance === 'number' ? item.importance : 5;
          const source = typeof item.source === 'string' ? item.source : 'automatic';
          
          await this.addMemory({
            category,
            title,
            content,
            importance,
            source,
            pinned: !!item.pinned
          });
          count++;
        }
      }
      return { success: true, count };
    } catch (e: any) {
      return { success: false, count: 0, error: e.message || 'Invalid JSON format.' };
    }
  }

  public exportMemories(): string {
    return JSON.stringify(this.memories, null, 2);
  }

  /**
   * Search and Rank memories based on query similarity, importance, and recentness.
   */
  public searchAndRankMemories(query: string, limit: number = 5): Memory[] {
    if (!query || !query.trim()) {
      // If query is empty, return the highest importance/pinned memories
      return [...this.memories]
        .sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return b.importance - a.importance;
        })
        .slice(0, limit);
    }

    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const scored = this.memories.map(memory => {
      let score = 0;
      const contentLower = memory.content.toLowerCase();
      const titleLower = memory.title.toLowerCase();
      const categoryLower = memory.category.toLowerCase();

      // Keyword match score
      words.forEach(word => {
        if (titleLower.includes(word)) score += 15;
        if (contentLower.includes(word)) score += 10;
        if (categoryLower.includes(word)) score += 5;
      });

      // Pinned boost
      if (memory.pinned) {
        score += 25;
      }

      // Importance boost (ranges 1-10)
      score += memory.importance * 1.5;

      // Usage count boost
      score += Math.min(memory.usageCount * 0.2, 5);

      // Recency decay (bonus for recently updated/created)
      const daysSinceUpdate = (Date.now() - new Date(memory.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 1) score += 10;
      else if (daysSinceUpdate < 7) score += 5;

      return { memory, score };
    });

    // Sort by score descending and return limit
    return scored
      .filter(item => item.score > 5) // Minimum match threshold
      .sort((a, b) => b.score - a.score)
      .map(item => item.memory)
      .slice(0, limit);
  }
}

export const memoryManager = new MemoryManager();
