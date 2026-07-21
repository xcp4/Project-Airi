import { skillRegistry } from './SkillRegistry';
import { SkillContext } from './types';

export interface SkillPlan {
  useSkill: boolean;
  skill: string | null;
  parameters: Record<string, any>;
}

export class SkillPlanner {
  private static instance: SkillPlanner;

  private constructor() {}

  public static getInstance(): SkillPlanner {
    if (!SkillPlanner.instance) {
      SkillPlanner.instance = new SkillPlanner();
    }
    return SkillPlanner.instance;
  }

  /**
   * Plans whether to execute a skill and maps parameters using Gemini on the backend.
   */
  public async plan(context: SkillContext): Promise<SkillPlan> {
    try {
      let disabledIds: string[] = [];
      try {
        const saved = localStorage.getItem('airi_disabled_skills');
        if (saved) {
          disabledIds = JSON.parse(saved);
        }
      } catch (e) {}

      const skills = skillRegistry.getAllSkills()
        .filter(skill => !disabledIds.includes(skill.id))
        .map(skill => ({
          id: skill.id,
          className: skill.constructor.name,
          name: skill.name,
          description: skill.description,
          capabilities: skill.capabilities,
          parameterSchema: skill.parameterSchema
        }));

      const response = await fetch('/api/skills/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: context.message,
          history: context.history,
          skills
        })
      });

      if (!response.ok) {
        throw new Error(`Skill planning request failed with status ${response.status}`);
      }

      const result = await response.json();
      return {
        useSkill: !!result.useSkill,
        skill: result.skill || null,
        parameters: result.parameters || {}
      };
    } catch (err) {
      console.error('[SkillPlanner] Failed to plan skill execution with Gemini:', err);
      return {
        useSkill: false,
        skill: null,
        parameters: {}
      };
    }
  }
}

export const skillPlanner = SkillPlanner.getInstance();
export default skillPlanner;
