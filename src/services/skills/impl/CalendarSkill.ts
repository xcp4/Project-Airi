import { ISkill } from '../ISkill';
import { SkillContext, SkillResult } from '../types';

export class CalendarSkill implements ISkill {
  public id = 'calendar_skill';
  public name = 'Calendar Scheduler';
  public description = 'Enables scheduling meetings, reading calendar events, or organizing daily plans.';
  public capabilities = ['create_event', 'list_events', 'cancel_event'];
  public parameterSchema = {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['create', 'list', 'delete'] },
      title: { type: 'string' },
      startTime: { type: 'string' }
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
    await new Promise(resolve => setTimeout(resolve, 500));

    if (this.isCancelled) {
      return { success: false, output: null, error: 'Execution cancelled' };
    }

    const { action, title, startTime } = context.parameters;
    const eventTitle = title || 'Cozy sync with Airi';
    const eventTime = startTime || 'Tomorrow at 2:00 PM';

    return {
      success: true,
      output: {
        action,
        status: action === 'create' 
          ? `Created calendar event: "${eventTitle}" for ${eventTime}.` 
          : action === 'delete'
          ? `Deleted calendar event with title: "${eventTitle}".`
          : 'Successfully fetched current daily calendar agenda events.',
        events: action === 'list' ? [
          { title: 'Morning Standup', time: '10:00 - 10:30' },
          { title: 'Fireside Chat', time: '14:00 - 15:00' }
        ] : [{ title: eventTitle, time: eventTime }]
      },
      metadata: {
        calendarProvider: 'GoogleCalendarMock'
      }
    };
  }

  public async cancel(): Promise<void> {
    this.isCancelled = true;
  }
}
