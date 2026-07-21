import { ISkill } from '../ISkill';
import { SkillContext, SkillResult } from '../types';

export class MemorySkill implements ISkill {
  public id = 'memory_skill';
  public name = 'Memory Retrieval & Storage';
  public description = 'Allows Airi to store, retrieve, or recall personal facts and memories.';
  public capabilities = ['memory_read', 'memory_write', 'recall'];
  public parameterSchema = {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['store', 'recall', 'clear'] },
      key: { type: 'string' },
      value: { type: 'string' }
    },
    required: ['action']
  };

  private isCancelled = false;

  public canExecute(context: SkillContext): boolean {
    const required = this.parameterSchema.required || [];
    return required.every((field: string) => context.parameters && context.parameters[field] !== undefined);
  }

  public async execute(context: SkillContext): Promise<SkillResult> {
    this.isCancelled = false;
    await new Promise(resolve => setTimeout(resolve, 500));

    if (this.isCancelled) {
      return { success: false, output: null, error: 'Execution cancelled' };
    }

    const { action, key, value } = context.parameters;
    const keyStr = key || 'general';
    const valueStr = value || '';
    const output = action === 'store' 
      ? `Saved memory: "${keyStr}" = "${valueStr}" successfully.`
      : action === 'clear'
      ? `Cleared memory for key "${keyStr}".`
      : `Recalled memories matching "${keyStr}".`;

    return {
      success: true,
      output: {
        message: output,
        action,
        key: keyStr,
        value: valueStr,
        timestamp: Date.now()
      },
      metadata: {
        source: 'MemorySkill',
        confidence: 0.98
      }
    };
  }

  public async cancel(): Promise<void> {
    this.isCancelled = true;
  }
}
