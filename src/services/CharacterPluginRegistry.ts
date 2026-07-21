import { CharacterManifest, CharacterConfig, PersonalityConfig, VoiceConfig, BehaviorAction } from '../types';
import { eventBus } from './EventBus';

/**
 * Service responsible for discovering, registering, and dynamically loading
 * self-contained Character Packages from the backend server.
 */
class CharacterPluginRegistry {
  private installedCharacters: Map<string, CharacterManifest> = new Map();
  private activeCharacterId: string | null = null;
  private activeManifest: CharacterManifest | null = null;
  private activeConfig: CharacterConfig | null = null;
  private activePersonality: PersonalityConfig | null = null;
  private activeVoice: VoiceConfig | null = null;
  private activeBehaviors: Record<string, BehaviorAction[]> = {};

  /**
   * Discovers all available character packages in the backend assets folder
   */
  public async bootstrapRegistry(): Promise<void> {
    try {
      const response = await fetch('/api/characters/discover');
      if (!response.ok) {
        throw new Error(`Discovery HTTP error: ${response.status}`);
      }
      const manifests: CharacterManifest[] = await response.json();
      
      this.installedCharacters.clear();
      manifests.forEach((m) => {
        this.installedCharacters.set(m.id, m);
      });

      console.log(`[PluginRegistry] Discovered ${manifests.length} character packages:`, Array.from(this.installedCharacters.keys()));
    } catch (err) {
      console.error('[PluginRegistry] Failed to dynamically bootstrap character registry, falling back to static schema:', err);
      // Construct a robust default manifest for Airi in case the discovery API is not fully running yet or fails
      const fallbackAiri: CharacterManifest = {
        id: 'com.companion.airi',
        name: 'Airi',
        version: '1.0.0',
        author: 'Google Creative Labs',
        description: 'Fallback airi companion',
        minimumEngineVersion: '3.0.0',
        supportedLanguages: ['en-US'],
        display: {
          defaultTheme: 'cosmic-dark',
          defaultBackground: 'magical-forest',
          scale: 1.0,
          positionOffset: { x: 0, y: 0 }
        },
        capabilities: {
          renderingType: 'sprite_sequence',
          multiLayerExpressions: true,
          mouthLipSync: true,
          mouseTracking: true
        },
        supportedAnimations: ['idle_default', 'idle_breathing', 'talking_normal', 'wave', 'thinking'],
        supportedExpressions: ['neutral', 'happy', 'sad', 'thinking', 'confused'],
        basePath: '/assets/characters/airi'
      };
      this.installedCharacters.set(fallbackAiri.id, fallbackAiri);
    }
  }

  /**
   * Returns all discovered manifests
   */
  public getAvailableCharacters(): CharacterManifest[] {
    return Array.from(this.installedCharacters.values());
  }

  /**
   * Sets the active character and loads its full package configurations (config, personality, voice, behavior)
   */
  public async selectCharacter(characterId: string): Promise<boolean> {
    const manifest = this.installedCharacters.get(characterId);
    if (!manifest) {
      console.error(`[PluginRegistry] Character package ${characterId} not found in registry.`);
      return false;
    }

    const basePath = manifest.basePath || `/assets/characters/${manifest.name.toLowerCase()}`;
    console.log(`[PluginRegistry] Loading character package [${manifest.name}] from: ${basePath}`);

    try {
      // Fetch files in parallel to optimize boot speed and network performance
      // Including manifest.json, config.json, personality.json, and voice.json
      const [manifestRes, configRes, personalityRes, voiceRes, behaviorRes] = await Promise.allSettled([
        fetch(`${basePath}/manifest.json`).then(r => r.ok ? r.json() : null),
        fetch(`${basePath}/config.json`).then(r => r.ok ? r.json() : null),
        fetch(`${basePath}/personality.json`).then(r => r.ok ? r.json() : null),
        fetch(`${basePath}/voice.json`).then(r => r.ok ? r.json() : null),
        fetch(`${basePath}/behavior.json`).then(r => r.ok ? r.json() : null)
      ]);

      // Resolve manifest and preserve basePath
      const loadedManifest = manifestRes.status === 'fulfilled' && manifestRes.value ? manifestRes.value : manifest;
      this.activeManifest = {
        ...manifest,
        ...loadedManifest,
        basePath
      };

      // Automatically detect all animations (support mp4 and webm)
      const detected = (this.activeManifest.detectedAnimations || []).map(f => f.toLowerCase());

      // Resolve configs, with fallbacks if files are missing or malformed
      const loadedConfig = configRes.status === 'fulfilled' && configRes.value ? configRes.value : {};
      const fallbackConfig = this.getFallbackConfig(this.activeManifest);

      const configAnimations = loadedConfig.animations || {};
      const dynamicAnimations: Record<string, string> = {};

      // Determine the default/configured idle animation path as baseline fallback
      let configIdlePath = configAnimations['idle'] || 'animations/idle.webm';
      let resolvedIdleUrl = configIdlePath.startsWith('/') || configIdlePath.startsWith('http')
        ? configIdlePath
        : `${basePath}/${configIdlePath}`;

      const idleFilename = configIdlePath.split('/').pop()?.toLowerCase() || '';
      const isIdleDetected = detected.includes(idleFilename);
      if (!isIdleDetected && detected.length > 0) {
        // Find any detected animation containing 'idle' or use first available detected animation
        const foundIdleFile = detected.find(f => f.includes('idle')) || detected[0];
        configIdlePath = `animations/${foundIdleFile}`;
        resolvedIdleUrl = `${basePath}/${configIdlePath}`;
      }

      // Build animation registry dynamically from config.json animations keys
      // Supporting fallbacks to idle if an animation is missing or fails verification
      const allAnimKeys = new Set([
        ...Object.keys(fallbackConfig.animations),
        ...Object.keys(configAnimations)
      ]);

      for (const key of Array.from(allAnimKeys)) {
        const animPath = configAnimations[key] || fallbackConfig.animations[key];
        if (!animPath) continue;

        const filename = animPath.split('/').pop()?.toLowerCase() || '';
        const exists = detected.includes(filename) || (await checkIfFileExists(animPath.startsWith('/') || animPath.startsWith('http') ? animPath : `${basePath}/${animPath}`));

        if (exists) {
          dynamicAnimations[key] = animPath.startsWith('/') || animPath.startsWith('http')
            ? animPath
            : `${basePath}/${animPath}`;
        } else {
          console.warn(`[PluginRegistry] Animation '${key}' is missing (${animPath}). Falling back to 'idle'.`);
          dynamicAnimations[key] = resolvedIdleUrl;
        }
      }

      // If avatar.png is missing or null, use first frame of the idle animation as character thumbnail
      let avatarUrl = loadedConfig.avatar || fallbackConfig.avatar;
      let hasAvatar = false;
      if (avatarUrl) {
        const resolvedAvatarUrl = avatarUrl.startsWith('/') || avatarUrl.startsWith('http') ? avatarUrl : `${basePath}/${avatarUrl}`;
        hasAvatar = await checkIfFileExists(resolvedAvatarUrl);
        if (hasAvatar) {
          avatarUrl = resolvedAvatarUrl;
        }
      }

      if (!hasAvatar) {
        console.log(`[PluginRegistry] avatar.png is missing or null. Extracting first frame of idle animation as thumbnail: ${resolvedIdleUrl}`);
        try {
          avatarUrl = await extractFirstFrame(resolvedIdleUrl);
        } catch (e) {
          console.error('[PluginRegistry] Failed to extract first frame:', e);
          avatarUrl = resolvedIdleUrl;
        }
      }

      this.activeConfig = {
        ...fallbackConfig,
        ...loadedConfig,
        avatar: avatarUrl,
        position: {
          ...fallbackConfig.position,
          ...(loadedConfig.position || {})
        },
        anchorPoints: {
          ...fallbackConfig.anchorPoints,
          ...(loadedConfig.anchorPoints || {})
        },
        animations: dynamicAnimations
      };

      this.activePersonality = personalityRes.status === 'fulfilled' && personalityRes.value ? personalityRes.value : this.getFallbackPersonality();
      this.activeVoice = voiceRes.status === 'fulfilled' && voiceRes.value ? voiceRes.value : this.getFallbackVoice();
      this.activeBehaviors = behaviorRes.status === 'fulfilled' && behaviorRes.value ? behaviorRes.value : this.getFallbackBehaviors();

      this.activeCharacterId = characterId;
      localStorage.setItem('airi_selected_character_id', characterId);

      console.log(`[PluginRegistry] Fully loaded package for ${this.activeManifest.name}!`);

      // Notify the system of the loaded character
      eventBus.publish('character:change', this.activeManifest);

      return true;
    } catch (err) {
      console.error(`[PluginRegistry] Exception while loading character package ${characterId}:`, err);
      return false;
    }
  }

  public getActiveCharacterId(): string | null {
    return this.activeCharacterId;
  }

  public getActiveManifest(): CharacterManifest | null {
    return this.activeManifest;
  }

  public getActiveConfig(): CharacterConfig | null {
    return this.activeConfig;
  }

  public getActivePersonality(): PersonalityConfig | null {
    return this.activePersonality;
  }

  public getActiveVoice(): VoiceConfig | null {
    return this.activeVoice;
  }

  public getActiveBehaviors(): Record<string, BehaviorAction[]> {
    return this.activeBehaviors;
  }

  /**
   * Fallback construction engines in case the character packages are missing files (Failsafe requirements)
   */
  private getFallbackConfig(manifest: CharacterManifest): CharacterConfig {
    return {
      name: manifest.name,
      version: manifest.version,
      avatar: `${manifest.basePath}/girl.png`,
      animationFps: 24,
      defaultIdle: 'idle_default',
      transitionSpeedMs: 200,
      scale: manifest.display.scale,
      position: { x: 0, y: 0 },
      anchorPoints: {
        origin: { x: 0.5, y: 1.0 },
        head: { x: 0.5, y: 0.25 },
        eyes: { x: 0.5, y: 0.21 },
        mouth: { x: 0.5, y: 0.27, width: 24, height: 10 },
        emotionOffset: { x: 0, y: 0 }
      },
      animations: {
        'idle_default': 'idle_default'
      }
    };
  }

  private getFallbackPersonality(): PersonalityConfig {
    return {
      backstory: "A friendly desktop companion.",
      greetings: ["Hello there! How can I help you today?"],
      defaultState: "idle_default",
      speechStyle: "friendly and cheerful"
    };
  }

  private getFallbackVoice(): VoiceConfig {
    return {
      voiceId: "en-US-Neural2-F",
      languageCode: "en-US",
      pitch: 1.0,
      speakingRate: 1.0
    };
  }

  private getFallbackBehaviors(): Record<string, BehaviorAction[]> {
    // Default system intentions resolved if behavior.json is missing or corrupted
    return {
      "greet_user": [
        { actionType: 'expression', params: { targetId: 'happy' } },
        { actionType: 'animation', params: { targetId: 'wave', durationMs: 1500 } }
      ],
      "think": [
        { actionType: 'expression', params: { targetId: 'thinking' } },
        { actionType: 'animation', params: { targetId: 'thinking', durationMs: 2000 } }
      ],
      "answer_question": [
        { actionType: 'expression', params: { targetId: 'neutral' } },
        { actionType: 'animation', params: { targetId: 'talking_normal' } }
      ]
    };
  }
}

/**
 * Helper to check if a file exists on the server
 */
async function checkIfFileExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    try {
      const res = await fetch(url);
      return res.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Helper to extract the first frame of a video URL and return it as a data URL
 */
function extractFirstFrame(videoUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    // Explicitly call load() to ensure loading starts
    video.load();
    
    const timeout = setTimeout(() => {
      resolve(videoUrl); // fallback to video URL if it takes too long
    }, 4000);

    video.onloadeddata = () => {
      // Seek slightly past 0 to ensure the first frame is decodable
      video.currentTime = 0.05;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 300;
        canvas.height = video.videoHeight || 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } else {
          resolve(videoUrl);
        }
      } catch (err) {
        console.warn('[PluginRegistry] Error rendering first frame on canvas:', err);
        resolve(videoUrl);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      resolve(videoUrl);
    };
  });
}

export const characterPluginRegistry = new CharacterPluginRegistry();
