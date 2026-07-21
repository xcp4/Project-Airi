import { ISkill } from '../ISkill';
import { SkillContext, SkillResult } from '../types';

export class DesktopSkill implements ISkill {
  public id = 'desktop_skill';
  public name = 'Desktop Automation';
  public description = 'Enables opening desktop applications, managing workspace layouts, or automation.';
  public capabilities = ['launch_app', 'close_app', 'list_processes'];
  public parameterSchema = {
    type: 'object',
    properties: {
      appName: { type: 'string' },
      action: { type: 'string', enum: ['launch', 'terminate'] }
    },
    required: ['action', 'appName']
  };

  private isCancelled = false;

  public canExecute(context: SkillContext): boolean {
    const required = this.parameterSchema.required || [];
    return required.every((field: string) => context.parameters && context.parameters[field] !== undefined);
  }

  public async execute(context: SkillContext): Promise<SkillResult> {
    this.isCancelled = false;
    await new Promise(resolve => setTimeout(resolve, 600));

    if (this.isCancelled) {
      return { success: false, output: null, error: 'Execution cancelled' };
    }

    const { action, appName } = context.parameters;

    return {
      success: true,
      output: {
        status: `Successfully completed action "${action}" for application: ${appName}.`,
        appName,
        pid: Math.floor(Math.random() * 90000) + 10000
      },
      metadata: {
        displayIndex: 0,
        os: 'Linux_Mock'
      }
    };
  }

  public async cancel(): Promise<void> {
    this.isCancelled = true;
  }
}
