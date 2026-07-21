# Data-Driven Runtime Animation & Character Plugin Architecture
## Full-Scale Game Engine & Companion SDK Specification

This document defines the final, industry-grade software engineering specification for a 60 FPS, modular, memory-efficient, fully data-driven animation and behavioral system designed for desktop companions. It outlines the complete decoupling of presentation technologies (Sprite Sequence, Live2D, or 3D WebGL) from behavioral, semantic, and AI systems through a unified **Character Package Plugin System** and **Abstract Character API**.

---

## 1. Ultimate Architectural Topology

```
                                  [ External Events / Backend ]
                                                │
                                                ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. SEMANTIC EVENT BUS                                                                     │
│    Broadcasts environment status, user chat events, clock ticks, and triggers.            │
└───────────────────────────────────────┬───────────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. BEHAVIOR PLANNER (Semantic Intention Resolver)                                         │
│    Translates high-level goals ("greet_warmly") into timed behavioral micro-sequences.     │
└───────────────────────────────────────┬───────────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. GENERIC CHARACTER CONTROLLER                                                           │
│    Manages the active logical state machine (Idle, Talking, Thinking, Sleep, etc.)        │
└───────────────────────────────────────┬───────────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. UNIFIED CHARACTER API (Abstract Interface Layer)                                       │
│    Standardizes state setters, asset loading, anchor lookup, and layer properties.         │
└───────────────────────────────────────┬───────────────────────────────────────────────────┘
                                        │
                ┌───────────────────────┼───────────────────────┐
                ▼                       ▼                       ▼
┌───────────────────────────────┐ ┌───────────────────────────┐ ┌──────────────────────────┐
│ 5A. SPRITE SEQUENCE RENDERER  │ │ 5B. LIVE2D RENDERER (SDK) │ │ 5C. 3D WEBGL RENDERER    │
│     (Dynamic Canvas Compositor│ │     (Cubism Web GL Engine)│ │     (Three.js/glTF Grid) │
│      of layers + blinks)      │ │                           │ │                          │
└───────────────────────────────┘ └───────────────────────────┘ └──────────────────────────┘
```

---

## 2. Character Package System (Plugin-Like Architecture)

To ensure characters are completely replaceable plugins, all parameters, assets, voices, and behaviors are self-contained. No character-specific parameters are hardcoded into the core application engine.

### Directory Structure of a Character Package
```
assets/
└── characters/
    └── Airi/
        ├── manifest.json              # Plugin identity, capability profile, metadata
        ├── girl.png                   # Static reference/fallback avatar
        ├── thumbnail.png              # UI card element image for settings menus
        ├── config.json                # Scale, anchors, eye/mouth coordinates
        ├── personality.json           # AI instruction prompts, system rules, responses
        ├── voice.json                 # Pitch, rate, language, and TTS parameters
        ├── behavior.json              # Custom behavioral tree weights & schedule graphs
        ├── animations/
        │   ├── idle_default/
        │   │   ├── metadata.json      # Interruption priority, loop rules, FPS
        │   │   ├── 0001.webp          # Optimized compressed transparent frames
        │   │   └── 0002.webp
        │   └── wave_friendly/
        │       ├── metadata.json
        │       ├── 0001.webp
        │       └── 0002.webp
        ├── expressions/
        │   ├── happy.png              # Blit mask overlay for the face coordinate
        │   ├── blush.png
        │   └── surprised.png
        └── audio/
            └── custom_sound.mp3       # Sound effects attached to state transitions
```

---

## 3. The Character Manifest (`manifest.json`)

The manifest allows the engine to discover, inspect, and register character plugins dynamically at boot time without re-compilation.

```json
{
  "$schema": "https://raw.githubusercontent.com/companion-sdk/schemas/main/manifest.schema.json",
  "id": "com.companion.airi",
  "name": "Airi",
  "version": "1.4.2",
  "author": "Google Creative Labs",
  "description": "A warm, pink-haired companion with highly expressive multi-layered animations and empathetic interaction algorithms.",
  "minimumEngineVersion": "3.0.0",
  "supportedLanguages": ["en-US", "ja-JP", "ko-KR"],
  "display": {
    "defaultTheme": "cosmic-dark",
    "defaultBackground": "magical-forest",
    "scale": 1.0,
    "positionOffset": { "x": 0, "y": -20 }
  },
  "capabilities": {
    "renderingType": "sprite_sequence",
    "multiLayerExpressions": true,
    "mouthLipSync": true,
    "mouseTracking": true
  },
  "supportedAnimations": [
    "idle_default",
    "idle_breathing",
    "idle_look_around",
    "listening",
    "thinking",
    "talking_normal",
    "talking_happy",
    "talking_excited",
    "greeting",
    "goodbye",
    "wave",
    "happy",
    "laugh",
    "shy",
    "embarrassed",
    "surprised",
    "confused",
    "sad",
    "sleeping",
    "stretch",
    "notification",
    "waiting"
  ],
  "supportedExpressions": [
    "neutral",
    "happy",
    "sad",
    "angry",
    "embarrassed",
    "sleepy",
    "surprised",
    "thinking",
    "laughing",
    "confused"
  ]
}
```

---

## 4. The Unified Character API

To ensure complete decoupling, the Character Controller communicates exclusively with an abstract software interface. This permits swapping renderers seamlessly.

```typescript
export interface ICharacterInstance {
  // Discovery & Configuration
  getManifest(): CharacterManifest;
  getPhysicalConfig(): CharacterConfig;
  getPersonality(): CharacterPersonality;
  
  // State Machine Commands
  triggerAnimation(animationId: string, options?: PlaybackOptions): Promise<void>;
  setExpression(expressionId: string, durationMs?: number): void;
  setLipSyncVolume(volume: number): void;
  setLookAtTarget(x: number, y: number): void;
  
  // Lifecycle
  update(deltaTime: number): void;
  destroy(): void;
}
```

Every character renderer type implements this interface:
* `class SpriteSequenceCharacter implements ICharacterInstance`
* `class Live2DCharacter implements ICharacterInstance`
* `class ThreeDWebGLCharacter implements ICharacterInstance`

---

## 5. Expression Library & Multi-Layer Composition

Expressions are stored independently of skeletal or bodily animations to prevent asset bloat. The rendering layer dynamically composites facial expressions on top of the moving frame sequence.

### Blit Matrix Compositing Formula
For every animation cycle update, the renderer composites the active frames on a back-buffer canvas:

$$\mathbf{CanvasFrame} = \mathbf{BodySprite}(\text{FrameIndex}) \oplus \mathbf{Transform}(\mathbf{ExpressionSprite}(\text{ExprID}))$$

```typescript
export class MultiLayerCompositor {
  private canvasContext: CanvasRenderingContext2D;
  private activeBodyFrame: HTMLImageElement;
  private activeExpressionFace: HTMLImageElement;
  private eyeBlinkFrame: HTMLImageElement;
  private mouthLevel: number = 0; // 0 to 1 scaling factor

  public composite(anchors: CharacterAnchors, lookAtOffset: { x: number; y: number }) {
    // 1. Draw base body structure
    this.canvasContext.drawImage(this.activeBodyFrame, 0, 0);

    // 2. Compute dynamic face offset (incorporating head turn + mouse tracking tilt)
    const headX = anchors.head.x + lookAtOffset.x;
    const headY = anchors.head.y + lookAtOffset.y;

    // 3. Blit facial expression layers
    if (this.activeExpressionFace) {
      this.canvasContext.drawImage(
        this.activeExpressionFace, 
        headX + anchors.emotionOffset.x, 
        headY + anchors.emotionOffset.y
      );
    }

    // 4. Draw procedural eyelid layers if blinking
    if (this.isBlinking) {
      this.canvasContext.drawImage(this.eyeBlinkFrame, anchors.eyes.x, anchors.eyes.y);
    }

    // 5. Draw dynamically scaled procedural lips based on mic/audio levels
    if (this.mouthLevel > 0) {
      const mouthHeight = anchors.mouth.height * this.mouthLevel;
      this.canvasContext.ellipse(
        anchors.mouth.x, 
        anchors.mouth.y, 
        anchors.mouth.width, 
        mouthHeight, 
        0, 0, 2 * Math.PI
      );
      this.canvasContext.fill();
    }
  }
}
```

---

## 6. Behavior Planner: Intention-Driven Sequencing

The Behavior Planner acts as the brain, separating high-level cognitive choices (e.g., "The assistant decided to congratulate the user") from state machine calls.

### Intent Resolution Flow
```
[ User Input: "I passed my exam!" ]
       │
       ▼
[ AI Cognitive Engine ]
  "Determine intent: congratulate_user"
       │
       ▼
[ Behavior Planner ]
  Looks up plan for "congratulate_user":
  ┌──────────────────────────────────────────────────────────────┐
  │ Step 1: TRIGGER Animation "Celebrate" (Wait: false)         │
  │ Step 2: LOAD Expression "Happy"                              │
  │ Step 3: DELAY 500ms                                          │
  │ Step 4: EMIT confetti particles at coordinate "origin"       │
  │ Step 5: TTS Speech started: "Congratulations! That's amazing!"│
  └──────────────────────────────────────────────────────────────┘
```

```typescript
export interface BehaviorAction {
  actionType: 'animation' | 'expression' | 'speech' | 'effect' | 'wait';
  params: {
    targetId?: string;
    text?: string;
    durationMs?: number;
    particleType?: string;
  };
}

export const BEHAVIOR_REGISTRY: Record<string, BehaviorAction[]> = {
  "user_greeted": [
    { actionType: 'animation', params: { targetId: 'wave', durationMs: 1500 } },
    { actionType: 'expression', params: { targetId: 'happy' } },
    { actionType: 'speech', params: { text: "Hello! It is so wonderful to see you again!" } }
  ],
  "thinking": [
    { actionType: 'animation', params: { targetId: 'thinking', durationMs: 2000 } },
    { actionType: 'expression', params: { targetId: 'thinking' } }
  ],
  "error_occurred": [
    { actionType: 'animation', params: { targetId: 'confused', durationMs: 1200 } },
    { actionType: 'expression', params: { targetId: 'confused' } },
    { actionType: 'speech', params: { text: "Hmm, I ran into a bit of a problem. Let's try again." } }
  ]
};
```

---

## 7. Dynamic Plugin Loader

At application startup, the companion engine issues a discovery scanning sequence. It scans the assets folder, reads the `manifest.json` files, and constructs a memory-mapped registry of characters.

```typescript
export class CharacterPluginRegistry {
  private installedCharacters: Map<string, CharacterManifest> = new Map();
  private activeCharacterId: string | null = null;

  public async bootstrapRegistry(): Promise<void> {
    try {
      // Fetch dynamic catalog or scan characters directory path
      const response = await fetch('/api/characters/discover');
      const manifestList: CharacterManifest[] = await response.json();
      
      manifestList.forEach(manifest => {
        this.installedCharacters.set(manifest.id, manifest);
      });
      
      // Auto-set default active character
      if (manifestList.length > 0) {
        this.activeCharacterId = manifestList[0].id;
      }
    } catch (e) {
      console.error("Plugin Loader: Failed to dynamically discover character packages.", e);
    }
  }

  public getAvailableCharacters(): CharacterManifest[] {
    return Array.from(this.installedCharacters.values());
  }

  public getActiveCharacterManifest(): CharacterManifest | null {
    if (!this.activeCharacterId) return null;
    return this.installedCharacters.get(this.activeCharacterId) || null;
  }
}
```

---

## 8. Live2D Future-Proofing Strategy

Live2D utilizes skeletal parameter manipulation instead of pre-rendered frames. By strictly separating our layers, transitioning to Live2D requires zero changes to the underlying logic files:

1. **Parameters Mapping**:
   * Instead of changing `FrameIndex`, the `Live2DCharacter` renderer translates the core states (such as `Talking`) into parametric float values passed to the Cubism SDK:
     * `ParamMouthOpenY` ranges from `0.0` to `1.0` (matching `mouthLevel`).
     * `ParamEyeBallX` & `ParamEyeBallY` are bound directly to `setLookAtTarget(x, y)`.
     * `ParamAngleX` & `ParamAngleY` are driven by head look-at tracking.
2. **Seamless Swap**:
   * The developer can swap `<SpriteSequenceRenderer />` with `<Live2DRenderer />` inside `Scene.tsx`. Because both renderers read the exact same events from the Event Bus and adhere to the **ICharacterInstance** interface, the transition is achieved with absolutely zero impact on back-end, conversational AI, or state machine loops.
