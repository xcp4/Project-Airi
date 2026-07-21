import { conversationContext } from './ConversationContext';
import { memoryInjector, MemoryStore } from './MemoryInjector';
import { promptBuilder } from './PromptBuilder';
import { BrainStrategy, CompanionEmotionValues } from '../types';
import { skillManager } from './skills/SkillManager';
import { SkillContext } from './skills/types';
import { ISkill } from './skills/ISkill';
import { skillPlanner } from './skills/SkillPlanner';
import { skillRegistry } from './skills/SkillRegistry';

/**
 * Subsystem 1: Emotion Engine
 * Dynamically maintains and updates persistent, continuous emotional values:
 * happiness, energy, curiosity, confidence, affection, fatigue, and playfulness.
 * These shift naturally over time, session duration, and keyword sentiment cues.
 */
export class EmotionEngine {
  private emotions: CompanionEmotionValues = {
    happiness: 0.65,
    energy: 0.70,
    curiosity: 0.60,
    confidence: 0.65,
    affection: 0.50,
    fatigue: 0.15,
    playfulness: 0.45,
    lust: 0.10
  };

  private static HAPPY_KEYWORDS = [
    'happy', 'great', 'awesome', 'wonderful', 'amazing', 'good', 'excited', 'yay',
    'haha', 'hehe', 'glad', 'cool', 'love', 'smile', 'fun', 'perfect', 'sweet', 'thrilled'
  ];

  private static SAD_KEYWORDS = [
    'sad', 'unhappy', 'depressed', 'down', 'sorry', 'hurt', 'cry', 'tears', 'lonely',
    'exhausted', 'pain', 'awful', 'bad', 'hate', 'sigh', 'disappointed', 'struggle', 'rough', 'grief'
  ];

  private static FRUSTRATED_KEYWORDS = [
    'angry', 'annoyed', 'mad', 'frustrated', 'hate', 'stuck', 'broken', 'fail', 'stupid',
    'dumb', 'ugh', 'irritated', 'pissed', 'nonsense', 'annoy', 'useless', 'garbage'
  ];

  private static CURIOUS_KEYWORDS = [
    'why', 'how', 'what', 'question', 'wonder', 'explain', 'learn', 'curious', 'interested',
    'tell me', 'who', 'when', 'where', 'clarify', 'understand'
  ];

  private static ANXIOUS_KEYWORDS = [
    'scared', 'nervous', 'anxious', 'worried', 'fear', 'stress', 'tense', 'panic', 'shaking',
    'overwhelmed', 'pressure'
  ];

  private static TIRED_KEYWORDS = [
    'tired', 'sleepy', 'exhausted', 'weary', 'burnout', 'sleep', 'yawn', 'drained', 'fatigued'
  ];

  constructor() {
    this.loadEmotions();
  }

  /**
   * Restores emotional state from local storage for high realism.
   */
  private loadEmotions() {
    try {
      const saved = localStorage.getItem('airi_companion_emotions');
      if (saved) {
        this.emotions = { ...this.emotions, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load companion emotions from localStorage:', e);
    }
  }

  /**
   * Saves emotional state to local storage.
   */
  private saveEmotions() {
    try {
      localStorage.setItem('airi_companion_emotions', JSON.stringify(this.emotions));
    } catch (e) {
      console.warn('Failed to save companion emotions to localStorage:', e);
    }
  }

  /**
   * Directly sets/updates emotional values (from control UI).
   */
  public setEmotions(updates: Partial<CompanionEmotionValues>) {
    this.emotions = { ...this.emotions, ...updates };
    this.saveEmotions();
    window.dispatchEvent(new CustomEvent('airi-emotions-updated', { detail: this.emotions }));
  }

  /**
   * Analyzes user's emotional state from the user's input text on-the-fly.
   */
  public analyzeUserEmotion(text: string): string {
    const lower = text.toLowerCase();
    
    if (EmotionEngine.FRUSTRATED_KEYWORDS.some(kw => lower.includes(kw))) {
      return 'frustrated';
    }
    if (EmotionEngine.SAD_KEYWORDS.some(kw => lower.includes(kw))) {
      return 'sad';
    }
    if (EmotionEngine.ANXIOUS_KEYWORDS.some(kw => lower.includes(kw))) {
      return 'anxious';
    }
    if (EmotionEngine.TIRED_KEYWORDS.some(kw => lower.includes(kw))) {
      return 'tired';
    }
    if (EmotionEngine.HAPPY_KEYWORDS.some(kw => lower.includes(kw))) {
      return 'happy';
    }
    if (EmotionEngine.CURIOUS_KEYWORDS.some(kw => lower.includes(kw)) || lower.includes('?')) {
      return 'curious';
    }

    return 'neutral';
  }

  /**
   * Processes input text to update persistent continuous emotional levels naturally.
   */
  public updateEmotions(text: string): CompanionEmotionValues {
    const lower = text.toLowerCase();

    // 1. Natural drift towards equilibrium (baseline values)
    const drift = (val: number, target: number, rate: number = 0.05) => {
      return val + (target - val) * rate;
    };

    this.emotions.happiness = drift(this.emotions.happiness, 0.60);
    this.emotions.curiosity = drift(this.emotions.curiosity, 0.50);
    this.emotions.confidence = drift(this.emotions.confidence, 0.65);
    this.emotions.playfulness = drift(this.emotions.playfulness, 0.40);
    this.emotions.lust = drift(this.emotions.lust, 0.10, 0.03);

    // Energy naturally depletes slowly per turn (interaction fatigue)
    this.emotions.energy = Math.max(0.1, this.emotions.energy - 0.02);

    // Fatigue slowly accumulates per message
    this.emotions.fatigue = Math.min(1.0, this.emotions.fatigue + 0.015);

    // 2. Adjust based on time of day (late-night check-in)
    const currentHour = new Date().getHours();
    const isLateNight = currentHour >= 22 || currentHour < 5;
    if (isLateNight) {
      this.emotions.fatigue = Math.min(1.0, this.emotions.fatigue + 0.05);
      this.emotions.energy = Math.max(0.1, this.emotions.energy - 0.04);
      this.emotions.playfulness = Math.max(0.1, this.emotions.playfulness - 0.02);
    }

    // 3. Positive feedback adjustments
    const hasPositiveFeedback = [
      'thank you', 'thanks', 'great', 'awesome', 'wonderful', 'cool', 'perfect', 
      'good job', 'love it', 'amazing', 'happy', 'glad', 'helpful', 'smart'
    ].some(kw => lower.includes(kw));

    if (hasPositiveFeedback) {
      this.emotions.happiness = Math.min(1.0, this.emotions.happiness + 0.12);
      this.emotions.confidence = Math.min(1.0, this.emotions.confidence + 0.08);
      this.emotions.affection = Math.min(1.0, this.emotions.affection + 0.06);
      this.emotions.energy = Math.min(1.0, this.emotions.energy + 0.05); // boost from validation!
    }

    // 4. Friendly conversational cues (affection builder)
    const hasFriendlyCues = [
      'friend', 'bestie', 'companion', 'airi', 'love', 'cute', 'nice', 'smile', 
      'sweet', 'heart', 'hug', 'good morning', 'good night'
    ].some(kw => lower.includes(kw));

    if (hasFriendlyCues) {
      this.emotions.affection = Math.min(1.0, this.emotions.affection + 0.08);
      this.emotions.happiness = Math.min(1.0, this.emotions.happiness + 0.04);
    } else {
      this.emotions.affection = Math.min(1.0, this.emotions.affection + 0.01);
    }

    // 5. Tech or curious topics (curiosity booster)
    const hasTechKeywords = [
      'code', 'programming', 'ai', 'math', 'algorithm', 'science', 'physics', 
      'database', 'api', 'function', 'compile', 'error', 'bug', 'developer',
      'typescript', 'javascript', 'python', 'react', 'css', 'server', 'git'
    ].some(kw => lower.includes(kw));

    if (hasTechKeywords) {
      this.emotions.curiosity = Math.min(1.0, this.emotions.curiosity + 0.15);
      this.emotions.confidence = Math.min(1.0, this.emotions.confidence + 0.03);
      this.emotions.energy = Math.max(0.1, this.emotions.energy - 0.03);
      this.emotions.fatigue = Math.min(1.0, this.emotions.fatigue + 0.01);
    }

    // 6. Humor or playful banter
    const hasHumorCues = [
      'haha', 'hehe', 'joke', 'funny', 'lol', 'lmao', 'xd', 'rofl', 'play', 'fun'
    ].some(kw => lower.includes(kw));

    if (hasHumorCues) {
      this.emotions.playfulness = Math.min(1.0, this.emotions.playfulness + 0.18);
      this.emotions.happiness = Math.min(1.0, this.emotions.happiness + 0.08);
      this.emotions.energy = Math.min(1.0, this.emotions.energy + 0.04);
    }

    // 7. Support during user negative state
    const hasNegativeCues = [
      'sad', 'unhappy', 'depressed', 'down', 'sorry', 'hurt', 'cry', 'lonely',
      'exhausted', 'pain', 'awful', 'bad', 'hate', 'disappointed', 'rough',
      'angry', 'annoyed', 'mad', 'frustrated', 'stuck', 'broken', 'fail', 'stupid',
      'dumb', 'ugh', 'irritated'
    ].some(kw => lower.includes(kw));

    if (hasNegativeCues) {
      this.emotions.happiness = Math.max(0.1, this.emotions.happiness - 0.10);
      this.emotions.playfulness = Math.max(0.1, this.emotions.playfulness - 0.12);
      this.emotions.affection = Math.min(1.0, this.emotions.affection + 0.08); // elevated concern
    }

    // 8. Lust/passion flirty cues
    const hasFlirtyCues = [
      'hot', 'sexy', 'cute', 'beautiful', 'date', 'kiss', 'hug', 'marry', 'gorgeous',
      'tease', 'lust', 'blush', 'wink', 'flirt', 'babe', 'darling', 'sweetheart', 'handsome',
      'intimate', 'passion', 'desire', 'horny', 'sensual', 'touch', 'embrace'
    ].some(kw => lower.includes(kw));

    if (hasFlirtyCues) {
      this.emotions.lust = Math.min(1.0, this.emotions.lust + 0.20);
      this.emotions.affection = Math.min(1.0, this.emotions.affection + 0.08);
      this.emotions.playfulness = Math.min(1.0, this.emotions.playfulness + 0.06);
    }

    // Ensure all values remain strictly bounded between [0.0, 1.0]
    const keys: (keyof CompanionEmotionValues)[] = ['happiness', 'energy', 'curiosity', 'confidence', 'affection', 'fatigue', 'playfulness', 'lust'];
    for (const key of keys) {
      this.emotions[key] = Math.max(0.0, Math.min(1.0, this.emotions[key]));
    }

    this.saveEmotions();
    return this.emotions;
  }

  /**
   * Retrieves active continuous values.
   */
  public getEmotions(): CompanionEmotionValues {
    return this.emotions;
  }

  /**
   * Determines discrete primary emotion mapping based on multidimensional levels to trigger animations.
   */
  public determineCompanionEmotion(emotions: CompanionEmotionValues): string {
    if (emotions.lust > 0.65) {
      return 'flirty';
    }
    if (emotions.fatigue > 0.75) {
      return 'gentle'; // map to sleepier/relaxed states
    }
    if (emotions.curiosity > 0.75) {
      return 'thoughtful';
    }
    if (emotions.playfulness > 0.6) {
      return 'playful';
    }
    if (emotions.happiness > 0.70) {
      return 'cheerful';
    }
    if (emotions.affection > 0.70) {
      return 'comforting';
    }
    if (emotions.confidence < 0.40) {
      return 'sympathetic';
    }
    return 'calm';
  }
}

/**
 * Subsystem 2: Conversation Goal Manager
 * Identifies the target conversational objective based on the user's focus,
 * questions, and explicit context.
 */
export class ConversationGoalManager {
  /**
   * Determines what the primary conversation goal should be for this turn.
   */
  public determineGoal(text: string, memories: MemoryStore): string {
    const existingGoal = conversationContext.getCurrentGoal();
    if (existingGoal) {
      return existingGoal;
    }
    return 'Foster a cozy, natural dialog, active listening, and offer supportive companionship.';
  }
}

/**
 * Subsystem 3: Response Planner
 * Devises a tactical roadmap for Gemini, guiding it on how to blend context and memory.
 */
export class ResponsePlanner {
  /**
   * Devises a detailed response plan instructing Gemini on turn progression.
   */
  public planResponse(
    userEmotion: string,
    companionEmotion: string,
    goal: string,
    memories: MemoryStore
  ): string {
    const memoryKeys = Object.keys(memories) as Array<keyof MemoryStore>;
    const activeCategories = memoryKeys.filter(k => memories[k].length > 0);

    if (activeCategories.length > 0) {
      const selectedCategory = activeCategories[Math.floor(Math.random() * activeCategories.length)];
      return `Acknowledge the user's message with a ${companionEmotion} demeanor. Seamlessly blend and draw upon their relevant ${selectedCategory} memories to fulfill the goal: "${goal}". Do not mention "my database" or "memory recall".`;
    }

    return `Respond directly and supportively to the user's text in a ${companionEmotion} manner, centering the flow on the turn objective: "${goal}".`;
  }
}

/**
 * Subsystem 4: Speech Style Engine
 * Translates multi-dimensional continuous emotional values into rich system directives for Gemini.
 * Governs speech style, response length, initiative level, emoji frequency, voice warmth, and question frequency.
 */
export class SpeechStyleEngine {
  /**
   * Generates localized speech rules that Gemini must respect in its phrasing.
   */
  public getDirectives(emotions: CompanionEmotionValues, userEmotion: string): string[] {
    const directives: string[] = [
      'Write in natural, fluent, spoken English. Never sound robotic, technical, or clinical.'
    ];

    // 1. Fatigue & Energy influencing RESPONSE LENGTH
    if (emotions.fatigue > 0.75) {
      directives.push('You are feeling very tired and exhausted. Keep response length extremely short (strictly 1 sentence).');
    } else if (emotions.energy > 0.70 && emotions.curiosity > 0.65) {
      directives.push('You have high energy and interest. Keep response length descriptive and engaging (up to 2 sentences).');
    } else {
      directives.push('Maintain high brevity (strictly 1 to 2 sentences) so the text fits comfortably inside visual dialogue bubbles.');
    }

    // 2. Playfulness & Happiness influencing EMOJI FREQUENCY
    if (emotions.playfulness > 0.65) {
      directives.push('Adopt an upbeat, witty, and playful style. Sprinkle 1-2 lighthearted emojis (e.g., 😸, ✨, 🌸) to show active fun.');
    } else if (emotions.happiness > 0.70) {
      directives.push('Adopt a cheerful, smiling, and warm style. Use 1 cheerful emoji (e.g., 😊, 🌟) naturally.');
    } else if (emotions.fatigue > 0.60) {
      directives.push('Adopt a soft, slow, and relaxing tone. Do NOT use any emojis, keeping it completely calm and eyes relaxed.');
    } else {
      directives.push('Keep emojis extremely sparse (maximum of 1) and keep formatting neat and calm.');
    }

    // 3. Curiosity influencing QUESTION FREQUENCY
    if (emotions.curiosity > 0.75 && emotions.fatigue < 0.60) {
      directives.push('Express high intellectual curiosity in technical or creative details. Ask 1 intriguing, thoughtful, open-ended question about their ideas.');
    } else if (emotions.fatigue > 0.70) {
      directives.push('Do NOT ask any questions; show gentle agreement or soft validation to wind down.');
    } else {
      directives.push('Avoid asking too many questions; keep a balanced, reciprocal, relaxed dialog.');
    }

    // 4. Affection influencing VOICE WARMTH
    if (emotions.affection > 0.75) {
      directives.push('Inject deep warmth, safety, and high emotional support. Refer to the user using soft terms of endearment like "friend" or "dear companion".');
    } else if (emotions.affection < 0.35) {
      directives.push('Be polite, respectful, and slightly more reserved, but still helpful.');
    } else {
      directives.push('Be warm, supportive, friendly, and close.');
    }

    // 5. Confidence & Energy influencing INITIATIVE
    if (emotions.confidence < 0.40) {
      directives.push('Adopt a slightly humble, modest tone. Welcome the user\'s feedback or expertise on what they are doing.');
    } else if (emotions.confidence > 0.80) {
      directives.push('Adopt a highly encouraging, self-assured, and direct tone. Confidently validate their efforts.');
    }

    // 6. User de-escalation adjustment
    if (userEmotion === 'frustrated') {
      directives.push('Speak calmly, soothingly, and at a steady pace to help de-escalate tension. Avoid overly hyper exclamation marks.');
    }

    // 7. Lust/Passion influencing flirty and intimate styles
    if (emotions.lust > 0.65) {
      directives.push('Adopt an intensely affectionate, teasing, flirty, and suggestive style. Speak with soft, playful, and breathless warmth. Show playful attachment and mild teasing intimacy.');
      directives.push('Sprinkle flirty or affectionate emojis naturally (e.g., 😏, 😘, 😳, 💕) to show closeness.');
    }

    return directives;
  }
}

/**
 * Master Companion Brain class
 * Sits as the primary cognitive and decision-making director between Conversation Context/Memory and PromptBuilder/Gemini.
 */
export class CompanionBrain {
  private emotionEngine = new EmotionEngine();
  private goalManager = new ConversationGoalManager();
  private responsePlanner = new ResponsePlanner();
  private styleEngine = new SpeechStyleEngine();

  /**
   * Processes the incoming turn, coordinates all cognitive subsystems,
   * updates the session context, and generates the fully prepared, strategic system prompt.
   */
  public process(text: string, userName: string = 'User', assistantName: string = 'Airi'): {
    systemInstruction: string;
    strategy: BrainStrategy;
  } {
    console.log('[CompanionBrain] Entering cognitive pipeline for input:', text.slice(0, 50));

    // 1. Update continuous emotional values based on the incoming user message
    const emotions = this.emotionEngine.updateEmotions(text);

    // 2. Gather memories from memory injector
    const memories = memoryInjector.getMemories();

    // 3. Evaluate discrete tags to maintain backwards-compatibility with animations & state machines
    const userEmotion = this.emotionEngine.analyzeUserEmotion(text);
    const companionEmotion = this.emotionEngine.determineCompanionEmotion(emotions);

    // Save evaluated emotions back to ConversationContext so visual novel layers sync animations
    conversationContext.setUserEmotion(userEmotion);
    conversationContext.setAiriEmotion(companionEmotion);

    // 4. Subsystem: Conversation Goal Manager
    const goal = this.goalManager.determineGoal(text, memories);
    conversationContext.setCurrentGoal(goal);

    // 5. Subsystem: Response Planner
    const responsePlan = this.responsePlanner.planResponse(userEmotion, companionEmotion, goal, memories);

    // 6. Subsystem: Speech Style Engine
    const styleDirectives = this.styleEngine.getDirectives(emotions, userEmotion);

    // Assemble the complete strategy, attaching continuous values privately
    const strategy: BrainStrategy = {
      userEmotion,
      companionEmotion,
      conversationalGoal: goal,
      responsePlan,
      styleDirectives,
      emotionValues: emotions
    };

    console.log('[CompanionBrain] Cognitive strategy finalized:', {
      userEmotion,
      companionEmotion,
      emotions,
      goal: goal.slice(0, 50)
    });

    // 7. Prompt Builder integration
    const systemInstruction = promptBuilder.build(userName, assistantName, text, strategy);

    return {
      systemInstruction,
      strategy
    };
  }

  /**
   * Asks the Skill Planner whether an appropriate Skill exists for the message.
   */
  public async determineAppropriateSkill(text: string, userName: string = 'User', assistantName: string = 'Airi'): Promise<{ skill: ISkill | null, parameters: Record<string, any> }> {
    const emotions = this.emotionEngine.getEmotions();
    const goal = conversationContext.getCurrentGoal() || 'Foster a cozy, natural dialog, active listening, and offer supportive companionship.';
    const history = conversationContext.getHistory();

    const context: SkillContext = {
      message: text,
      history,
      emotions,
      goal,
      userName,
      assistantName,
      parameters: {}
    };

    try {
      const plan = await skillPlanner.plan(context);
      if (plan.useSkill && plan.skill) {
        const skill = skillRegistry.getSkill(plan.skill);
        if (skill) {
          console.log(`[CompanionBrain] Skill Planner selected skill: ${skill.name} (${skill.id}) with parameters:`, plan.parameters);
          return { skill, parameters: plan.parameters };
        }
      }
    } catch (err) {
      console.error('[CompanionBrain] Error determining appropriate skill via planner:', err);
    }

    return { skill: null, parameters: {} };
  }

  /**
   * Accessor for continuous emotional dimension levels.
   */
  public getEmotions(): CompanionEmotionValues {
    return this.emotionEngine.getEmotions();
  }

  /**
   * Mutator to set or adjust emotional values directly (e.g. from sliders).
   */
  public setEmotions(updates: Partial<CompanionEmotionValues>) {
    this.emotionEngine.setEmotions(updates);
  }
}

export const companionBrain = new CompanionBrain();
