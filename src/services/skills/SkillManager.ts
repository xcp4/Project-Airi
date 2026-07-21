import { ISkill } from './ISkill';
import { skillRegistry } from './SkillRegistry';
import { SkillContext, SkillResult, SkillExecutionInfo, SkillExecutionState } from './types';

export class SkillManager {
  private static instance: SkillManager;
  private activeExecutions: Map<string, SkillExecutionInfo> = new Map();
  private recentExecutions: SkillExecutionInfo[] = [];

  private constructor() {}

  public static getInstance(): SkillManager {
    if (!SkillManager.instance) {
      SkillManager.instance = new SkillManager();
    }
    return SkillManager.instance;
  }

  /**
   * Retrieves a list of recent skill executions for UI control boards.
   */
  public getRecentExecutions(): SkillExecutionInfo[] {
    return this.recentExecutions;
  }

  /**
   * Clears the execution history.
   */
  public clearHistory(): void {
    this.recentExecutions = [];
    window.dispatchEvent(new CustomEvent('airi-skill-execution-clear'));
  }

  /**
   * Find an appropriate registered skill matching the current context.
   */
  public findAppropriateSkill(context: SkillContext): ISkill | null {
    const skills = skillRegistry.getAllSkills();
    for (const skill of skills) {
      try {
        if (skill.canExecute(context)) {
          console.log(`[SkillManager] Found appropriate skill: ${skill.name} (${skill.id})`);
          return skill;
        }
      } catch (err) {
        console.error(`[SkillManager] Error checking canExecute for skill ${skill.id}:`, err);
      }
    }
    return null;
  }

  private addOrUpdateRecentExecution(info: SkillExecutionInfo) {
    const existingIndex = this.recentExecutions.findIndex(
      x => x.skillId === info.skillId && x.startTime === info.startTime
    );
    if (existingIndex !== -1) {
      this.recentExecutions[existingIndex] = info;
    } else {
      this.recentExecutions.unshift(info);
      if (this.recentExecutions.length > 50) {
        this.recentExecutions.pop();
      }
    }
  }

  /**
   * Orchestrates the execution of a specific skill, managing the state transitions.
   */
  public async executeSkill(skillId: string, context: SkillContext): Promise<SkillResult> {
    const skill = skillRegistry.getSkill(skillId);
    if (!skill) {
      const errorMsg = `Skill with ID "${skillId}" not found in registry.`;
      console.error(`[SkillManager] ${errorMsg}`);
      return { success: false, output: null, error: errorMsg };
    }

    console.log(`[SkillManager] Executing skill: ${skill.name} (${skill.id})`);

    const executionInfo: SkillExecutionInfo = {
      skillId,
      state: 'executing',
      startTime: Date.now(),
      parameters: context.parameters
    };
    this.activeExecutions.set(skillId, executionInfo);
    this.addOrUpdateRecentExecution(executionInfo);

    // Notify listeners about skill state changes
    this.dispatchSkillEvent(skillId, 'executing');

    try {
      const result = await skill.execute(context);
      
      const updatedInfo: SkillExecutionInfo = {
        ...executionInfo,
        state: result.success ? 'success' : 'failed',
        endTime: Date.now(),
        result
      };
      this.activeExecutions.set(skillId, updatedInfo);
      this.addOrUpdateRecentExecution(updatedInfo);
      this.dispatchSkillEvent(skillId, result.success ? 'success' : 'failed', result);

      console.log(`[SkillManager] Skill execution completed: ${skillId}`, result);
      return result;
    } catch (err: any) {
      console.error(`[SkillManager] Uncaught error during skill execution for ${skillId}:`, err);
      
      const errorResult: SkillResult = {
        success: false,
        output: null,
        error: err.message || 'Unknown error occurred during execution'
      };

      const updatedInfo: SkillExecutionInfo = {
        ...executionInfo,
        state: 'failed',
        endTime: Date.now(),
        result: errorResult
      };
      this.activeExecutions.set(skillId, updatedInfo);
      this.addOrUpdateRecentExecution(updatedInfo);
      this.dispatchSkillEvent(skillId, 'failed', errorResult);

      return errorResult;
    }
  }

  /**
   * Cancels a currently running skill execution.
   */
  public async cancelSkill(skillId: string): Promise<void> {
    const skill = skillRegistry.getSkill(skillId);
    const execution = this.activeExecutions.get(skillId);

    if (skill && execution && execution.state === 'executing') {
      console.log(`[SkillManager] Requesting cancellation for skill: ${skillId}`);
      try {
        await skill.cancel();
        
        const updatedInfo: SkillExecutionInfo = {
          ...execution,
          state: 'cancelled',
          endTime: Date.now(),
          result: { success: false, output: null, error: 'Execution cancelled by manager' }
        };
        this.activeExecutions.set(skillId, updatedInfo);
        this.addOrUpdateRecentExecution(updatedInfo);
        this.dispatchSkillEvent(skillId, 'cancelled');
      } catch (err) {
        console.error(`[SkillManager] Error cancelling skill ${skillId}:`, err);
      }
    }
  }

  /**
   * Get execution details for a skill.
   */
  public getExecutionInfo(skillId: string): SkillExecutionInfo | undefined {
    return this.activeExecutions.get(skillId);
  }

  /**
   * Dispatches events to system event listeners for reactive UI states.
   */
  private dispatchSkillEvent(skillId: string, state: SkillExecutionState, result?: SkillResult): void {
    const event = new CustomEvent('airi-skill-execution', {
      detail: { skillId, state, result }
    });
    window.dispatchEvent(event);
  }
}

export const skillManager = SkillManager.getInstance();
export default skillManager;
