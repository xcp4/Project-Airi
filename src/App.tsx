import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Settings as SettingsIcon, Sparkles, Volume2, ShieldAlert, Monitor, CheckCircle2, Pin, Film, Target } from 'lucide-react';
import { AiriState, AppSettings } from './types';
import { eventBus } from './services/EventBus';
import { stateMachine } from './services/StateMachine';
import { characterPluginRegistry } from './services/CharacterPluginRegistry';
import { behaviorPlanner } from './services/BehaviorPlanner';
import { promptBuilder } from './services/PromptBuilder';
import { conversationContext } from './services/ConversationContext';
import { memoryManager } from './services/MemoryManager';
import Scene from './components/Scene';
import Character from './components/Character';
import ChatBar from './components/ChatBar';
import FloatingSpeechBubble from './components/FloatingSpeechBubble';
import SettingsPanel from './components/SettingsPanel';
import AnimationStudio from './components/AnimationStudio';
import { GeminiLiveClient, LiveCallState } from './services/GeminiLiveClient';
import { companionBrain } from './services/CompanionBrain';
import { skillManager } from './services/skills/SkillManager';

export default function App() {
  // Master game engine state configuration
  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultSettings: AppSettings = {
      assistantName: 'Airi',
      userName: 'Friend',
      voiceVolume: 0.9,
      voiceSpeed: 1.0,
      windowOpacity: 0.95,
      backgroundTheme: '/assets/backgrounds/gardens.png',
      selectedCharacter: 'Airi',
      effectsEnabled: true,
      geminiModel: 'gemini-2.5-flash',
      useVoiceOutput: true,
      selectedVoice: 'Aoede',
      voiceLanguage: 'en-US',
      voicePitch: 1.15,
      voiceProvider: 'google'
    };
    try {
      const saved = localStorage.getItem('airi_app_settings');
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
    }
    return defaultSettings;
  });

  // Save settings on update
  useEffect(() => {
    localStorage.setItem('airi_app_settings', JSON.stringify(settings));
  }, [settings]);

  const [activeSpeech, setActiveSpeech] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentGoal, setCurrentGoal] = useState<string>(() => conversationContext.getCurrentGoal());
  
  // Gemini Live active and state-aware tracking
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [liveState, setLiveState] = useState<LiveCallState>('idle');
  const liveClientRef = useRef<GeminiLiveClient | null>(null);

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const simulatedSpeakTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Speech Synthesizer & Speech Recognition engines
  useEffect(() => {
    // 1. Bootstrap Character Registry & Greeting Behavior
    const boot = async () => {
      await characterPluginRegistry.bootstrapRegistry();
      const savedCharId = localStorage.getItem('airi_selected_character_id') || 'com.companion.airi';
      let success = await characterPluginRegistry.selectCharacter(savedCharId);
      if (!success && savedCharId !== 'com.companion.airi') {
        success = await characterPluginRegistry.selectCharacter('com.companion.airi');
      }
      
      const activeManifest = characterPluginRegistry.getActiveManifest();
      if (activeManifest) {
        setSettings(prev => ({
          ...prev,
          selectedCharacter: activeManifest.name,
          assistantName: activeManifest.name
        }));
      }
      
      const welcomeMsgs = [
        `Hello there! I'm so happy to see you. How is your day going?`,
        `Ah, you're finally here! I've been waiting to talk to you!`,
        `Welcome back! I was starting to get a little lonely here...`
      ];
      const selectedWelcome = welcomeMsgs[Math.floor(Math.random() * welcomeMsgs.length)];
      
      // Let behavior planner trigger the greeting animation sequence
      await behaviorPlanner.executeIntent('greet_user');
      triggerSpeak(selectedWelcome);
    };
    boot();

    // 2. Initialize Speech Recognition Engine
    // Production Design: Microphone input is streamed dynamically to the Python FastAPI backend
    // WebSocket endpoint (/ws) to execute high-performance, real-time server-side Speech-to-Text (STT).
    // The browser Web Speech API serves as a local/development fallback.
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        stateMachine.transitionTo(AiriState.LISTENING);
        console.log('[SpeechEngine] Speech recognition session started. (Production design routes to ws://localhost:8000/ws)');
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          handleSendMessage(transcript);
        }
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsRecording(false);
        stateMachine.transitionTo(AiriState.IDLE);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }

    // 3. Listener to open Veo Animation Studio from setting panel link
    const handleOpenStudio = () => {
      setIsStudioOpen(true);
    };
    window.addEventListener('ui-open-animation-studio', handleOpenStudio);

    const handleGoalUpdated = (e: any) => {
      setCurrentGoal(e.detail);
    };
    window.addEventListener('airi-goal-updated', handleGoalUpdated);

    return () => {
      window.removeEventListener('ui-open-animation-studio', handleOpenStudio);
      window.removeEventListener('airi-goal-updated', handleGoalUpdated);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (simulatedSpeakTimerRef.current) {
        clearTimeout(simulatedSpeakTimerRef.current);
      }
      if (liveClientRef.current) {
        liveClientRef.current.endCall();
      }
    };
  }, []);

  // Update opacity dynamically on main container
  useEffect(() => {
    const rootEl = document.getElementById('root-game-container');
    if (rootEl) {
      rootEl.style.opacity = settings.windowOpacity.toString();
    }
  }, [settings.windowOpacity]);

  const runSimulatedSpeak = (text: string) => {
    if (simulatedSpeakTimerRef.current) {
      clearTimeout(simulatedSpeakTimerRef.current);
    }
    setIsSpeaking(true);
    stateMachine.transitionTo(AiriState.TALKING);
    
    const wordsCount = text.split(' ').length;
    const readingDuration = Math.max(1500, wordsCount * 280); // approx reading speed
    
    simulatedSpeakTimerRef.current = setTimeout(() => {
      setIsSpeaking(false);
      stateMachine.transitionTo(AiriState.IDLE);
    }, readingDuration);
  };

  // Speaking / Speech synthesis engine
  // Unified Speech Pipeline: If Google Gemini is selected as the active provider,
  // we use Google Gemini TTS on the backend, bypassing browser SpeechSynthesis.
  const triggerSpeak = async (text: string) => {
    setActiveSpeech(text);
    
    if (simulatedSpeakTimerRef.current) {
      clearTimeout(simulatedSpeakTimerRef.current);
      simulatedSpeakTimerRef.current = null;
    }
    
    const isGoogleActive = (settings.voiceProvider || 'google') === 'google';

    if (!isGoogleActive) {
      executeWebSpeechFallback(text);
      return;
    }
    
    console.log(`[SpeechEngine] Requesting speech synthesis from Google Gemini TTS for: "${text}"`);
    
    try {
      const response = await fetch('/api/speech/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: settings.selectedVoice || 'Aoede',
          provider: 'google'
        })
      });
 
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onplay = () => {
          setIsSpeaking(true);
          stateMachine.transitionTo(AiriState.TALKING);
        };
        
        audio.onended = () => {
          setIsSpeaking(false);
          stateMachine.transitionTo(AiriState.IDLE);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          console.warn('[SpeechEngine] Gemini audio playback failed, falling back to simulated speaking.');
          runSimulatedSpeak(text);
        };

        await audio.play();
        return;
      } else {
        throw new Error('Gemini Speech API returned non-200');
      }
    } catch (err) {
      console.log('[SpeechEngine] Gemini backend TTS unavailable or offline. Falling back to simulated speaking.');
      runSimulatedSpeak(text);
    }
  };

  // Browser SpeechSynthesis Development Fallback
  const executeWebSpeechFallback = (text: string) => {
    if (!settings.useVoiceOutput || !window.speechSynthesis) {
      runSimulatedSpeak(text);
      return;
    }

    // Cancel any current speaking utterance
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('Speech cancel failed:', e);
    }

    // Create new vocal synthesis utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Select custom voice or fall back to high-quality default
    const voices = window.speechSynthesis.getVoices();
    let selectedVoiceObj = null;
    if (settings.selectedVoice) {
      selectedVoiceObj = voices.find(v => v.name === settings.selectedVoice);
    }
    if (!selectedVoiceObj && settings.voiceLanguage) {
      selectedVoiceObj = voices.find(v => v.lang === settings.voiceLanguage);
    }
    if (!selectedVoiceObj) {
      selectedVoiceObj = voices.find(v => 
        v.name.includes('Google US English') || 
        v.name.includes('Neural') || 
        v.name.includes('Natural') || 
        v.lang.startsWith('en-US') && v.name.toLowerCase().includes('female')
      );
    }

    if (selectedVoiceObj) {
      utterance.voice = selectedVoiceObj;
      utterance.lang = selectedVoiceObj.lang;
    } else if (settings.voiceLanguage) {
      utterance.lang = settings.voiceLanguage;
    }

    utterance.pitch = settings.voicePitch !== undefined ? settings.voicePitch : 1.15;
    utterance.rate = settings.voiceSpeed;
    utterance.volume = settings.voiceVolume;

    utterance.onstart = () => {
      setIsSpeaking(true);
      stateMachine.transitionTo(AiriState.TALKING);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      stateMachine.transitionTo(AiriState.IDLE);
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error, falling back to simulated speaking:', e);
      setIsSpeaking(false);
      stateMachine.transitionTo(AiriState.IDLE);
      
      // If voice output is blocked or fails, fall back to simulated speaking so that 
      // the user still sees responsive talking animations and speech bubbles
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        runSimulatedSpeak(text);
      }
    };

    utteranceRef.current = utterance;
    
    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('SpeechSynthesis.speak failed, executing simulated fallback:', err);
      runSimulatedSpeak(text);
    }
  };

  // Toggle Hands-free voice dictation
  const handleToggleRecord = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel(); // Mute her if she's speaking before user speaks
      }
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Persistent Gemini Live Call Mode Trigger and State Manager
  const handleToggleLive = async () => {
    if (isLiveActive) {
      if (liveClientRef.current) {
        liveClientRef.current.endCall();
        liveClientRef.current = null;
      }
      setIsLiveActive(false);
      setLiveState('idle');
      setIsSpeaking(false);
      stateMachine.transitionTo(AiriState.IDLE);
    } else {
      if (isRecording) {
        recognitionRef.current?.stop();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setActiveSpeech('');

      // Run the Companion Brain cognitive layer to construct the strategic instruction
      const { systemInstruction } = companionBrain.process(
        "Initiate a continuous, high-performance, real-time vocal conversation. Respond in character as Airi, keeping spoken replies warm, friendly, concise, and dynamic.",
        settings.userName,
        settings.assistantName
      );

      const client = new GeminiLiveClient(systemInstruction);
      liveClientRef.current = client;

      client.onStateChange = (state) => {
        setLiveState(state);
        if (state === 'connecting') {
          stateMachine.transitionTo(AiriState.WAVE);
          setIsSpeaking(false);
        } else if (state === 'listening') {
          stateMachine.transitionTo(AiriState.LISTENING);
          setIsSpeaking(false);
        } else if (state === 'thinking') {
          stateMachine.transitionTo(AiriState.THINKING);
          setIsSpeaking(false);
        } else if (state === 'speaking') {
          stateMachine.transitionTo(AiriState.TALKING);
          setIsSpeaking(true);
        } else if (state === 'idle') {
          stateMachine.transitionTo(AiriState.IDLE);
          setIsSpeaking(false);
        }
      };

      client.onUserTranscript = (text) => {
        // Log spoken user turns to persistent conversation logs
        conversationContext.addTurn('user', text);
      };

      client.onModelTranscript = (text) => {
        // Display real-time streaming speech in the speech bubble
        setActiveSpeech(text);
        conversationContext.addTurn('assistant', text);

        // Perform memory extraction asynchronously in the background
        fetch('/api/memory/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'User voice input', reply: text })
        })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Memory extraction failed');
        })
        .then(async (extracted) => {
          if (extracted && extracted.shouldRemember && extracted.content) {
            const { category, title, content, importance } = extracted;
            await memoryManager.addMemory({
              category: category || 'Custom',
              title: title || 'Extracted Fact',
              content: content,
              importance: typeof importance === 'number' ? importance : 5,
              source: 'automatic'
            });
            window.dispatchEvent(new CustomEvent('airi-memory-updated'));
          }
        })
        .catch(err => console.warn('Live mode memory extraction error:', err));
      };

      client.onError = (err) => {
        console.error('[GeminiLive] Session error:', err);
        setActiveSpeech(`Failed to start Live session: ${err}. Falling back to text mode.`);
        setIsLiveActive(false);
        setLiveState('idle');
        setIsSpeaking(false);
        stateMachine.transitionTo(AiriState.SLEEPING);
      };

      setIsLiveActive(true);
      await client.startCall();
    }
  };

  // Handle incoming conversational inputs (text or speech)
  const handleSendMessage = async (text: string) => {
    if (isGenerating) return;

    // Switch out of live call if user starts typing (Airi supports dynamic mode switching)
    if (isLiveActive) {
      if (liveClientRef.current) {
        liveClientRef.current.endCall();
        liveClientRef.current = null;
      }
      setIsLiveActive(false);
      setLiveState('idle');
      setIsSpeaking(false);
    }

    // Trigger behavioral sequence: think
    await behaviorPlanner.executeIntent('think');
    setIsGenerating(true);
    setActiveSpeech(''); // Reset active bubble

    try {
      // 1. Ask Companion Brain whether an appropriate Skill exists for the message
      const { skill: appropriateSkill, parameters: skillParams } = await companionBrain.determineAppropriateSkill(text, settings.userName, settings.assistantName);
      let skillResultContext = '';
      
      if (appropriateSkill) {
        const emotions = companionBrain.getEmotions();
        const goal = conversationContext.getCurrentGoal() || 'Foster a cozy, natural dialog, active listening, and offer supportive companionship.';
        const history = conversationContext.getHistory();
        
        const context = {
          message: text,
          history,
          emotions,
          goal,
          userName: settings.userName,
          assistantName: settings.assistantName,
          parameters: skillParams
        };
        
        // Execute the skill and retrieve results
        const result = await skillManager.executeSkill(appropriateSkill.id, context);
        if (result.success) {
          skillResultContext = `\n\n[Skill System Output] Active Skill executed: "${appropriateSkill.name}" (${appropriateSkill.id}). Result output: ${JSON.stringify(result.output)}. Address and incorporate this output naturally and enthusiastically in your reply, mentioning that you used this capability.`;
        } else {
          skillResultContext = `\n\n[Skill System Output] Active Skill: "${appropriateSkill.name}" attempted to execute but failed. Error: ${result.error}. Inform the user naturally that you tried to use this skill but hit an issue.`;
        }
      }

      // 2. Run the Companion Brain cognitive layer to construct the strategic instruction
      let { systemInstruction } = companionBrain.process(text, settings.userName, settings.assistantName);
      if (skillResultContext) {
        systemInstruction = `${systemInstruction}${skillResultContext}`;
      }

      // 3. Fetch history from the conversation context (not including the current turn)
      const history = conversationContext.getHistory();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userName: settings.userName,
          assistantName: settings.assistantName,
          model: settings.geminiModel,
          systemInstruction,
          history,
          currentGoal
        })
      });

      if (!response.ok) {
        throw new Error('Server responded with an error');
      }

      const data = await response.json();
      
      // Update goal in context and local state
      if (data.updatedGoal) {
        conversationContext.setCurrentGoal(data.updatedGoal);
        window.dispatchEvent(new CustomEvent('airi-goal-updated', { detail: data.updatedGoal }));
      }

      // Update response plan in context and dispatch event
      if (data.responsePlan) {
        conversationContext.setCurrentResponsePlan(data.responsePlan);
        window.dispatchEvent(new CustomEvent('airi-response-plan-updated', { detail: data.responsePlan }));
      }
      
      // 3. Parse reasoning block and final reply
      const { finalReply, suggestedState } = promptBuilder.parseResponse(data.text);

      // 4. Record successful conversational turns in our persistent history context
      conversationContext.addTurn('user', text);
      conversationContext.addTurn('assistant', finalReply);

      // Asynchronously trigger automatic memory extraction in the background
      fetch('/api/memory/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, reply: finalReply })
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Memory extract failed');
      })
      .then(async (extracted) => {
        if (extracted && extracted.shouldRemember && extracted.content) {
          const { category, title, content, importance } = extracted;
          await memoryManager.addMemory({
            category: category || 'Custom',
            title: title || 'Extracted Fact',
            content: content,
            importance: typeof importance === 'number' ? importance : 5,
            source: 'automatic'
          });
          // Dispatch a custom event to notify Memory settings UI if it's open
          window.dispatchEvent(new CustomEvent('airi-memory-updated'));
        }
      })
      .catch(err => console.warn('Automatic memory extraction error (safe to ignore):', err));

      // Map AI suggested brain state to dynamic behaviors
      let targetIntent = 'answer_question';
      if (suggestedState === 'happy') targetIntent = 'congratulate_user';
      else if (suggestedState === 'wave') targetIntent = 'greet_user';
      else if (suggestedState === 'listening') targetIntent = 'apologize';

      // Execute behavior sequence via Behavior Planner
      await behaviorPlanner.executeIntent(targetIntent);
      
      // Read reply aloud
      triggerSpeak(finalReply);

    } catch (err) {
      console.error('Error contacting chat brain endpoint:', err);
      stateMachine.transitionTo(AiriState.SLEEPING, 4000);
      triggerSpeak(`Oh no! I lost my connection to the matrix for a second... Can you say that again, ${settings.userName || 'friend'}?`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <div
      id="root-game-container"
      className="relative w-screen h-screen overflow-hidden text-white font-sans transition-opacity duration-500 bg-slate-950"
    >
      {/* 1. MASTER GAME RENDERER LAYER (Scene) */}
      <Scene settings={settings} />

      {/* 2. CHACTER LAYER WITH SPRITES & EXPRESSIVE ANIMATIONS */}
      <Character avatarUrl="/assets/characters/airi/girl.png" animationSpeed={settings.voiceSpeed} />

      {/* 3. FLOATING UI GADGETS */}
      {/* Top Bar Controllers */}
      <div id="top-hologram-header" className="absolute top-6 left-6 right-6 flex justify-between items-center z-20 pointer-events-none">
        {/* Top Left Menu triggers overlay help */}
        <button
          id="menu-trigger-button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-3 bg-black/45 hover:bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl pointer-events-auto text-white/80 hover:text-pink-400 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand name and Active Goal Display */}
        <div className="flex flex-col md:flex-row md:items-center gap-2.5 max-w-[60%]">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/5 rounded-full select-none shrink-0 w-fit">
            <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
            <span className="font-sans font-bold text-xs tracking-widest text-white/90 uppercase">{settings.assistantName} Desktop</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-500/10 backdrop-blur-xl border border-pink-500/20 rounded-full select-none text-[10px] text-pink-300 w-fit pointer-events-auto hover:bg-pink-500/15 transition-colors cursor-help" title="Active conversation goal tracking">
            <Target className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            <span className="font-bold text-white/40 tracking-wider uppercase text-[8px]">Active Goal:</span>
            <span className="font-medium tracking-tight text-white/80 line-clamp-1">{currentGoal}</span>
          </div>
        </div>

        {/* Top Right System Settings */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Quick launch Veo Animation Studio */}
          <button
            id="veo-studio-trigger-button"
            onClick={() => setIsStudioOpen(true)}
            className="p-3 bg-black/45 hover:bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl text-white/80 hover:text-pink-400 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg cursor-pointer"
            title="Launch Veo Animation Studio"
          >
            <Film className="w-5 h-5" />
          </button>
          
          {/* Quick pin visual */}
          <div className="p-3 bg-black/45 backdrop-blur-xl border border-white/10 rounded-xl text-white/40">
            <Pin className="w-4 h-4" />
          </div>
          <button
            id="settings-trigger-button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 bg-black/45 hover:bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl text-white/80 hover:text-pink-400 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg cursor-pointer"
          >
            <SettingsIcon className="w-5 h-5 animate-spin-slow" />
          </button>
        </div>
      </div>

      {/* FLOATING SPEECH BUBBLE (Response Output) */}
      <FloatingSpeechBubble
        text={activeSpeech}
        isVoiceActive={isSpeaking}
        onClose={() => {
          setActiveSpeech('');
          if (window.speechSynthesis) window.speechSynthesis.cancel();
          stateMachine.transitionTo(AiriState.IDLE);
        }}
      />

      {/* HOVER SLIDING CHAT INPUT BAR */}
      <ChatBar
        onSubmit={handleSendMessage}
        isRecording={isRecording}
        onToggleRecord={handleToggleRecord}
        isGenerating={isGenerating}
        isLiveActive={isLiveActive}
        liveState={liveState}
        onToggleLive={handleToggleLive}
      />

      {/* SYSTEM SETTINGS OVERLAY SLIDE */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsPanel
            settings={settings}
            onUpdate={handleUpdateSettings}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* VEO ANIMATION STUDIO PANEL */}
      <AnimatePresence>
        {isStudioOpen && (
          <AnimationStudio
            onClose={() => setIsStudioOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* LEFT DRAWER: CONTROLS & MANUAL SEED MENU */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex z-30 pointer-events-auto">
            <div className="flex-1" onClick={() => setIsMenuOpen(false)} />
            <motion.div
              id="help-drawer"
              initial={{ x: -350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -350, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 150 }}
              className="w-full max-w-[320px] h-full bg-black/85 backdrop-blur-3xl border-r border-white/10 p-6 flex flex-col gap-6"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <span className="font-sans font-bold text-sm text-pink-400 tracking-wider uppercase">Companion Manual</span>
                <button
                  id="close-menu-button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 rounded-full text-white/40 hover:text-white"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-4 text-sm leading-relaxed text-white/70 overflow-y-auto">
                <p>
                  Airi is a reactive desktop companion built with a Visual Novel game engine methodology. Every behavior is event-driven.
                </p>

                <div className="flex flex-col gap-3 mt-2">
                  <div className="text-[11px] font-bold text-pink-400 tracking-wider uppercase">Hotkeys & Actions</div>
                  
                  <div className="flex items-center gap-2.5">
                    <span className="bg-white/10 text-white border border-white/10 px-2 py-0.5 rounded text-[11px] font-mono">Move Cursor</span>
                    <span className="text-xs">Follows eye contact</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="bg-white/10 text-white border border-white/10 px-2 py-0.5 rounded text-[11px] font-mono">Hover Bottom</span>
                    <span className="text-xs">Opens interactive chat bar</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="bg-white/10 text-white border border-white/10 px-2 py-0.5 rounded text-[11px] font-mono">ESC</span>
                    <span className="text-xs">Hides active input fields</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  <div className="text-[11px] font-bold text-pink-400 tracking-wider uppercase">Manual State Triggers</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Wave Greeting', state: AiriState.WAVE },
                      { label: 'Think Mode', state: AiriState.THINKING },
                      { label: 'Celebrate', state: AiriState.HAPPY },
                      { label: 'Deep Sleep', state: AiriState.SLEEPING },
                      { label: 'Idle Rest', state: AiriState.IDLE }
                    ].map((btn) => (
                      <button
                        key={btn.state}
                        onClick={() => {
                          stateMachine.transitionTo(btn.state, btn.state !== AiriState.IDLE ? 3000 : undefined);
                          if (btn.state === AiriState.HAPPY) {
                            triggerSpeak("Yay! That makes me so happy! Thank you, " + settings.userName + "!");
                          } else if (btn.state === AiriState.WAVE) {
                            triggerSpeak("Mwah! Hello there, " + settings.userName + "! I am waving to you!");
                          }
                          setIsMenuOpen(false);
                        }}
                        className="py-2 px-3 rounded bg-white/5 hover:bg-pink-500 hover:text-white border border-white/5 transition-all text-left text-[11px] font-semibold"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 text-[10px] text-white/30 font-mono">
                  Engine Link: 127.0.0.1:8000
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Small inline Helper X icon to prevent importing extraneous packages
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
