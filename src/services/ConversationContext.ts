import { ResponsePlan } from '../types';

export interface ChatTurn {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

class ConversationContext {
  private history: ChatTurn[] = [];
  private airiEmotion: string = 'calm';
  private userEmotion: string = 'neutral';
  private currentGoal: string = 'Build a supportive relationship and listen carefully';
  private currentResponsePlan: ResponsePlan = {
    short: true,
    detailed: false,
    askFollowUp: true,
    explainStepByStep: false,
    encourageUser: true,
    makeLightJoke: false,
    remainSerious: false,
    summarize: false,
    continueMomentum: true,
    takeInitiative: false,
    rationale: 'Failsafe baseline conversational behavior.'
  };
  private maxHistoryLen: number = 10;

  constructor() {
    this.loadContext();
  }

  private loadContext() {
    try {
      const saved = localStorage.getItem('airi_conversation_context');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.history = Array.isArray(parsed.history) ? parsed.history : [];
        this.airiEmotion = typeof parsed.airiEmotion === 'string' ? parsed.airiEmotion : 'calm';
        this.userEmotion = typeof parsed.userEmotion === 'string' ? parsed.userEmotion : 'neutral';
        this.currentGoal = typeof parsed.currentGoal === 'string' ? parsed.currentGoal : 'Build a supportive relationship and listen carefully';
        if (parsed.currentResponsePlan && typeof parsed.currentResponsePlan === 'object') {
          this.currentResponsePlan = { ...this.currentResponsePlan, ...parsed.currentResponsePlan };
        }
      }
    } catch (e) {
      console.warn('Failed to load conversation context, using clean defaults:', e);
    }
  }

  public saveContext() {
    try {
      localStorage.setItem('airi_conversation_context', JSON.stringify({
        history: this.history,
        airiEmotion: this.airiEmotion,
        userEmotion: this.userEmotion,
        currentGoal: this.currentGoal,
        currentResponsePlan: this.currentResponsePlan
      }));
    } catch (e) {
      console.error('Failed to save conversation context:', e);
    }
  }

  public getHistory(): ChatTurn[] {
    return this.history;
  }

  public addTurn(sender: 'user' | 'assistant', text: string) {
    this.history.push({
      sender,
      text,
      timestamp: new Date().toISOString()
    });
    if (this.history.length > this.maxHistoryLen) {
      this.history.shift();
    }
    this.saveContext();
  }

  public clearHistory() {
    this.history = [];
    this.airiEmotion = 'calm';
    this.userEmotion = 'neutral';
    this.currentGoal = 'Build a supportive relationship and listen carefully';
    this.currentResponsePlan = {
      short: true,
      detailed: false,
      askFollowUp: true,
      explainStepByStep: false,
      encourageUser: true,
      makeLightJoke: false,
      remainSerious: false,
      summarize: false,
      continueMomentum: true,
      takeInitiative: false,
      rationale: 'Failsafe baseline conversational behavior.'
    };
    this.saveContext();
  }

  public getAiriEmotion(): string {
    return this.airiEmotion;
  }

  public setAiriEmotion(emotion: string) {
    this.airiEmotion = emotion;
    this.saveContext();
  }

  public getUserEmotion(): string {
    return this.userEmotion;
  }

  public setUserEmotion(emotion: string) {
    this.userEmotion = emotion;
    this.saveContext();
  }

  public getCurrentGoal(): string {
    return this.currentGoal;
  }

  public setCurrentGoal(goal: string) {
    this.currentGoal = goal;
    this.saveContext();
  }

  public getCurrentResponsePlan(): ResponsePlan {
    return this.currentResponsePlan;
  }

  public setCurrentResponsePlan(plan: ResponsePlan) {
    this.currentResponsePlan = plan;
    this.saveContext();
  }

  /**
   * Generates a dynamic prompt section summarizing current dynamic context
   */
  public buildContextSection(): string {
    return `
## CURRENT DYNAMIC SESSION CONTEXT
- **Estimated User Emotion**: ${this.userEmotion}
- **Airi's Current Emotional State**: ${this.airiEmotion}
- **Current Conversational Goal**: ${this.currentGoal}
- **Current Local Time**: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
`.trim();
  }
}

export const conversationContext = new ConversationContext();
