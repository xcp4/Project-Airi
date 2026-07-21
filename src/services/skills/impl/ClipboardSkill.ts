import { ISkill } from '../ISkill';
import { SkillContext, SkillResult } from '../types';

export class ClipboardSkill implements ISkill {
  public id = 'clipboard_skill';
  public name = 'System Clipboard';
  public description = 'Enables reading from or writing text contents to the user system clipboard.';
  public capabilities = ['clipboard_read', 'clipboard_write'];
  public parameterSchema = {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['read', 'write'] },
      text: { type: 'string' }
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
    await new Promise(resolve => setTimeout(resolve, 300));

    if (this.isCancelled) {
      return { success: false, output: null, error: 'Execution cancelled' };
    }

    const { action, text } = context.parameters;
    const textStr = text || 'Simulated clipboard content';

    return {
      success: true,
      output: {
        action,
        text: action === 'write' ? `Successfully copied "${textStr}" to system clipboard!` : 'Simulated clipboard text content retrieved.',
        length: textStr.length
      },
      metadata: {
        system: 'WebClipboardAPIMock'
      }
    };
  }

  public async cancel(): Promise<void> {
    this.isCancelled = true;
  }
}
