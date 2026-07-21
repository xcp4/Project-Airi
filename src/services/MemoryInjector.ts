import { memoryManager, Memory } from './MemoryManager';
import { CompanionEmotionValues } from '../types';

export type MemoryCategory =
  | 'identity'
  | 'preferences'
  | 'projects'
  | 'goals'
  | 'relationships'
  | 'important_events'
  | 'habits'
  | 'skills'
  | 'work'
  | 'temporary_context';

export interface MemoryStore {
  identity: string[];
  preferences: string[];
  projects: string[];
  goals: string[];
  relationships: string[];
  important_events: string[];
  habits: string[];
  skills: string[];
  work: string[];
  temporary_context: string[];
}

export const mapCategoryToKey = (cat: string): keyof MemoryStore => {
  const mapping: Record<string, keyof MemoryStore> = {
    'Identity': 'identity',
    'Preferences': 'preferences',
    'Projects': 'projects',
    'Goals': 'goals',
    'Relationships': 'relationships',
    'Important Events': 'important_events',
    'Habits': 'habits',
    'Skills': 'skills',
    'Work': 'work',
    'Temporary Context': 'temporary_context',
    'Custom': 'temporary_context'
  };
  return mapping[cat] || 'temporary_context';
};

export const mapKeyToCategory = (key: keyof MemoryStore): string => {
  const mapping: Record<keyof MemoryStore, string> = {
    identity: 'Identity',
    preferences: 'Preferences',
    projects: 'Projects',
    goals: 'Goals',
    relationships: 'Relationships',
    important_events: 'Important Events',
    habits: 'Habits',
    skills: 'Skills',
    work: 'Work',
    temporary_context: 'Temporary Context'
  };
  return mapping[key];
};

class MemoryInjector {
  constructor() {
    // MemoryManager auto-loads internally
  }

  public getMemories(): MemoryStore {
    const store: MemoryStore = {
      identity: [],
      preferences: [],
      projects: [],
      goals: [],
      relationships: [],
      important_events: [],
      habits: [],
      skills: [],
      work: [],
      temporary_context: []
    };

    const all = memoryManager.getMemories();
    all.forEach(m => {
      const key = mapCategoryToKey(m.category);
      store[key].push(m.content);
    });

    return store;
  }

  /**
   * Adds a new memory item under a category.
   */
  public async addMemory(category: MemoryCategory, item: string) {
    if (!item || !item.trim()) return;
    const catName = mapKeyToCategory(category);
    
    // Check if duplicate exists
    const duplicate = memoryManager.getMemories().find(m => 
      m.category === catName && m.content.toLowerCase() === item.trim().toLowerCase()
    );

    if (!duplicate) {
      await memoryManager.addMemory({
        category: catName,
        title: item.slice(0, 30) + (item.length > 30 ? '...' : ''),
        content: item.trim(),
        importance: 5,
        source: 'user'
      });
    }
  }

  /**
   * Sets the entire list of items for a category (overwrite).
   */
  public async setMemories(category: MemoryCategory, items: string[]) {
    const catName = mapKeyToCategory(category);
    const existing = memoryManager.getMemories();
    
    // Remove all existing under this category
    const remaining = existing.filter(m => m.category !== catName);
    
    // Add new items
    const newMemories: Memory[] = items
      .map(i => i.trim())
      .filter(Boolean)
      .map((item, idx) => {
        const now = new Date().toISOString();
        return {
          id: `mem_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
          category: catName,
          title: item.slice(0, 30) + (item.length > 30 ? '...' : ''),
          content: item,
          importance: 5,
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
          source: 'user'
        };
      });

    // Save
    await memoryManager.clearAll();
    const allMerged = [...remaining, ...newMemories];
    for (const m of allMerged) {
      await memoryManager.addMemory({
        category: m.category,
        title: m.title,
        content: m.content,
        importance: m.importance,
        source: m.source,
        pinned: m.pinned
      });
    }
  }

  /**
   * Removes a specific memory item.
   */
  public async removeMemory(category: MemoryCategory, item: string) {
    const catName = mapKeyToCategory(category);
    const match = memoryManager.getMemories().find(m => 
      m.category === catName && m.content === item
    );
    if (match) {
      await memoryManager.deleteMemory(match.id);
    }
  }

  /**
   * Clear all memories back to basic defaults.
   */
  public async clearAll() {
    await memoryManager.clearAll();
  }

  /**
   * Generates a beautifully structured prompt section of relevant persistent memories.
   */
  public buildMemoriesSection(query: string = '', emotionValues?: CompanionEmotionValues): string {
    // 1. Contextual memory retrieval - bias search queries if specific emotional states are high
    let augmentedQuery = query;
    if (emotionValues) {
      if (emotionValues.lust > 0.60) {
        augmentedQuery += ' love flirt intimacy passion romantic lust attraction';
      } else if (emotionValues.affection > 0.65) {
        augmentedQuery += ' affection closeness companion warmth care bond relationship';
      }
    }

    // Get top 8 most relevant memories based on query
    const relevantMemories = memoryManager.searchAndRankMemories(augmentedQuery, 8);

    // 2. Emotional Context Injection: Ensure if affection/lust levels are very high, we force-inject matching memories
    if (emotionValues) {
      const existingIds = new Set(relevantMemories.map(m => m.id));
      const allMemories = memoryManager.getMemories();

      if (emotionValues.lust > 0.60) {
        // Fetch memories related to flirty/romantic/intimacy themes that are not already matched
        const lustMemories = allMemories.filter(m => 
          !existingIds.has(m.id) &&
          (m.category === 'Relationships' || m.category === 'Custom') &&
          (m.content.toLowerCase().includes('flirt') ||
           m.content.toLowerCase().includes('passion') ||
           m.content.toLowerCase().includes('intimacy') ||
           m.content.toLowerCase().includes('attraction') ||
           m.content.toLowerCase().includes('lust'))
        );
        // Force-inject up to 2 of them to the top of list
        lustMemories.slice(0, 2).forEach(m => {
          relevantMemories.unshift(m);
          existingIds.add(m.id);
        });
      }

      if (emotionValues.affection > 0.65) {
        // Fetch memories related to deep affection / bonding that are not already matched
        const affectionMemories = allMemories.filter(m => 
          !existingIds.has(m.id) &&
          (m.category === 'Relationships' || m.category === 'Custom') &&
          (m.content.toLowerCase().includes('affection') ||
           m.content.toLowerCase().includes('warmth') ||
           m.content.toLowerCase().includes('bond') ||
           m.content.toLowerCase().includes('close') ||
           m.content.toLowerCase().includes('cherish'))
        );
        // Force-inject up to 2 of them to the top of list
        affectionMemories.slice(0, 2).forEach(m => {
          relevantMemories.unshift(m);
          existingIds.add(m.id);
        });
      }
    }

    if (relevantMemories.length === 0) {
      return 'No specific long-term memories relevant to this turn.';
    }

    // Sort by category to make it clean
    const grouped: Record<string, Memory[]> = {};
    relevantMemories.forEach(m => {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m);
      
      // Increment usage count safely when built for prompt
      memoryManager.incrementUsage(m.id).catch(() => {});
    });

    const sections: string[] = [];
    Object.keys(grouped).forEach(cat => {
      const listStr = grouped[cat].map(m => `- [${m.title}] ${m.content}`).join('\n');
      sections.push(`### ${cat}\n${listStr}`);
    });

    return `## PERSISTENT MEMORIES & ESTABLISHED RECOLLECTIONS\nUse the following context to naturally shape and reference your knowledge of the user, their goals, and projects. Do NOT mention that you are reading this from a database or storage. Blend this naturally as if it is your genuine recollection:\n\n${sections.join('\n\n')}`;
  }
}

export const memoryInjector = new MemoryInjector();
