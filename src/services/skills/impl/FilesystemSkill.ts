import { ISkill } from '../ISkill';
import { SkillContext, SkillResult } from '../types';

export class FilesystemSkill implements ISkill {
  public id = 'filesystem_skill';
  public name = 'File System Access';
  public description = 'Enables reading files, saving data structures to disk, or directory listing.';
  public capabilities = ['read_file', 'write_file', 'list_dir'];
  public parameterSchema = {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['read', 'write', 'list'] },
      path: { type: 'string' },
      content: { type: 'string' }
    },
    required: ['action', 'path']
  };

  private isCancelled = false;

  public canExecute(context: SkillContext): boolean {
    const required = this.parameterSchema.required || [];
    return required.every((field: string) => context.parameters && context.parameters[field] !== undefined);
  }

  public async execute(context: SkillContext): Promise<SkillResult> {
    this.isCancelled = false;
    await new Promise(resolve => setTimeout(resolve, 400));

    if (this.isCancelled) {
      return { success: false, output: null, error: 'Execution cancelled' };
    }

    const { action, path, content } = context.parameters;

    return {
      success: true,
      output: {
        action,
        path,
        status: action === 'write' 
          ? `File saved successfully to path "${path}".` 
          : action === 'read' 
          ? `File content read from "${path}": "Simulated content of ${path}"`
          : `Directory listing completed for "${path}". Available items: [document.md, database.db]`
      },
      metadata: {
        currentDirectory: './workspace',
        freeSpaceBytes: 1024 * 1024 * 1024
      }
    };
  }

  public async cancel(): Promise<void> {
    this.isCancelled = true;
  }
}
