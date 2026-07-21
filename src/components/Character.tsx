import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'motion/react';
import { AiriState, CharacterManifest } from '../types';
import { eventBus } from '../services/EventBus';
import { characterPluginRegistry } from '../services/CharacterPluginRegistry';
import CharacterRenderer from './CharacterRenderer';

interface StarParticle {
  id: number;
  x: number;
  y: number;
  scale: number;
}

interface ZzzParticle {
  id: number;
  x: number;
  y: number;
  scale: number;
}

export default function Character({
  avatarUrl,
  animationSpeed = 1
}: {
  avatarUrl: string;
  animationSpeed?: number;
}) {
  const [characterState, setCharacterState] = useState<AiriState>(AiriState.IDLE);
  const [mouthOpenAmount, setMouthOpenAmount] = useState<number>(0);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [activeManifest, setActiveManifest] = useState<CharacterManifest | null>(null);

  // Springs for buttery smooth mouse tracking
  const trackX = useMotionValue(0);
  const trackY = useMotionValue(0);
  const springConfig = { damping: 30, stiffness: 120, mass: 1 };
  const smoothTrackX = useSpring(trackX, springConfig);
  const smoothTrackY = useSpring(trackY, springConfig);

  useEffect(() => {
    // 0. Initialize active manifest state
    setActiveManifest(characterPluginRegistry.getActiveManifest());
    const unsubChar = eventBus.subscribe('character:change', (m) => {
      setActiveManifest(m);
    });

    // 1. Subscribe to state changes from State Machine
    const unsubState = eventBus.subscribe('state:change', ({ to }) => {
      setCharacterState(to);
    });

    // 2. Subscribe to audio level changes for live mouth lip-sync
    const unsubAudio = eventBus.subscribe('audio:level', (level) => {
      // Audio level is normalized 0-100, scale it down for mouth motion
      setMouthOpenAmount(level);
      // Publish normalized amplitude (0 to 1) for the Canvas compositor
      eventBus.publish('lip-sync:update', level / 100);
    });

    // 3. Custom animation video event listener
    const handleCustomVideo = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCustomVideoUrl(detail?.videoUrl || null);
    };
    window.addEventListener('airi-custom-video-change', handleCustomVideo);

    // 4. Mouse track setup
    const handleMouseMove = (e: MouseEvent) => {
      // Ignore tracking if sleeping
      if (characterState === AiriState.SLEEPING) {
        trackX.set(0);
        trackY.set(0);
        return;
      }

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2.5; // center of character's head
      
      // Calculate delta offsets and scale them for very elegant, subtle head turns
      const deltaX = (e.clientX - centerX) / window.innerWidth;
      const deltaY = (e.clientY - centerY) / window.innerHeight;

      trackX.set(deltaX * 24); // max rotation range in degrees
      trackY.set(deltaY * -12); // vertical tilt
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      unsubChar();
      unsubState();
      unsubAudio();
      window.removeEventListener('airi-custom-video-change', handleCustomVideo);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [characterState, trackX, trackY]);

  // Determine character's motion values based on active animation states
  const getSwayAnimation = () => {
    switch (characterState) {
      case AiriState.SLEEPING:
        return {
          // Extremely deep, slow, relaxing breathing cycle
          y: [0, 4, 0],
          scaleY: [1, 0.985, 1],
          transition: {
            duration: 5.5 / animationSpeed,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        };
      case AiriState.THINKING:
        return {
          // Slowly rocking from side to side in deep concentration
          x: [-4, 4, -4],
          y: [0, -2, 0],
          rotate: [-1, 1, -1],
          transition: {
            duration: 4.5 / animationSpeed,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        };
      case AiriState.TALKING:
        return {
          // Animated talking with slight head nods
          y: [0, -3, 1, -2, 0],
          transition: {
            duration: 2.2 / animationSpeed,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        };
      case AiriState.LISTENING:
        return {
          // Attentive listening body sway with a slight head tilt
          rotate: [1, 1.5, 1],
          y: [0, -1, 0],
          scale: 1.005,
          transition: {
            duration: 3 / animationSpeed,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        };
      case AiriState.HAPPY:
        return {
          // Bouncy, excited double hop
          y: [0, -16, 0, -12, 0],
          scaleY: [1, 1.04, 0.98, 1.02, 1],
          transition: {
            duration: 1.4 / animationSpeed,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        };
      case AiriState.WAVE:
        return {
          // Welcoming lean
          rotate: [-1.5, -2, -1.5],
          x: [-4, -6, -4],
          transition: {
            duration: 1.5,
            repeat: 3,
            ease: 'easeInOut'
          }
        };
      case AiriState.IDLE:
      default:
        return {
          // Soft organic idle breathing cycle
          y: [0, -5, 0],
          scaleY: [1, 1.012, 1],
          transition: {
            duration: 3.5 / animationSpeed,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        };
    }
  };

  return (
    <div id="character-controller-container" className="absolute inset-x-0 bottom-0 flex justify-center items-end w-full h-[85vh] select-none pointer-events-none z-10">
      {/* Interactive Visual Novel expression layers and character avatar */}
      <motion.div
        id="character-avatar-wrapper"
        style={{
          rotateY: smoothTrackX,
          rotateX: smoothTrackY,
          transformStyle: 'preserve-3d',
          perspective: 1000
        }}
        animate={getSwayAnimation()}
        className="relative flex justify-center items-end h-full w-[500px] sm:w-[550px] md:w-[600px]"
      >
        {/* Shadow base on ground */}
        <div className="absolute bottom-2 w-48 h-5 rounded-full bg-black/25 blur-md" />

        {/* 60 FPS HTML5 Canvas Multi-Layer Compositor (Posture + Emotions + Look-At + Blinks) */}
        <CharacterRenderer manifest={activeManifest} />
      </motion.div>
    </div>
  );
}
