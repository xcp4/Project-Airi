import { AiriState } from '../types';
import { eventBus } from './EventBus';

export const isLoopingState = (state: AiriState): boolean => {
  return [
    AiriState.IDLE,
    AiriState.TALKING,
    AiriState.THINKING,
    AiriState.LISTENING,
    AiriState.SLEEPING,
    AiriState.RETURNING_TO_IDLE
  ].includes(state);
};

// Define strict state priorities to handle interruptions gracefully
const STATE_PRIORITIES: Record<AiriState, number> = {
  [AiriState.IDLE]: 0,
  [AiriState.RETURNING_TO_IDLE]: 1,
  [AiriState.WAITING]: 1,
  [AiriState.SLEEPING]: 1,
  [AiriState.STRETCH]: 2,
  [AiriState.LISTENING]: 2,
  [AiriState.CONFUSED]: 2,
  [AiriState.SAD]: 2,
  [AiriState.THINKING]: 3,
  [AiriState.TALKING]: 4,
  [AiriState.WAVE]: 4,
  [AiriState.GREETING]: 4,
  [AiriState.SURPRISED]: 5,
  [AiriState.NOTIFICATION]: 5,
  [AiriState.HAPPY]: 5,
  [AiriState.LAUGH]: 5,
};

/**
 * Character State Machine
 * Core engine responsible for handling character state transitions,
 * enforcing priority-based interruption rules, and scheduling dynamic behaviors.
 */
class StateMachine {
  private currentState: AiriState = AiriState.IDLE;
  private stateTimer: NodeJS.Timeout | null = null;
  private idleScramblerTimer: NodeJS.Timeout | null = null;
  private isStateLocked: boolean = false;

  constructor() {
    // Start the dynamic idle scrambler to prevent robotic posture repetition
    this.startIdleScrambler();
  }

  public getState(): AiriState {
    return this.currentState;
  }

  /**
   * Safe Transition to a new state.
   * If the incoming state has equal or greater priority, or if forced, we execute transition.
   * Otherwise, the transition request is rejected (preserving high-priority animations).
   * 
   * @param newState Target State
   * @param durationMs Optional lock duration (character returns to IDLE after this expires)
   * @param force Bypass priority/lock rules
   */
  public transitionTo(newState: AiriState, durationMs?: number, force: boolean = false): boolean {
    if (newState === this.currentState) return true;

    const currentPriority = STATE_PRIORITIES[this.currentState] || 0;
    const incomingPriority = STATE_PRIORITIES[newState] || 0;

    // Enforce priority-based interruption lock
    if (!force && this.isStateLocked && incomingPriority < currentPriority) {
      console.log(`[StateMachine] Blocked transition from ${this.currentState} (priority ${currentPriority}) to ${newState} (priority ${incomingPriority})`);
      return false;
    }

    const oldState = this.currentState;
    this.currentState = newState;

    const isLooping = isLoopingState(newState);

    // Clear any active timers for the current state
    if (this.stateTimer) {
      clearTimeout(this.stateTimer);
      this.stateTimer = null;
    }

    if (!isLooping) {
      // Temporary animation: lock state from lower-priority interrupts, no hardcoded timers.
      // The rendering engine's animation completion callback (e.g. video ended) will return us to IDLE.
      this.isStateLocked = true;
    } else {
      // Looping state: only lock if a custom duration was explicitly requested
      this.isStateLocked = durationMs ? true : false;

      if (durationMs) {
        this.stateTimer = setTimeout(() => {
          this.isStateLocked = false;
          // Gracefully return to IDLE
          this.transitionTo(AiriState.RETURNING_TO_IDLE, 500, true);
        }, durationMs);
      } else if (newState === AiriState.RETURNING_TO_IDLE) {
        // Automatic step down from RETURNING_TO_IDLE to IDLE after 500ms
        this.stateTimer = setTimeout(() => {
          this.transitionTo(AiriState.IDLE, undefined, true);
        }, 500);
      }
    }

    console.log(`[StateMachine] Dynamic state transition: ${oldState} ➔ ${newState} (Priority: ${incomingPriority}, Lock: ${this.isStateLocked})`);
    
    // Broadcast state change to Event Bus
    eventBus.publish('state:change', { from: oldState, to: newState });

    // Adapt idle scrambling cycles depending on target state
    if (newState === AiriState.IDLE) {
      this.startIdleScrambler();
    } else {
      this.stopIdleScrambler();
    }

    return true;
  }

  /**
   * Dynamically schedules random idle variations to keep character visually "alive" and responsive
   */
  private startIdleScrambler(): void {
    this.stopIdleScrambler();

    const scheduleNextScramble = () => {
      // Trigger a variation every 10 to 15 randomized seconds
      const nextDelay = 10000 + Math.random() * 5000;
      
      this.idleScramblerTimer = setTimeout(() => {
        if (this.currentState === AiriState.IDLE && !this.isStateLocked) {
          const variations = [AiriState.STRETCH, AiriState.WAITING];
          const selectedVariation = variations[Math.floor(Math.random() * variations.length)];
          
          console.log(`[StateMachine] Idle Scrambler selected variation: ${selectedVariation}`);
          // Trigger variation for 2000ms, then return to default idle
          this.transitionTo(selectedVariation, 2000);
        }
        scheduleNextScramble();
      }, nextDelay);
    };

    scheduleNextScramble();
  }

  private stopIdleScrambler(): void {
    if (this.idleScramblerTimer) {
      clearTimeout(this.idleScramblerTimer);
      this.idleScramblerTimer = null;
    }
  }

  public destroy(): void {
    this.stopIdleScrambler();
    if (this.stateTimer) {
      clearTimeout(this.stateTimer);
    }
  }
}

export const stateMachine = new StateMachine();
export default stateMachine;
