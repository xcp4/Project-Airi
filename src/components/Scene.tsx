import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { eventBus } from '../services/EventBus';
import { AppSettings } from '../types';

interface SakuraPetal {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  swayDuration: number;
  opacity: number;
}

export default function Scene({ settings }: { settings: AppSettings }) {
  const [background, setBackground] = useState<string>(settings.backgroundTheme || '/assets/backgrounds/gardens.png');
  const [petals, setPetals] = useState<SakuraPetal[]>([]);

  // Keep background state synchronized with settings.backgroundTheme
  useEffect(() => {
    if (settings.backgroundTheme) {
      setBackground(settings.backgroundTheme);
    }
  }, [settings.backgroundTheme]);

  // Smooth springs for camera parallax tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 80, mass: 0.8 };
  const cameraX = useSpring(mouseX, springConfig);
  const cameraY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Generate organic ambient floating Sakura petals
    const newPetals: SakuraPetal[] = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // random percentage
      size: Math.random() * 12 + 6, // 6px to 18px
      delay: Math.random() * -15, // offset start times so they fall immediately
      duration: Math.random() * 8 + 12, // 12s to 20s fall duration
      swayDuration: Math.random() * 3 + 3, // 3s to 6s side-to-side sway
      opacity: Math.random() * 0.5 + 0.4 // transparent overlay
    }));
    setPetals(newPetals);

    // Support background events
    const unsubBg = eventBus.subscribe('bg:change', (newBg) => {
      setBackground(newBg);
    });

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate normalized mouse positions (-1 to 1) for subtle parallax camera effects
      const x = (e.clientX / window.innerWidth - 0.5) * -15; // move opposite to mouse
      const y = (e.clientY / window.innerHeight - 0.5) * -15;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      unsubBg();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mouseX, mouseY]);

  return (
    <div id="game-scene-viewport" className="relative w-full h-full overflow-hidden select-none">
      {/* Renderer Viewport: Background image with Spring Parallax Camera */}
      <motion.div
        id="camera-background"
        style={{
          x: cameraX,
          y: cameraY,
          scale: 1.05 // slightly oversize to hide edges during parallax pan
        }}
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
        animate={{
          backgroundImage: `url(${background})`
        }}
      />

      {/* Ambient Lighting Lightrays overlay */}
      <div 
        id="lighting-bloom-overlay"
        className="absolute inset-0 bg-radial-[circle_at_top_right] from-amber-100/10 via-transparent to-transparent mix-blend-screen pointer-events-none"
      />

      {/* Floating Sakura Particle Engine */}
      <div id="sakura-particle-viewport" className="absolute inset-0 pointer-events-none overflow-hidden">
        {petals.map((petal) => (
          <motion.div
            key={petal.id}
            style={{
              left: `${petal.left}%`,
              width: petal.size,
              height: petal.size * 0.8,
              opacity: petal.opacity,
            }}
            initial={{ y: -50, rotate: 0 }}
            animate={{
              y: '105vh',
              rotate: [0, 180, 360],
              x: [0, Math.sin(petal.id) * 40, 0] // procedural side-to-side drift
            }}
            transition={{
              y: {
                duration: petal.duration,
                repeat: Infinity,
                ease: 'linear',
                delay: petal.delay
              },
              rotate: {
                duration: petal.duration * 0.5,
                repeat: Infinity,
                ease: 'linear',
                delay: petal.delay
              },
              x: {
                duration: petal.swayDuration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: petal.delay
              }
            }}
            className="absolute rounded-tr-full rounded-bl-full bg-linear-to-br from-pink-300 to-pink-400 border border-pink-200/20 shadow-xs blur-[0.3px]"
          />
        ))}
      </div>

      {/* Ambient Floating Bokeh/Dust Particles */}
      <div id="ambient-dust-particles" className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={`dust-${i}`}
            className="absolute rounded-full bg-white/20 blur-[1px]"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-15, 15],
              x: [-15, 15],
              opacity: [0.1, 0.4, 0.1],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: Math.random() * 6 + 6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * -10
            }}
          />
        ))}
      </div>

      {/* High-End Film Effects / Vignette Filter Overlay */}
      {settings.effectsEnabled && (
        <>
          {/* Edge Vignette */}
          <div 
            id="vignette-effect"
            className="absolute inset-0 bg-radial-[circle_at_center] from-transparent via-transparent to-black/35 pointer-events-none"
          />
          {/* Scanlines Effect */}
          <div 
            id="scanline-effect"
            className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.12)_50%)] bg-[length:100%_4px] opacity-25 pointer-events-none pointer-events-none"
          />
          {/* Very Subtle Noise/Film Grain */}
          <div 
            id="film-grain-effect"
            className="absolute inset-0 opacity-[0.02] mix-blend-overlay bg-[radial-gradient(#fff_1px,transparent_0)] bg-[length:8px_8px] pointer-events-none animate-pulse"
          />
        </>
      )}
    </div>
  );
}
