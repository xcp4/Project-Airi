import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Send, Sparkles, RefreshCw } from 'lucide-react';
import { eventBus } from '../services/EventBus';
import { LiveCallState } from '../services/GeminiLiveClient';

export default function ChatBar({
  onSubmit,
  isRecording,
  onToggleRecord,
  isGenerating,
  isLiveActive = false,
  liveState = 'idle',
  onToggleLive
}: {
  onSubmit: (text: string) => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  isGenerating: boolean;
  isLiveActive?: boolean;
  liveState?: LiveCallState;
  onToggleLive?: () => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const bottomBarRef = useRef<HTMLDivElement>(null);

  // Auto hide/show chat bar based on mouse hovering bottom screen
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Trigger threshold: bottom 120px of the screen
      const threshold = window.innerHeight - 130;
      if (e.clientY >= threshold || isFocused || isLiveActive) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isFocused, isLiveActive]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isGenerating) return;
    
    onSubmit(inputValue);
    setInputValue('');
  };

  // Listen to keyboard event: ESC hides the chat bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFocused(false);
        setIsHovered(false);
        eventBus.publish('input:focus', false);
        // Blur the input element if focused
        (document.activeElement as HTMLElement)?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
      ref={bottomBarRef}
      className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-8 pt-24 z-20 pointer-events-none"
    >
      <AnimatePresence>
        {isHovered || isFocused || isLiveActive ? (
          <motion.div
            id="chat-bar-container"
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            className="w-full max-w-xl px-4 pointer-events-auto animate-in fade-in"
          >
            {/* Real-time status display badge above the bar during a Live call */}
            {isLiveActive && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center mb-3"
              >
                <div className={`px-4 py-1.5 rounded-full backdrop-blur-xl border flex items-center gap-2 text-xs font-semibold shadow-lg transition-all duration-300 ${
                  liveState === 'connecting' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
                  liveState === 'listening' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                  liveState === 'thinking' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' :
                  liveState === 'speaking' ? 'bg-pink-500/10 border-pink-500/20 text-pink-300' :
                  'bg-rose-500/10 border-rose-500/20 text-rose-300 animate-pulse'
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    liveState === 'connecting' ? 'bg-amber-400 animate-pulse' :
                    liveState === 'listening' ? 'bg-emerald-400 animate-pulse' :
                    liveState === 'thinking' ? 'bg-cyan-400 animate-bounce' :
                    liveState === 'speaking' ? 'bg-pink-400 animate-ping' :
                    'bg-rose-400 animate-pulse'
                  }`} />
                  <span className="tracking-wider uppercase">
                    {liveState === 'connecting' ? 'Live Connecting...' :
                     liveState === 'listening' ? 'Live Connected, Listening...' :
                     liveState === 'thinking' ? 'Thinking...' :
                     liveState === 'speaking' ? 'Speaking...' :
                     'Live Connected'}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Elegant Glassmorphic Container with a rich glow border */}
            <form
              onSubmit={handleSubmit}
              className={`relative flex items-center bg-black/45 backdrop-blur-2xl border ${
                isFocused 
                  ? 'border-pink-400/50 shadow-[0_0_25px_rgba(244,114,182,0.3)]' 
                  : 'border-white/10 shadow-2xl shadow-black/80'
              } rounded-full py-2.5 pl-6 pr-2.5 gap-3 transition-all duration-300`}
            >
              {/* Dynamic status/input icon */}
              <div className="flex items-center text-pink-400">
                {isGenerating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 animate-pulse" />
                )}
              </div>

              {/* Chat Text Input field */}
              <input
                id="message-input-field"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => {
                  setIsFocused(true);
                  eventBus.publish('input:focus', true);
                }}
                onBlur={() => {
                  // Wait briefly before blurring to let button clicks register
                  setTimeout(() => {
                    setIsFocused(false);
                    eventBus.publish('input:focus', false);
                  }, 200);
                }}
                placeholder={isLiveActive ? "Type while in call..." : "Ask anything..."}
                disabled={isGenerating}
                className="flex-1 bg-transparent border-0 text-white placeholder-white/35 font-sans font-normal text-sm focus:outline-hidden focus:ring-0"
              />

              {/* Persistent Live Call Trigger / End Button */}
              <button
                type="button"
                id="mic-record-button"
                onClick={onToggleLive}
                title={isLiveActive ? "End Gemini Live Call" : "Start Gemini Live Call"}
                className={`relative px-4 py-2 rounded-full transition-all duration-300 flex items-center gap-1.5 font-sans font-bold text-xs select-none cursor-pointer ${
                  isLiveActive 
                    ? 'bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.8)]' 
                    : 'text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                {isLiveActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>🔴 Live</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>🎤 Call</span>
                  </>
                )}
                {isLiveActive && (
                  <span className="absolute inset-0 rounded-full border border-rose-600 animate-ping opacity-75" />
                )}
              </button>

              {/* Send Submit Button */}
              <button
                type="submit"
                id="submit-message-button"
                disabled={!inputValue.trim() || isGenerating}
                className={`p-2.5 rounded-full transition-all duration-300 ${
                  inputValue.trim() && !isGenerating
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30 cursor-pointer hover:scale-105 active:scale-95'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        ) : (
          /* Small elegant ambient helper text when bar is hidden */
          <motion.div
            id="chat-hint-hint"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.5, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-white/40 font-sans text-[12px] tracking-wider select-none uppercase font-semibold text-center py-2"
          >
            Move your mouse here to chat with Airi
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
