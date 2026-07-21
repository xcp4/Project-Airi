import { ISkill } from '../ISkill';
import { SkillContext, SkillResult } from '../types';

export class VisionSkill implements ISkill {
  public id = 'vision_skill';
  public name = 'Computer Vision';
  public description = 'Enables looking through camera feeds, analyzing screenshots, or examining user interface panels.';
  public capabilities = ['take_snapshot', 'analyze_image', 'detect_faces'];
  public parameterSchema = {
    type: 'object',
    properties: {
      source: { type: 'string', enum: ['camera', 'screen', 'upload'] }
    },
    required: ['source']
  };

  private isCancelled = false;

  public canExecute(context: SkillContext): boolean {
    const required = this.parameterSchema.required || [];
    return required.every((field: string) => context.parameters && context.parameters[field] !== undefined);
  }

  public async execute(context: SkillContext): Promise<SkillResult> {
    this.isCancelled = false;
    await new Promise(resolve => setTimeout(resolve, 800));

    if (this.isCancelled) {
      return { success: false, output: null, error: 'Execution cancelled' };
    }

    const { source } = context.parameters;

    return {
      success: true,
      output: {
        analysis: `Airi completed a detailed visual snapshot analysis of the "${source}" source. Confirmed clean high-contrast colors and balanced layouts.`,
        objectsDetected: ['interface_card', 'dialogue_box', 'user_presence']
      },
      metadata: {
        cameraResolution: '1080p',
        engine: 'GeminiVisionMock'
      }
    };
  }

  public async cancel(): Promise<void> {
    this.isCancelled = true;
  }
}
