import { CompanionEmotionValues } from '../../types';

export interface SkillContext {
  message: string;
  history: any[];
  emotions: CompanionEmotionValues;
  goal: string;
  userName: string;
  assistantName: string;
  parameters: Record<string, any>;
}

export interface SkillResult {
  success: boolean;
  output: any;
  error?: string;
  metadata?: Record<string, any>;
}

export type SkillExecutionState = 'idle' | 'checking' | 'executing' | 'success' | 'failed' | 'cancelled';

export interface SkillExecutionInfo {
  skillId: string;
  state: SkillExecutionState;
  startTime: number;
  endTime?: number;
  result?: SkillResult;
  parameters?: Record<string, any>;
}
