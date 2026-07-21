import { ISkill } from '../ISkill';
import { SkillContext, SkillResult } from '../types';

export class BrowserSkill implements ISkill {
  public id = 'browser_skill';
  public name = 'Web Browser Controller';
  public description = 'Enables opening website urls, rendering custom web page snapshots, or surfing.';
  public capabilities = ['open_url', 'extract_text', 'browse'];
  public parameterSchema = {
    type: 'object',
    properties: {
      url: { type: 'string' }
    },
    required: ['url']
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

    const { url } = context.parameters;

    return {
      success: true,
      output: {
        message: `Successfully navigated virtual browser to: ${url}`,
        url
      },
      metadata: {
        viewport: '1280x800',
        engine: 'ChromiumMock'
      }
    };
  }

  public async cancel(): Promise<void> {
    this.isCancelled = true;
  }
}
