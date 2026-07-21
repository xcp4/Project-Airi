export enum AiriState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  TALKING = 'TALKING',
  GREETING = 'GREETING',
  WAVE = 'WAVE',
  HAPPY = 'HAPPY',
  LAUGH = 'LAUGH',
  CONFUSED = 'CONFUSED',
  SURPRISED = 'SURPRISED',
  SAD = 'SAD',
  SLEEPING = 'SLEEPING',
  STRETCH = 'STRETCH',
  NOTIFICATION = 'NOTIFICATION',
  WAITING = 'WAITING',
  RETURNING_TO_IDLE = 'RETURNING_TO_IDLE'
}

export interface CharacterManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  minimumEngineVersion: string;
  supportedLanguages: string[];
  display: {
    defaultTheme: string;
    defaultBackground: string;
    scale: number;
    positionOffset: { x: number; y: number };
  };
  capabilities: {
    renderingType: 'sprite_sequence' | 'live2d' | '3d';
    multiLayerExpressions: boolean;
    mouthLipSync: boolean;
    mouseTracking: boolean;
  };
  supportedAnimations: string[];
  supportedExpressions: string[];
  basePath?: string; // Appended by dynamic discovery API
  folderName?: string; // Subfolder name
  detectedAnimations?: string[]; // Auto-detected video files
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface CharacterAnchors {
  origin: Vector2D;
  head: Vector2D;
  eyes: Vector2D;
  mouth: { x: number; y: number; width: number; height: number };
  emotionOffset: Vector2D;
}

export interface CharacterConfig {
  name: string;
  version: string;
  avatar: string;
  animationFps: number;
  defaultIdle: string;
  transitionSpeedMs: number;
  scale: number;
  position: Vector2D;
  anchorPoints: CharacterAnchors;
  animations: {
    [key: string]: string; // Maps states or custom IDs to relative folders or assets
  };
}

export interface VoiceConfig {
  voiceId: string;
  languageCode: string;
  pitch: number;
  speakingRate: number;
}

export interface PersonalityConfig {
  backstory: string;
  greetings: string[];
  defaultState: string;
  speechStyle: string;
}

export interface BehaviorAction {
  actionType: 'animation' | 'expression' | 'speech' | 'effect' | 'wait';
  params: {
    targetId?: string;
    text?: string;
    durationMs?: number;
    particleType?: string;
  };
}

export interface AppSettings {
  assistantName: string;
  userName: string;
  voiceVolume: number;
  voiceSpeed: number;
  windowOpacity: number;
  backgroundTheme: string;
  selectedCharacter: string;
  effectsEnabled: boolean;
  geminiModel: string;
  useVoiceOutput: boolean;
  selectedVoice?: string;
  voiceLanguage?: string;
  voicePitch?: number;
  voiceProvider?: 'google' | 'browser';
}

export interface AppEventMap {
  'state:change': { from: AiriState; to: AiriState };
  'chat:message': { sender: 'user' | 'airi'; text: string; actionState?: AiriState };
  'chat:bubble': { text: string; duration?: number };
  'input:focus': boolean;
  'cursor:move': { x: number; y: number };
  'audio:level': number;
  'settings:update': Partial<AppSettings>;
  'ui:open-settings': void;
  'ui:close-settings': void;
  'bg:change': string;
  
  // Custom Character Engine Events
  'character:change': CharacterManifest;
  'behavior:trigger': { intent: string };
  'animation:trigger': { animationId: string; loop: boolean };
  'expression:change': { expressionId: string };
  'lip-sync:update': number;
}

/**
 * Generic Character Renderer Interface
 * Standardizes behavior across Sprite Sequence, Live2D, and WebGL renderers,
 * ensuring complete decoupling from the presentation technology.
 */
export interface ICharacterRenderer {
  setExpression(expressionId: string): void;
  setAnimation(animationId: string, loop: boolean): void;
  setLipSyncVolume(volume: number): void;
  setLookAtTarget(x: number, y: number): void;
  update(deltaTime: number): void;
}

export interface ResponsePlan {
  short: boolean;
  detailed: boolean;
  askFollowUp: boolean;
  explainStepByStep: boolean;
  encourageUser: boolean;
  makeLightJoke: boolean;
  remainSerious: boolean;
  summarize: boolean;
  continueMomentum: boolean;
  takeInitiative: boolean;
  rationale: string;
}

export interface CompanionEmotionValues {
  happiness: number;
  energy: number;
  curiosity: number;
  confidence: number;
  affection: number;
  fatigue: number;
  playfulness: number;
  lust: number;
}

export interface BrainStrategy {
  userEmotion: string;
  companionEmotion: string;
  conversationalGoal: string;
  responsePlan: string;
  styleDirectives: string[];
  emotionValues?: CompanionEmotionValues;
}

export type EventCallback<T> = (data: T) => void;
