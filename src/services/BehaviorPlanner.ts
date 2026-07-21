import { BehaviorAction, AiriState } from '../types';
import { stateMachine } from './StateMachine';
import { eventBus } from './EventBus';
import { characterPluginRegistry } from './CharacterPluginRegistry';

/**
 * Behavior Planner
 * High-level engine that translates abstract AI intentions ("greet_user", "think")
 * into sequential, scheduled animation frames, facial expressions, speech, and effects.
 */
class BehaviorPlanner {
  private activeSequenceId: string | null = null;
  private currentPromise: Promise<void> | null = null;
  private abortController: AbortController | null = null;

  constructor() {
    // Listen to incoming high-level behavioral triggers from the AI or system
    eventBus.subscribe('behavior:trigger', (data) => {
      this.executeIntent(data.intent);
    });
  }

  /**
   * Resolves a semantic AI intent into a scheduled execution graph
   */
  public async executeIntent(intent: string): Promise<void> {
    console.log(`[BehaviorPlanner] Intercepted semantic intent: "${intent}"`);

    // Cancel any active running behavioral sequence to handle instant interrupts
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // Load active character behaviors from the Plugin Registry
    const behaviors = characterPluginRegistry.getActiveBehaviors();
    let actions = behaviors[intent];

    // Fallback behavior mappings in case character package definitions are missing (Failsafe)
    if (!actions) {
      console.warn(`[BehaviorPlanner] Intent "${intent}" not found for active character, using fallback mappings.`);
      actions = this.getFallbackActions(intent);
    }

    this.activeSequenceId = intent;
    this.currentPromise = this.runSequence(actions, signal);

    try {
      await this.currentPromise;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log(`[BehaviorPlanner] Active intent "${intent}" sequence was successfully aborted.`);
      } else {
        console.error(`[BehaviorPlanner] Error executing behavioral sequence for "${intent}":`, err);
      }
    } finally {
      if (this.activeSequenceId === intent) {
        this.activeSequenceId = null;
        this.currentPromise = null;
      }
    }
  }

  /**
   * Sequences through actions asynchronously, respecting delay steps and signals
   */
  private async runSequence(actions: BehaviorAction[], signal: AbortSignal): Promise<void> {
    for (const action of actions) {
      if (signal.aborted) {
        throw new DOMException('Sequence aborted', 'AbortError');
      }

      console.log(`[BehaviorPlanner] Dispatching sequence node: ${action.actionType}`, action.params);

      switch (action.actionType) {
        case 'animation': {
          const stateStr = action.params.targetId?.toUpperCase();
          if (stateStr && stateStr in AiriState) {
            const targetState = AiriState[stateStr as keyof typeof AiriState];
            stateMachine.transitionTo(targetState, action.params.durationMs);
          } else {
            // Support triggering custom animation IDs by publishing to the renderer
            eventBus.publish('animation:trigger', {
              animationId: action.params.targetId || 'idle_default',
              loop: action.params.durationMs ? false : true
            });
          }
          break;
        }

        case 'expression': {
          eventBus.publish('expression:change', {
            expressionId: action.params.targetId || 'neutral'
          });
          break;
        }

        case 'speech': {
          if (action.params.text) {
            eventBus.publish('chat:bubble', {
              text: action.params.text,
              duration: action.params.durationMs || 3000
            });
          }
          break;
        }

        case 'wait': {
          const delay = action.params.durationMs || 1000;
          await this.delay(delay, signal);
          break;
        }

        case 'effect': {
          // Play transit sound or particle systems
          console.log(`[BehaviorPlanner] Rendering visual effect: ${action.params.particleType}`);
          break;
        }
      }

      // Automatically yield a small tick to keep transitions fluid
      await this.delay(50, signal);
    }
  }

  private delay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException('Delay aborted', 'AbortError'));
      };

      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);

      signal.addEventListener('abort', onAbort);
    });
  }

  /**
   * Built-in fallback intent-to-behavior compiler (Failsafe)
   */
  private getFallbackActions(intent: string): BehaviorAction[] {
    switch (intent) {
      case 'greet_user':
        return [
          { actionType: 'expression', params: { targetId: 'happy' } },
          { actionType: 'animation', params: { targetId: 'wave', durationMs: 1500 } },
          { actionType: 'speech', params: { text: "Yay! Hello! I'm so happy to see you!" } }
        ];
      case 'think':
        return [
          { actionType: 'expression', params: { targetId: 'thinking' } },
          { actionType: 'animation', params: { targetId: 'thinking', durationMs: 2000 } },
          { actionType: 'speech', params: { text: "Hmm, let me think about that..." } },
          { actionType: 'wait', params: { durationMs: 2000 } }
        ];
      case 'answer_question':
        return [
          { actionType: 'expression', params: { targetId: 'neutral' } },
          { actionType: 'animation', params: { targetId: 'talking' } }
        ];
      case 'apologize':
        return [
          { actionType: 'expression', params: { targetId: 'sad' } },
          { actionType: 'animation', params: { targetId: 'sad', durationMs: 2500 } }
        ];
      case 'congratulate_user':
        return [
          { actionType: 'expression', params: { targetId: 'happy' } },
          { actionType: 'animation', params: { targetId: 'happy', durationMs: 2000 } }
        ];
      default:
        // Default recovery behavior: safe neutral pose
        return [
          { actionType: 'expression', params: { targetId: 'neutral' } },
          { actionType: 'animation', params: { targetId: 'idle_default' } }
        ];
    }
  }
}

export const behaviorPlanner = new BehaviorPlanner();
export default behaviorPlanner;
