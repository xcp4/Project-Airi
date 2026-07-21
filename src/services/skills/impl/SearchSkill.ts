import { ISkill } from '../ISkill';
import { SkillContext, SkillResult } from '../types';

export class SearchSkill implements ISkill {
  public id = 'search_skill';
  public name = 'Web Search';
  public description = 'Enables searching the web for real-time information, weather, or news.';
  public capabilities = ['web_search', 'news_lookup', 'weather_lookup'];
  public parameterSchema = {
    type: 'object',
    properties: {
      query: { type: 'string' }
    },
    required: ['query']
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

    const { query } = context.parameters;

    return {
      success: true,
      output: {
        results: [
          { 
            title: `Search result for: ${query}`, 
            snippet: `Successfully searched for "${query}". Found high-quality real-time results.` 
          }
        ],
        query
      },
      metadata: {
        engine: 'GoogleSearchMock',
        responseTimeMs: 600
      }
    };
  }

  public async cancel(): Promise<void> {
    this.isCancelled = true;
  }
}
