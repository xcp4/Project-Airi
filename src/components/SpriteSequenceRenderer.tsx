import React, { useRef, useEffect, useState } from 'react';
import { AiriState, CharacterConfig, CharacterManifest } from '../types';
import { eventBus } from '../services/EventBus';
import { characterPluginRegistry } from '../services/CharacterPluginRegistry';
import { stateMachine, isLoopingState } from '../services/StateMachine';

interface SpriteSequenceRendererProps {
  onRenderReady?: () => void;
}

/**
 * High-Performance HTML5 Canvas-based Multi-Layer Compositor
 * Synthesizes base body frames, facial expression masks, dynamic blinks,
 * mic lip-sync scaling, and cursor look-at offsets at 60 FPS.
 */
export default function SpriteSequenceRenderer({ onRenderReady }: SpriteSequenceRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active configurations loaded dynamically from registry
  const [activeManifest, setActiveManifest] = useState<CharacterManifest | null>(null);
  const [activeConfig, setActiveConfig] = useState<CharacterConfig | null>(null);

  // Dynamic dimensions observed from parent container
  const [dimensions, setDimensions] = useState({ width: 450, height: 750 });

  // Compositor Layer States
  const [currentState, setCurrentState] = useState<AiriState>(AiriState.IDLE);
  const [activeExpression, setActiveExpression] = useState<string>('neutral');
  const [mouthVolume, setMouthVolume] = useState<number>(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Custom Video Animation States and Reference Pools
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [generatedLoops, setGeneratedLoops] = useState<Record<string, string>>({});
  const [animationOverrides, setAnimationOverrides] = useState<Record<string, string>>({});

  const videoElements = useRef<Record<string, HTMLVideoElement>>({});
  const currentVideoRef = useRef<HTMLVideoElement | null>(null);
  const previousVideoRef = useRef<HTMLVideoElement | null>(null);
  const fadeAlphaRef = useRef<number>(1.0);

  // Procedural Animation Reference States
  const breathingOffset = useRef<number>(0);
  const blinkTimer = useRef<number>(0);
  const isBlinking = useRef<boolean>(false);
  const lookAtOffset = useRef({ x: 0, y: 0 });
  const frameCount = useRef<number>(0);

  // Cached assets to prevent garbage collection hiccups at 60 FPS
  const assetCache = useRef<Record<string, HTMLImageElement>>({});

  // Setup ResizeObserver to listen for parent size changes and scale drawing buffer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    // 1. Initial configuration fetch
    const manifest = characterPluginRegistry.getActiveManifest();
    const config = characterPluginRegistry.getActiveConfig();
    setActiveManifest(manifest);
    setActiveConfig(config);

    if (onRenderReady) onRenderReady();

    // Load custom animation overrides for the active character
    const loadOverrides = (manifestId: string) => {
      const savedOverrides = localStorage.getItem(`airi_overrides_${manifestId}`);
      if (savedOverrides) {
        try {
          setAnimationOverrides(JSON.parse(savedOverrides));
        } catch (e) {
          setAnimationOverrides({});
        }
      } else {
        setAnimationOverrides({});
      }
    };

    if (manifest) {
      loadOverrides(manifest.id);
    }

    // Load custom video active overrides if any
    if ((window as any).AiriActiveCustomVideoUrl) {
      setCustomVideoUrl((window as any).AiriActiveCustomVideoUrl);
    }

    const saved = localStorage.getItem('airi_generated_animations');
    if (saved) {
      try {
        setGeneratedLoops(JSON.parse(saved));
      } catch (e) {}
    }

    // Storage update listener for sync across menus
    const handleStorageChange = () => {
      const savedLocal = localStorage.getItem('airi_generated_animations');
      if (savedLocal) {
        try {
          setGeneratedLoops(JSON.parse(savedLocal));
        } catch (e) {}
      }
      if (manifest) {
        loadOverrides(manifest.id);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Custom animation video event listener
    const handleCustomVideo = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCustomVideoUrl(detail?.videoUrl || null);
    };
    window.addEventListener('airi-custom-video-change', handleCustomVideo);

    // Custom animation replacement event listener
    const handleAnimationReplaced = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const targetManifestId = detail?.manifestId || characterPluginRegistry.getActiveManifest()?.id;
      if (targetManifestId) {
        loadOverrides(targetManifestId);
      }
    };
    window.addEventListener('airi-animation-replaced', handleAnimationReplaced);

    // 2. Event Bus subscriptions
    const unsubChar = eventBus.subscribe('character:change', (m) => {
      setActiveManifest(m);
      setActiveConfig(characterPluginRegistry.getActiveConfig());
      if (m) loadOverrides(m.id);
    });

    const unsubState = eventBus.subscribe('state:change', (data) => {
      setCurrentState(data.to);
    });

    const unsubExpr = eventBus.subscribe('expression:change', (data) => {
      setActiveExpression(data.expressionId);
    });

    const unsubLip = eventBus.subscribe('lip-sync:update', (level) => {
      setMouthVolume(level);
    });

    // 3. Mouse position coordinate trackers
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasCenterX = rect.left + rect.width / 2;
      const canvasCenterY = rect.top + rect.height / 2;

      // Calculate directional vector from character head to mouse cursor
      const dx = e.clientX - canvasCenterX;
      const dy = e.clientY - canvasCenterY;
      const distance = Math.hypot(dx, dy);

      if (distance > 0) {
        // Clamp gaze translation offset to a maximum of 10 pixels to maintain proportional eyes
        const maxOffset = 10;
        lookAtOffset.current = {
          x: (dx / distance) * Math.min(distance * 0.05, maxOffset),
          y: (dy / distance) * Math.min(distance * 0.05, maxOffset),
        };
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      unsubChar();
      unsubState();
      unsubExpr();
      unsubLip();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('airi-custom-video-change', handleCustomVideo);
      window.removeEventListener('airi-animation-replaced', handleAnimationReplaced);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [onRenderReady]);

  // Map Airi companion logical states into relevant video loops dynamically
  const getStateVideoSrc = (state: AiriState, overrides: Record<string, string>): string | null => {
    if (!activeManifest) return null;

    // Resolve general standard animation key based on current logical state
    let animKey = 'idle';
    if (state === AiriState.TALKING) {
      animKey = 'talk';
    } else if (state === AiriState.WAVE || state === AiriState.GREETING) {
      animKey = 'wave';
    } else if (state === AiriState.THINKING) {
      animKey = 'think';
    } else if (
      state === AiriState.HAPPY || 
      state === AiriState.LAUGH || 
      state === AiriState.SURPRISED || 
      state === AiriState.NOTIFICATION
    ) {
      animKey = 'happy';
    } else if (state === AiriState.SLEEPING) {
      animKey = 'sleepy';
    } else if (state === AiriState.LISTENING) {
      animKey = 'listening';
    }

    // 1. Check custom override first (manually replaced by the user)
    if (overrides[animKey]) {
      return overrides[animKey];
    }

    // 2. Prioritize actual detected animation files matching the requested animKey
    const detected = activeManifest.detectedAnimations || [];
    const basePath = activeManifest.basePath || `/assets/characters/${activeManifest.folderName || activeManifest.name.toLowerCase()}`;

    const findMatch = (key: string): string | null => {
      const matchedFile = detected.find(f => {
        const lower = f.toLowerCase();
        if (key === 'talk') {
          return lower.includes('talk') || lower.includes('speak') || lower.includes('talking');
        }
        if (key === 'wave') {
          return lower.includes('wave') || lower.includes('greet') || lower.includes('greeting');
        }
        if (key === 'think') {
          return lower.includes('think') || lower.includes('thinking');
        }
        if (key === 'sleepy') {
          return lower.includes('sleep') || lower.includes('sleepy') || lower.includes('listening');
        }
        if (key === 'listening') {
          return lower.includes('listen') || lower.includes('listening') || lower.includes('sleepy');
        }
        if (key === 'happy') {
          return lower.includes('happy') || lower.includes('laugh') || lower.includes('joy');
        }
        return lower.includes(key);
      });
      return matchedFile ? `${basePath}/animations/${matchedFile}` : null;
    };

    // Try finding the specific requested animation in detected files
    const specificUrl = findMatch(animKey);
    if (specificUrl) return specificUrl;

    // 3. Check dynamic animation registry
    if (activeConfig && activeConfig.animations) {
      let registryPath = activeConfig.animations[animKey];
      if (!registryPath) {
        if (animKey === 'talk') registryPath = activeConfig.animations['talking'] || activeConfig.animations['speak'] || activeConfig.animations['talk'];
        else if (animKey === 'think') registryPath = activeConfig.animations['thinking'] || activeConfig.animations['think'];
        else if (animKey === 'sleepy') registryPath = activeConfig.animations['listening'] || activeConfig.animations['sleep'] || activeConfig.animations['sleepy'];
        else if (animKey === 'listening') registryPath = activeConfig.animations['listening'] || activeConfig.animations['sleepy'];
        else if (animKey === 'wave') registryPath = activeConfig.animations['wave'] || activeConfig.animations['greet'];
        else if (animKey === 'happy') registryPath = activeConfig.animations['happy'];
      }
      if (registryPath && !registryPath.includes('fallback') && !registryPath.toLowerCase().includes('idle')) {
        return registryPath;
      }
    }

    // 4. Fallback to 'idle' animation if the requested one is missing
    if (animKey !== 'idle') {
      const idleUrl = findMatch('idle') || (activeConfig?.animations?.['idle']);
      if (idleUrl) return idleUrl;
    }

    // 5. Ultimate Fallback: Take the first available video file in the folder
    if (detected.length > 0) {
      return `${basePath}/animations/${detected[0]}`;
    }

    return null;
  };

  const activeVideoUrl = customVideoUrl || getStateVideoSrc(currentState, animationOverrides);

  useEffect(() => {
    if (!activeVideoUrl) {
      if (currentVideoRef.current !== null) {
        currentVideoRef.current.onended = null;
        previousVideoRef.current = currentVideoRef.current;
        currentVideoRef.current = null;
        fadeAlphaRef.current = 0.0;
      }
      return;
    }

    const isLooping = isLoopingState(currentState);

    // Load or fetch the HTMLVideoElement
    let newVideo = videoElements.current[activeVideoUrl];
    if (!newVideo) {
      newVideo = document.createElement('video');
      newVideo.src = activeVideoUrl;
      newVideo.loop = isLooping;
      newVideo.muted = true;
      newVideo.autoplay = true;
      newVideo.setAttribute('playsinline', 'true');
      newVideo.setAttribute('webkit-playsinline', 'true');
      newVideo.crossOrigin = 'anonymous';
      newVideo.play().catch(err => {
        console.warn('[SpriteSequenceRenderer] Autoplay failed:', activeVideoUrl, err);
      });
      videoElements.current[activeVideoUrl] = newVideo;
    } else {
      newVideo.loop = isLooping;
      if (newVideo.paused) {
        newVideo.play().catch(() => {});
      }
    }

    if (currentVideoRef.current !== newVideo) {
      if (currentVideoRef.current) {
        currentVideoRef.current.onended = null;
      }
      previousVideoRef.current = currentVideoRef.current;
      currentVideoRef.current = newVideo;
      fadeAlphaRef.current = previousVideoRef.current ? 0.0 : 1.0;
    }

    // Set up the onended callback for the active video
    if (!isLooping) {
      newVideo.loop = false;
      newVideo.onended = () => {
        console.log(`[SpriteSequenceRenderer] Non-looping video ended for state ${currentState}, returning to IDLE`);
        stateMachine.transitionTo(AiriState.IDLE, undefined, true);
      };
    } else {
      newVideo.loop = true;
      newVideo.onended = null;
    }

    return () => {
      if (newVideo) {
        newVideo.onended = null;
      }
    };
  }, [activeVideoUrl, currentState]);

  // Pre-load critical assets into local image cache
  const getCachedImage = (src: string): HTMLImageElement | null => {
    if (!src) return null;
    if (assetCache.current[src]) {
      const cachedImg = assetCache.current[src];
      if (cachedImg.getAttribute('data-failed') === 'true') {
        return null;
      }
      return cachedImg.complete ? cachedImg : null;
    }

    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.src = src;
    img.onload = () => {
      console.log(`[CompositorCache] Asset pre-cached successfully: ${src}`);
    };
    img.onerror = () => {
      console.warn(`[CompositorCache] Optional asset not loaded (falling back to procedural rendering): ${src}`);
      img.setAttribute('data-failed', 'true');
    };
    assetCache.current[src] = img;
    return null;
  };

  // Main 60 FPS rendering and composition loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Clear the viewport buffer
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Failsafe Check: If configs are missing, skip composite and render empty state gracefully
      if (!activeManifest || !activeConfig) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Automatically detect if active character/renderer is video-based
      const isVideoActive = !!(currentVideoRef.current || previousVideoRef.current) || (activeManifest?.detectedAnimations?.some(f => 
        f.endsWith('.webm') || f.endsWith('.mp4')
      ) ?? false);

      const scaleFactor = activeConfig.scale || 1.0;
      const anchors = activeConfig.anchorPoints;

      // Increment frame clocks
      frameCount.current++;
      
      // Calculate smooth sinus biological breathing (frequency of 0.04 matches standard resting heartbeats)
      breathingOffset.current = Math.sin(frameCount.current * 0.04) * 4;

      // Handle natural eye blinking timer
      blinkTimer.current++;
      if (isBlinking.current) {
        if (blinkTimer.current > 8) { // Eyelids closed for 8 frames (~130ms)
          isBlinking.current = false;
          blinkTimer.current = 0;
        }
      } else {
        if (blinkTimer.current > 180 + Math.random() * 120) { // Blink every 3-5 randomized seconds
          isBlinking.current = true;
          blinkTimer.current = 0;
        }
      }

      // Layer 1: Base Posture / Body Video Blend & Sprite Cross-Fade Layer
      const drawFrame = (imgOrVideo: HTMLImageElement | HTMLVideoElement | null, alpha: number) => {
        if (!imgOrVideo) return;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Apply breathing transformations (subtle scale adjustments around origin anchor)
        const renderHeight = canvas.height * scaleFactor;
        
        const isVideo = imgOrVideo instanceof HTMLVideoElement;
        const width = isVideo ? (imgOrVideo as HTMLVideoElement).videoWidth : (imgOrVideo as HTMLImageElement).width;
        const height = isVideo ? (imgOrVideo as HTMLVideoElement).videoHeight : (imgOrVideo as HTMLImageElement).height;
        
        // Failsafe if video metadata is not ready or width/height is 0
        if (!width || !height) {
          const fallbackBodyImg = getCachedImage(activeConfig.avatar);
          if (fallbackBodyImg && fallbackBodyImg.complete && fallbackBodyImg.width && fallbackBodyImg.height) {
            const fbHeight = canvas.height * scaleFactor;
            const fbWidth = (fallbackBodyImg.width / fallbackBodyImg.height) * fbHeight;
            const fbX = (canvas.width - fbWidth) / 2 + activeConfig.position.x;
            const fbY = canvas.height - fbHeight + activeConfig.position.y;
            ctx.drawImage(
              fallbackBodyImg, 
              fbX, 
              fbY + breathingOffset.current, 
              fbWidth, 
              fbHeight - breathingOffset.current
            );
          }
          ctx.restore();
          return;
        }

        const renderWidth = (width / height) * renderHeight;
        const xPos = (canvas.width - renderWidth) / 2 + activeConfig.position.x;
        const yPos = canvas.height - renderHeight + activeConfig.position.y;

        // Apply breathing rise/fall dynamically
        ctx.drawImage(
          imgOrVideo, 
          xPos, 
          yPos + breathingOffset.current, 
          renderWidth, 
          renderHeight - breathingOffset.current
        );

        ctx.restore();
      };

      // Tick the cross-fade alpha timer (0.3s transition at 60 FPS)
      if (fadeAlphaRef.current < 1.0) {
        fadeAlphaRef.current = Math.min(1.0, fadeAlphaRef.current + 1 / (60 * 0.3));
      }

      const prevVideo = previousVideoRef.current;
      const currVideo = currentVideoRef.current;
      const fadeAlpha = fadeAlphaRef.current;

      if (prevVideo && fadeAlpha < 1.0) {
        drawFrame(prevVideo, 1.0 - fadeAlpha);
        if (currVideo) {
          drawFrame(currVideo, fadeAlpha);
        } else {
          const staticImg = getCachedImage(activeConfig.avatar);
          if (staticImg) drawFrame(staticImg, fadeAlpha);
        }
      } else if (currVideo) {
        drawFrame(currVideo, 1.0);
      } else {
        const staticImg = getCachedImage(activeConfig.avatar);
        if (staticImg) drawFrame(staticImg, 1.0);
      }

      // Coordinate reference calculation relative to centered body sprite
      const baseWidth = 320; // Bound width standard reference
      const scaleRatio = canvas.width / baseWidth;
      
      const headCenterX = (canvas.width / 2) + (lookAtOffset.current.x * 0.3);
      const headCenterY = (canvas.height * (anchors?.head?.y || 0.25)) + (lookAtOffset.current.y * 0.3) + breathingOffset.current;

      // Only draw procedural facial decorations, blinks, look-at eyes, and mouth overlays
      // if the active character is NOT using a pre-rendered video asset!
      if (!isVideoActive) {
        // Layer 2: Emotional Face Expression layer
        // Blits custom eyebrow and blush features on top of moving skull coordinates
        if (activeExpression !== 'neutral') {
          const faceAssetPath = `${activeManifest.basePath}/expressions/${activeExpression}.png`;
          const exprImg = getCachedImage(faceAssetPath);
          if (exprImg) {
            ctx.save();
            const faceSize = 64 * scaleRatio * scaleFactor;
            ctx.drawImage(
              exprImg,
              headCenterX - faceSize / 2,
              headCenterY - faceSize / 2,
              faceSize,
              faceSize
            );
            ctx.restore();
          } else {
            // Robust Procedural Vector Expression Fallback (Failsafe rules)
            ctx.save();
            const lowerCaseExpr = activeExpression.toLowerCase();
            if (lowerCaseExpr.includes('happy') || lowerCaseExpr.includes('wave') || lowerCaseExpr.includes('laugh')) {
              // High-fidelity pink cheek blush circles
              ctx.fillStyle = 'rgba(255, 79, 125, 0.35)';
              ctx.beginPath();
              ctx.ellipse(headCenterX - 18 * scaleRatio * scaleFactor, headCenterY + 4 * scaleRatio * scaleFactor, 7 * scaleRatio, 3.5 * scaleRatio, 0, 0, 2 * Math.PI);
              ctx.fill();
              ctx.beginPath();
              ctx.ellipse(headCenterX + 18 * scaleRatio * scaleFactor, headCenterY + 4 * scaleRatio * scaleFactor, 7 * scaleRatio, 3.5 * scaleRatio, 0, 0, 2 * Math.PI);
              ctx.fill();
            } else if (lowerCaseExpr.includes('sad') || lowerCaseExpr.includes('apologize')) {
              // Subtle blue tear beads or downturned expressions
              ctx.fillStyle = 'rgba(79, 143, 255, 0.6)';
              ctx.beginPath();
              ctx.arc(headCenterX - 14 * scaleRatio * scaleFactor, headCenterY + 8 * scaleRatio * scaleFactor, 2.5 * scaleRatio, 0, 2 * Math.PI);
              ctx.fill();
              ctx.beginPath();
              ctx.arc(headCenterX + 14 * scaleRatio * scaleFactor, headCenterY + 8 * scaleRatio * scaleFactor, 2.5 * scaleRatio, 0, 2 * Math.PI);
              ctx.fill();
            } else if (lowerCaseExpr.includes('think') || lowerCaseExpr.includes('confused')) {
              // Thinking beads / sweat lines near the head temple
              ctx.strokeStyle = 'rgba(79, 143, 255, 0.6)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(headCenterX + 20 * scaleRatio * scaleFactor, headCenterY - 14 * scaleRatio * scaleFactor);
              ctx.lineTo(headCenterX + 20 * scaleRatio * scaleFactor, headCenterY - 4 * scaleRatio * scaleFactor);
              ctx.stroke();
            }
            ctx.restore();
          }
        }

        // Layer 3: Procedural Eye Blink / Pupillary Look-At
        ctx.save();
        const eyeSpacing = 16 * scaleRatio * scaleFactor;
        const eyeY = headCenterY - (4 * scaleRatio);
        
        const leftEyeX = headCenterX - eyeSpacing;
        const rightEyeX = headCenterX + eyeSpacing;

        if (isBlinking.current) {
          // Draw closed eyelids (expressive dark curves)
          ctx.strokeStyle = '#2d2d2d';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';

          // Left eyelid
          ctx.beginPath();
          ctx.arc(leftEyeX, eyeY, 6 * scaleRatio, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.stroke();

          // Right eyelid
          ctx.beginPath();
          ctx.arc(rightEyeX, eyeY, 6 * scaleRatio, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.stroke();
        } else {
          // Draw open animated anime eyes with gradient colors matching active posture
          const pupilColor = activeExpression === 'sad' ? '#4f4f4f' : '#ff4f7d';
          const eyeRadius = 7 * scaleRatio;

          const drawEye = (x: number) => {
            // Inner pupil shift toward cursor vector
            const pupilX = x + (lookAtOffset.current.x * 0.4);
            const pupilY = eyeY + (lookAtOffset.current.y * 0.4);

            ctx.fillStyle = pupilColor;
            ctx.beginPath();
            ctx.arc(pupilX, pupilY, eyeRadius, 0, 2 * Math.PI);
            ctx.fill();

            // Cute white reflection highlights
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(pupilX - (2 * scaleRatio), pupilY - (2 * scaleRatio), 2 * scaleRatio, 0, 2 * Math.PI);
            ctx.fill();
          };

          drawEye(leftEyeX);
          drawEye(rightEyeX);
        }
        ctx.restore();

        // Layer 4: Dynamic Lip Sync Mouth Overlay
        // Synchronized to incoming audio amplitudes in real-time
        ctx.save();
        const mouthY = headCenterY + (12 * scaleRatio);
        const isSpeaking = currentState === AiriState.TALKING || mouthVolume > 0.05;

        ctx.fillStyle = '#ff4f7d';
        ctx.strokeStyle = '#2d2d2d';
        ctx.lineWidth = 2;

        if (isSpeaking) {
          // Open mouth: scale height ellipse in relation to mic audio amplitude level
          const openAmp = Math.max(2, mouthVolume * 24);
          ctx.beginPath();
          ctx.ellipse(
            headCenterX, 
            mouthY, 
            6 * scaleRatio, 
            openAmp * scaleRatio, 
            0, 0, 2 * Math.PI
          );
          ctx.fill();
          ctx.stroke();
        } else {
          // Closed mouth: render an elegant resting smile curve
          ctx.beginPath();
          ctx.arc(headCenterX, mouthY - (2 * scaleRatio), 4 * scaleRatio, 0, Math.PI);
          ctx.stroke();
        }
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeManifest, activeConfig, currentState, activeExpression, mouthVolume, cursorPos, dimensions]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col items-center justify-end select-none pointer-events-none">
      <canvas
        id="character-compositor-canvas"
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ width: dimensions.width, height: dimensions.height }}
        className="w-full h-full object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.6)]"
      />
    </div>
  );
}
