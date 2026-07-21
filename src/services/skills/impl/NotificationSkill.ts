import { ISkill } from '../ISkill';
import { SkillContext, SkillResult } from '../types';

export class NotificationSkill implements ISkill {
  public id = 'notification_skill';
  public name = 'System Notifications';
  public description = 'Enables triggering rich desktop push alerts, system sounds, or warning popups.';
  public capabilities = ['push_notification', 'play_chime', 'toast_alert'];
  public parameterSchema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      body: { type: 'string' },
      urgency: { type: 'string', enum: ['low', 'normal', 'high'] }
    },
    required: ['body']
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

    const { title, body, urgency } = context.parameters;
    const notificationTitle = title || 'Companion Notification';
    const notificationUrgency = urgency || 'normal';

    return {
      success: true,
      output: {
        title: notificationTitle,
        body,
        urgency: notificationUrgency,
        status: `Triggered simulated push alert notification: "${body}"`
      },
      metadata: {
        soundPlayed: 'chime.mp3',
        deliveryPlatform: 'WebNotificationAPIMock'
      }
    };
  }

  public async cancel(): Promise<void> {
    this.isCancelled = true;
  }
}
