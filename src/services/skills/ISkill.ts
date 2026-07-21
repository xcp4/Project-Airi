import { SkillContext, SkillResult } from './types';

export interface ISkill {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  parameterSchema: Record<string, any>;
  canExecute(context: SkillContext): boolean;
  execute(context: SkillContext): Promise<SkillResult>;
  cancel(): Promise<void>;
}
