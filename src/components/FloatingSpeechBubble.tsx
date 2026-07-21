import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, X } from 'lucide-react';
import { eventBus } from '../services/EventBus';

export default function FloatingSpeechBubble({
  text,
  onClose,
  isVoiceActive = false
}: {
  text: string;
  onClose: () => void;
  isVoiceActive?: boolean;
}) {
  const [waveHeights, setWaveHeights] = useState<number[]>([]);

  // Periodically generate random audio wave visualizer heights when voice synthesis is speaking
  useEffect(() => {
    if (!isVoiceActive) {
      setWaveHeights([]);
      return;
    }

    const interval = setInterval(() => {
      // 12 bars for a gorgeous waveform
      const newHeights = Array.from({ length: 14 }).map(
        () => Math.floor(Math.random() * 22) + 4
      );
      setWaveHeights(newHeights);

      // Publish high level audio to animate Airi's speaking mouth too!
      const maxVal = Math.max(...newHeights);
      eventBus.publish('audio:level', maxVal * 4); // translate to 0-100 range
    }, 110);

    return () => {
      clearInterval(interval);
      eventBus.publish('audio:level', 0); // reset mouth
    };
  }, [isVoiceActive]);

  return (
    <AnimatePresence>
      {text && (
        <motion.div
          id="speech-bubble-wrapper"
          initial={{ opacity: 0, scale: 0.85, x: -30, y: 40 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, x: -30, y: 40 }}
          transition={{ type: 'spring', damping: 22, stiffness: 100 }}
          className="absolute bottom-[24%] left-[10%] md:left-[15%] w-[330px] md:w-[380px] pointer-events-auto z-20"
        >
          {/* Main glass speech container */}
          <div className="relative p-6 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/80 flex flex-col gap-4">
            {/* Header: Assistant Name + Small actions */}
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                <span className="font-sans font-semibold text-xs tracking-wider text-white/80 uppercase">
                  Airi
                </span>
              </div>
              <button
                id="close-speech-bubble"
                onClick={onClose}
                className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors duration-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bubble body text with automatic vertical expansion, multi-line support, and smooth scrollbar-enabled max-height */}
            <div className="text-white/90 font-sans text-[14px] leading-relaxed pr-2 font-medium select-text break-words whitespace-pre-wrap overflow-y-auto max-h-[200px] md:max-h-[280px] scroll-smooth">
              {text}
            </div>

            {/* Bottom: Voice Waveform bar and voice mute indicator */}
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-pink-400/85">
                <Volume2 className="w-4 h-4 animate-bounce" />
                <span className="font-sans text-[10px] font-semibold text-white/40 uppercase">
                  Vocalizing
                </span>
              </div>

              {/* Holographic animated voice wave bars */}
              <div className="flex items-end gap-[3px] h-6 px-1.5">
                {waveHeights.length > 0 ? (
                  waveHeights.map((height, idx) => (
                    <motion.div
                      key={idx}
                      className="w-[3px] rounded-full bg-linear-to-t from-blue-400 via-pink-400 to-pink-500 shadow-[0_0_8px_rgba(244,114,182,0.4)]"
                      style={{ height: `${height}px` }}
                      animate={{ height: `${height}px` }}
                      transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                    />
                  ))
                ) : (
                  /* Standard inactive flat line */
                  Array.from({ length: 14 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-[3px] h-[3px] rounded-full bg-white/20"
                    />
                  ))
                )}
              </div>
            </div>

            {/* Elegant glass tail decoration */}
            <div 
              className="absolute -bottom-2.5 right-12 w-5 h-5 bg-black/60 border-r border-b border-white/10 transform rotate-45"
              style={{ clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
