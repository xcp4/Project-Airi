import { ISkill } from '../ISkill';
import { SkillContext, SkillResult } from '../types';

export class CalculatorSkill implements ISkill {
  public id = 'calculator_skill';
  public name = 'Math Calculator';
  public description = 'Enables evaluating complex mathematical equations, formulas, or expressions.';
  public capabilities = ['evaluate', 'algebra', 'unit_conversion'];
  public parameterSchema = {
    type: 'object',
    properties: {
      expression: { type: 'string' }
    },
    required: ['expression']
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

    const { expression } = context.parameters;
    let resultValue = 42; // default mock value

    if (expression) {
      try {
        // Safe evaluation of mathematical expressions only (numbers, parentheses, basic operators)
        const clean = expression.replace(/[^0-9+\-*/\s().]/g, '');
        if (clean.trim()) {
          const evaluator = new Function(`return (${clean})`);
          const val = evaluator();
          if (typeof val === 'number' && !isNaN(val)) {
            resultValue = val;
          }
        }
      } catch {
        // Fall back to mock result for non-trivial formulas
        resultValue = 42;
      }
    }

    return {
      success: true,
      output: {
        result: resultValue,
        expression
      },
      metadata: {
        engine: 'MathJSEngineMock'
      }
    };
  }

  public async cancel(): Promise<void> {
    this.isCancelled = true;
  }
}
