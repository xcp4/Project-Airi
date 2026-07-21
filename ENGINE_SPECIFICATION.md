# Core Engine Specification
## Dynamic Desktop Companion Runtime Engine & Behavioral Orchestrator

This specification defines the runtime execution lifecycle, event schema, behavior resolver, error mitigation rules, and state machine transitions for the Desktop Companion Animation Engine.

---

## 1. Complete Runtime Event Flow

The runtime process executes along a non-blocking, asynchronous pipelines dividing inputs (Sensory/Cognitive) from outputs (Visual/Acoustic Renderers).

```
[User Input: Speech/Text] ──► (1) Input Adapter
                                  │
                                  ▼
                            (2) Conversational AI (Gemini/TTS)
                                  │
                                  ▼  [Semantic Intent Event]
                            (3) Behavior Planner
                                  │
                                  ▼  [Scheduled Actions Sequence]
                            (4) Character Controller
                                  │
                                  ▼  [Raw State Transitions]
                            (5) State Machine & Blend Tree
                                  │
                                  ▼  [Composited Layers Coordinates]
                            (6) Animation Manager & Compositor
                                  │
                                  ▼  [60 FPS Frame Coordinates]
                            (7) Animation Renderer (Canvas / Live2D GL)
                                  │
                                  ▼
                             [Viewport Renders]
```

### Detailed Execution Sequence:
1. **Input Stage**: The microphone picks up speech, converting it to text. A concurrent event `user_started_speaking` is fired.
2. **Cognitive Stage**: The message is sent to the backend. The backend dispatches `ai_thinking_started` to the client.
3. **Behavior Planning**: The AI responds with text, designated sentiment coefficients, and a semantic intent tag (e.g., `congratulate_user`).
4. **Coordination State**: The Behavior Planner intercepts the intent, loading the corresponding behavioral micro-sequence from `behavior.json`. It coordinates parallel execution of face layers, sound effects, body postures, and speech audio playback.
5. **Animation Compilation**: The Compositor fetches active frames from the cache, blits facial expression layers on top of body layers using target anchor points, applies procedural eye blinks and lip-sync indices, and submits the rasterized composite to the canvas context at a locked 60 FPS rate.

---

## 2. Dynamic Intent System & Behavior Mapping

The AI does not command specific physical animations. Instead, the AI expresses a cognitive sentiment or semantic *intent*. The engine translates this intent into layered presentation instructions using character config tables.

### Behavior Mapping Reference Matrix

| Semantic Intent | Behavior Sequence Nodes | Emotion Face Layer | Animation Body State | Lip-Sync Override | Voice Modulation (Rate/Pitch) | Renderer Target Output |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **greet_user** | 1. Trigger wave gesture<br>2. Play sound file<br>3. Speak greeting | Happy | `Wave` (Priority 3) | Bound to Speech | Pitch: +10%<br>Rate: Normal | Composite body + happy eyes + hand waving frames |
| **think** | 1. Eyes up-right<br>2. Finger on chin<br>3. Occasional sigh particles | Thinking | `Thinking` (Priority 1) | Deactivated | Muted | Composite body + looking up face layers |
| **answer_question**| 1. Return to face viewer<br>2. Sync mouth to TTS | Neutral | `Talking_Normal` (Priority 2)| Active (Audio RMS) | Pitch: Default<br>Rate: Normal | Base talk frames + lip-sync mouth overlays |
| **congratulate** | 1. Jump up joyfully<br>2. Throw confetti<br>3. Laughing face | Laughing | `Celebrate` (Priority 4) | Bound to Speech | Pitch: +20%<br>Rate: Fast | High-speed jumping loops + flower particles |
| **apologize** | 1. Drop shoulders<br>2. Look down-left<br>3. Soft voice | Sad | `Sad` (Priority 2) | Bound to Speech | Pitch: -10%<br>Rate: Slow | Slumped posture frames + tear sprite blits |
| **notify_user** | 1. Alert ring sound<br>2. Hold notification bubble | Surprised | `Notification` (Priority 3) | Muted | Muted | Glowing mail envelope icon rendered on head anchor |
| **ask_question** | 1. Head tilt left<br>2. Question mark particle | Confused | `Confused` (Priority 2) | Bound to Speech | Pitch: +5%<br>Rate: Normal | Question marks hovering near Head Anchor |

---

## 3. Cognitive Memory & Personality Integration

The character is not a stateless visualizer. The behavior system is deeply bound to a persistent **Context memory engine**:

```
 ┌──────────────────────┐      ┌──────────────────────┐
 │ Conversation Memory  │      │   Long-Term Memory   │
 │ (Last 10 Utterances) │      │ (User preferences)   │
 └──────────┬───────────┘      └──────────┬───────────┘
            │                             │
            └──────────────┬──────────────┘
                           ▼
             ┌───────────────────────────┐
             │ AI Personality Engine     │
             │ (system instructions prompt)│
             └─────────────┬─────────────┘
                           ▼
             ┌───────────────────────────┐
             │ Emotional Memory Model    │
             │ (decaying mood variables) │
             └─────────────┬─────────────┘
                           ▼
             ┌───────────────────────────┐
             │ Behavior Planner          │
             │ (Intents -> Gestures)     │
             └───────────────────────────┘
```

* **Emotional Memory Model**: Stores dynamic, decaying values representing basic moods: `Happiness (0-1.0)`, `Energy (0-1.0)`, `Affection (0-1.0)`, and `Fatigue (0-1.0)`.
* **Behavior Modification**: If `Fatigue > 0.8`, the Behavior Planner automatically routes generic idle states to `Sleeping` or `Yawning` and slows talking animations.
* **Long-Term Memory integration**: When referencing a user's birthday, the AI sets the sentiment to `congratulate`, instantly triggering celebration states without hardcoding rules inside the chat handlers.

---

## 4. Runtime State Machine & Transition Diagram

The state machine dictates physical posture adjustments, handling high-priority interrupts seamlessly.

```
                  ┌──────────────────────────────────────────────┐
                  │              Initialization                  │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                               ┌───────────────────┐
                    ┌─────────►│   Idle_Default    │◄──────────┐
                    │          └─────────┬─────────┘           │
                    │                    │                     │
                    │ (Idle Scrambler    │ (Incoming           │ (Interaction
                    │  Intervals)        │  User Speech)       │  Complete)
                    │                    ▼                     │
           ┌────────┴─────────┐   ┌────────┴──────────┐   ┌────┴──────────────┐
           │ Idle Variations  │   │     Listening     │   │     Talking       │
           │ (Breathing, Sway)│   │ (Sympathetic Tilts)│   │ (Active Lip-Sync) │
           └──────────────────┘   └────────┬──────────┘   └────▲──────────────┘
                                           │                   │
                                           │ (Speech Recov.)   │ (Intent Resolved)
                                           ▼                   │
                                  ┌────────┴──────────┐        │
                                  │     Thinking      ├────────┘
                                  │ (Upward eye-look) │
                                  └───────────────────┘
```

### Interruption Processing Lifecycle:
1. **Preemption**: While playing a low-priority animation (e.g., stretching), if the user triggers a higher-priority event (e.g., shouting a warning), the active sequence is immediately halted.
2. **Transition Blend Out**: The current frame index fades or blends towards the neutral pose of the incoming high-priority state over `150ms`.
3. **Recovery Loop**: When the high-priority animation finishes, the machine transitions to `ReturningToIdle`, gracefully centering coordinates before resuming standard idle cycles.

---

## 5. Architectural Robustness & Fail-Safe Rules

The desktop companion must remain functional even under extreme missing data conditions or runtime component crashes.

```
                    CRITICAL EXCEPTION PATHS & COMPENSATIONS

  [Missing Animation WebP] ──────────► Blit static 'girl.png' reference frame.
  
  [Missing Expression PNG] ──────────► Skip Layer blit, render neutral frame face.
  
  [Speech/Voice Service Fail] ───────► Disable mouth lip-sync, output standard logs, 
                                      and display responses in speech bubble only.
                                      
  [Backend Service Disconnect] ──────► Transition companion state to "Confused" (puzzled look),
                                      display "System offline" in bubble.
                                      
  [WebGL/Live2D Render Crash] ───────► Automatically hot-swap Canvas view into basic 2D
                                      fallback canvas, reloading assets seamlessly.
```

### Safety Implementations:
* **Package Validation Check**: At startup, `manifest.json` is audited. If critical entries like `girl.png` are missing, the package loading is aborted, and a fallback default companion character is selected.
* **Silent Errors**: No alert dialogue boxes are shown inside the companion frame (per anti-frame constraints). Any failures are logged silently to the debug terminal while the frontend transitions cleanly.
* **Canvas Boundary Clamping**: Head offsets and mouse tracking matrices are heavily clamped. If mouse values return extreme or corrupted numbers, coordinates are fallback-clamped to standard range values to prevent character twisting or displacement.
