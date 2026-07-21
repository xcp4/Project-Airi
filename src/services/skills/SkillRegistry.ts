import { ISkill } from './ISkill';
import { MemorySkill } from './impl/MemorySkill';
import { SearchSkill } from './impl/SearchSkill';
import { BrowserSkill } from './impl/BrowserSkill';
import { VisionSkill } from './impl/VisionSkill';
import { CalculatorSkill } from './impl/CalculatorSkill';
import { ClipboardSkill } from './impl/ClipboardSkill';
import { DesktopSkill } from './impl/DesktopSkill';
import { CalendarSkill } from './impl/CalendarSkill';
import { FilesystemSkill } from './impl/FilesystemSkill';
import { NotificationSkill } from './impl/NotificationSkill';

export class SkillRegistry {
  private static instance: SkillRegistry;
  private skills: Map<string, ISkill> = new Map();

  private constructor() {
    this.discoverAndRegisterSkills();
  }

  public static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  private discoverAndRegisterSkills(): void {
    // Automatically register all discovered/imported placeholder skills
    this.register(new MemorySkill());
    this.register(new SearchSkill());
    this.register(new BrowserSkill());
    this.register(new VisionSkill());
    this.register(new CalculatorSkill());
    this.register(new ClipboardSkill());
    this.register(new DesktopSkill());
    this.register(new CalendarSkill());
    this.register(new FilesystemSkill());
    this.register(new NotificationSkill());
  }

  public register(skill: ISkill): void {
    console.log(`[SkillRegistry] Automatically registered: ${skill.name} (${skill.id})`);
    this.skills.set(skill.id, skill);
  }

  public getSkill(idOrName: string): ISkill | undefined {
    if (!idOrName) return undefined;
    const key = idOrName.toLowerCase();
    
    // 1. Direct ID lookup
    const directMatch = this.skills.get(idOrName);
    if (directMatch) return directMatch;

    // 2. Case-insensitive lookup by ID or class name
    for (const [id, skill] of this.skills.entries()) {
      if (id.toLowerCase() === key || skill.constructor.name.toLowerCase() === key) {
        return skill;
      }
    }
    return undefined;
  }

  public getAllSkills(): ISkill[] {
    return Array.from(this.skills.values());
  }

  public clear(): void {
    this.skills.clear();
  }
}

export const skillRegistry = SkillRegistry.getInstance();
export default skillRegistry;
