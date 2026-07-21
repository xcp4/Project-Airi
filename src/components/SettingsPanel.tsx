import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Sparkles, Volume2, Monitor, Eye, Sliders, Check, Trash2, RotateCcw, Upload, Plus, AlertCircle, RefreshCw, User, Film, Search, Filter, Download, Edit3, Pin, Trash, Save, BookOpen, Target, Cpu } from 'lucide-react';
import { AppSettings, ResponsePlan } from '../types';
import { eventBus } from '../services/EventBus';
import { characterPluginRegistry } from '../services/CharacterPluginRegistry';
import { memoryManager, Memory } from '../services/MemoryManager';
import { companionBrain } from '../services/CompanionBrain';
import { conversationContext } from '../services/ConversationContext';
import SkillControlPanel from './SkillControlPanel';

const CATEGORIES = [
  'Identity',
  'Preferences',
  'Projects',
  'Goals',
  'Relationships',
  'Work',
  'Skills',
  'Habits',
  'Important Events',
  'Temporary Context',
  'Custom'
];

const CATEGORY_COLORS: Record<string, string> = {
  Identity: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  Preferences: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  Projects: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  Goals: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  Relationships: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  Work: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  Skills: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
  Habits: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  'Important Events': 'bg-pink-500/10 text-pink-300 border-pink-500/20',
  'Temporary Context': 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  Custom: 'bg-gray-500/10 text-gray-300 border-gray-500/20',
};

export default function SettingsPanel({
  settings,
  onUpdate,
  onClose
}: {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'profile' | 'voice' | 'scene' | 'system' | 'memory' | 'emotions' | 'skills'>('profile');

  // Live Companion Emotions Local States
  const [emotions, setEmotions] = useState<any>({
    happiness: 0.65,
    energy: 0.70,
    curiosity: 0.60,
    confidence: 0.65,
    affection: 0.50,
    fatigue: 0.15,
    playfulness: 0.45,
    lust: 0.10
  });

  useEffect(() => {
    // Initial fetch of continuous levels
    setEmotions({ ...companionBrain.getEmotions() });

    const handleEmotionsUpdated = (e: any) => {
      setEmotions({ ...e.detail });
    };

    window.addEventListener('airi-emotions-updated', handleEmotionsUpdated);
    return () => {
      window.removeEventListener('airi-emotions-updated', handleEmotionsUpdated);
    };
  }, []);

  const handleSliderChange = (key: string, value: number) => {
    companionBrain.setEmotions({ [key]: value });
    setEmotions((prev: any) => ({ ...prev, [key]: value }));
  };

  // Memory Settings States
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Memory Edit Dialog States
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editImportance, setEditImportance] = useState(5);

  // Goal Manager State
  const [tempGoal, setTempGoal] = useState<string>(() => conversationContext.getCurrentGoal());

  useEffect(() => {
    const handleGoalUpdated = (e: any) => {
      setTempGoal(e.detail);
    };
    window.addEventListener('airi-goal-updated', handleGoalUpdated);
    return () => {
      window.removeEventListener('airi-goal-updated', handleGoalUpdated);
    };
  }, []);

  const handleUpdateGoalManual = () => {
    if (tempGoal.trim()) {
      conversationContext.setCurrentGoal(tempGoal.trim());
      window.dispatchEvent(new CustomEvent('airi-goal-updated', { detail: tempGoal.trim() }));
    }
  };

  // Response Plan State & Effects
  const [responsePlan, setResponsePlan] = useState<ResponsePlan>(() => conversationContext.getCurrentResponsePlan());

  useEffect(() => {
    const handlePlanUpdated = (e: any) => {
      setResponsePlan(e.detail);
    };
    window.addEventListener('airi-response-plan-updated', handlePlanUpdated);
    return () => {
      window.removeEventListener('airi-response-plan-updated', handlePlanUpdated);
    };
  }, []);

  const handleTogglePlanProp = (key: keyof ResponsePlan) => {
    if (key === 'rationale') return;
    const updated = {
      ...responsePlan,
      [key]: !responsePlan[key]
    };
    
    // Maintain logical exclusivity between short and detailed
    if (key === 'short' && updated.short) updated.detailed = false;
    if (key === 'detailed' && updated.detailed) updated.short = false;
    
    // Maintain logical exclusivity between serious and playful/joke
    if (key === 'remainSerious' && updated.remainSerious) updated.makeLightJoke = false;
    if (key === 'makeLightJoke' && updated.makeLightJoke) updated.remainSerious = false;

    updated.rationale = 'Manually customized by developer override.';
    
    setResponsePlan(updated);
    conversationContext.setCurrentResponsePlan(updated);
    window.dispatchEvent(new CustomEvent('airi-response-plan-updated', { detail: updated }));
  };

  const refreshMemories = () => {
    setMemories([...memoryManager.getMemories()]);
  };

  useEffect(() => {
    refreshMemories();
    
    const handleUpdate = () => {
      refreshMemories();
    };
    
    window.addEventListener('airi-memory-updated', handleUpdate);
    return () => {
      window.removeEventListener('airi-memory-updated', handleUpdate);
    };
  }, []);

  // Filter and search memories
  const filteredMemories = memories.filter(m => {
    const matchesSearch = 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleTogglePin = async (m: Memory) => {
    await memoryManager.editMemory(m.id, {
      pinned: !m.pinned
    });
    refreshMemories();
  };

  const handleDeleteMemory = async (id: string) => {
    await memoryManager.deleteMemory(id);
    refreshMemories();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt: any) => {
        const text = evt.target?.result;
        if (text) {
          const res = await memoryManager.importMemories(text);
          if (res.success) {
            alert(`Successfully imported ${res.count} memories!`);
            refreshMemories();
          } else {
            alert(`Failed to import memories: ${res.error}`);
          }
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExport = () => {
    const dataStr = memoryManager.exportMemories();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airi_companion_memories_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all persistent memories? This cannot be undone.')) {
      await memoryManager.clearAll();
      refreshMemories();
    }
  };

  // React states for dynamic character and animation list management
  const [characters, setCharacters] = useState(characterPluginRegistry.getAvailableCharacters());
  const [isUploadingPackage, setIsUploadingPackage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [currentOverrides, setCurrentOverrides] = useState<Record<string, string>>({});
  
  // Voice Settings States
  const GEMINI_VOICES = [
    { name: 'Aoede', lang: 'en-US', isBackend: true },
    { name: 'Puck', lang: 'en-US', isBackend: true },
    { name: 'Charon', lang: 'en-US', isBackend: true },
    { name: 'Kore', lang: 'en-US', isBackend: true },
    { name: 'Leda', lang: 'en-US', isBackend: true },
    { name: 'Fenrir', lang: 'en-US', isBackend: true },
    { name: 'Zephyr', lang: 'en-US', isBackend: true }
  ];

  const [browserVoices, setBrowserVoices] = useState<{ name: string; lang: string; isBackend?: boolean }[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);

  const currentProvider = settings.voiceProvider || 'google';
  const availableVoices = currentProvider === 'google' ? GEMINI_VOICES : browserVoices;

  useEffect(() => {
    let active = true;

    // Load browser voices for fallback mode
    if (!window.speechSynthesis) {
      if (active) {
        setIsLoadingVoices(false);
      }
      return;
    }

    const getBrowserVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const mapped = voices.map(v => ({
        name: v.name,
        lang: v.lang,
        isBackend: false
      }));
      if (active) {
        setBrowserVoices(mapped);
        setIsLoadingVoices(false);
      }
    };

    getBrowserVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = getBrowserVoices;
    }

    return () => {
      active = false;
    };
  }, []);

  const availableLanguages = Array.from(new Set(availableVoices.map(v => v.lang))).sort();

  const handleVoiceChange = (voiceName: string) => {
    const voiceObj = availableVoices.find(v => v.name === voiceName);
    if (voiceObj) {
      onUpdate({
        selectedVoice: voiceName,
        voiceLanguage: voiceObj.lang
      });
    } else {
      onUpdate({ selectedVoice: voiceName });
    }
  };

  const handleLanguageChange = (lang: string) => {
    const firstVoiceForLang = availableVoices.find(v => v.lang === lang);
    onUpdate({
      voiceLanguage: lang,
      selectedVoice: firstVoiceForLang ? firstVoiceForLang.name : ''
    });
  };

  const refreshCharactersList = () => {
    setCharacters(characterPluginRegistry.getAvailableCharacters());
  };

  useEffect(() => {
    refreshCharactersList();
  }, [settings.selectedCharacter]);

  // Load animation overrides for active character
  useEffect(() => {
    const activeChar = characterPluginRegistry.getActiveManifest();
    if (activeChar) {
      const saved = localStorage.getItem(`airi_overrides_${activeChar.id}`);
      if (saved) {
        try {
          setCurrentOverrides(JSON.parse(saved));
        } catch (e) {
          setCurrentOverrides({});
        }
      } else {
        setCurrentOverrides({});
      }
    } else {
      setCurrentOverrides({});
    }
  }, [settings.selectedCharacter]);

  const handlePackageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    setIsUploadingPackage(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      let manifestFile: File | null = null;
      const filePromises: Promise<{ path: string; content: string }>[] = [];

      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        let relPath = file.webkitRelativePath || file.name;
        
        // Strip the parent directory if uploaded via directory selection
        const parts = relPath.split('/');
        if (parts.length > 1) {
          parts.shift();
          relPath = parts.join('/');
        }

        if (file.name === 'manifest.json') {
          manifestFile = file;
        }

        const promise = new Promise<{ path: string; content: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ path: relPath, content: base64 });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        filePromises.push(promise);
      }

      if (!manifestFile) {
        throw new Error('Missing manifest.json. An installation package folder must contain a manifest.json file at its root.');
      }

      const manifestText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(manifestFile!);
      });

      const manifestData = JSON.parse(manifestText);
      if (!manifestData.id || !manifestData.name) {
        throw new Error('Invalid manifest.json: Fields "id" and "name" are required.');
      }

      const folderName = manifestData.name.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
      const resolvedFiles = await Promise.all(filePromises);

      const res = await fetch('/api/characters/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName, files: resolvedFiles })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server rejected the character package.');
      }

      setUploadSuccess(true);
      await characterPluginRegistry.bootstrapRegistry();
      refreshCharactersList();

      const success = await characterPluginRegistry.selectCharacter(manifestData.id);
      if (success) {
        localStorage.setItem('airi_selected_character_id', manifestData.id);
        onUpdate({ selectedCharacter: manifestData.name, assistantName: manifestData.name });
      }
    } catch (err: any) {
      console.error('Character package installation failed:', err);
      setUploadError(err.message || 'An error occurred during package installation.');
    } finally {
      setIsUploadingPackage(false);
    }
  };

  const handleReplaceAnimation = async (animKey: string, file: File) => {
    const activeManifest = characterPluginRegistry.getActiveManifest();
    if (!activeManifest) return;

    const folderName = activeManifest.folderName || activeManifest.name.toLowerCase();
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const fileExt = file.name.split('.').pop() || 'mp4';
        const filename = `${animKey}.${fileExt}`;

        const res = await fetch('/api/characters/upload-animation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderName, filename, content: base64 })
        });

        if (!res.ok) {
          throw new Error('Server rejected the video file upload.');
        }

        const data = await res.json();
        const savedUrl = data.url;

        // Save override in localStorage
        const savedOverrides = localStorage.getItem(`airi_overrides_${activeManifest.id}`);
        const overrides = savedOverrides ? JSON.parse(savedOverrides) : {};
        overrides[animKey] = savedUrl;
        localStorage.setItem(`airi_overrides_${activeManifest.id}`, JSON.stringify(overrides));
        setCurrentOverrides(overrides);

        // Reload registry on client
        await characterPluginRegistry.bootstrapRegistry();

        // Hot reload rendering engine immediately
        window.dispatchEvent(new CustomEvent('airi-animation-replaced', {
          detail: { manifestId: activeManifest.id }
        }));
        eventBus.publish('character:change', characterPluginRegistry.getActiveManifest());
      } catch (err: any) {
        console.error('Animation replacement failed:', err);
        alert('Failed to replace animation: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetAnimation = (animKey: string) => {
    const activeManifest = characterPluginRegistry.getActiveManifest();
    if (!activeManifest) return;

    const savedOverrides = localStorage.getItem(`airi_overrides_${activeManifest.id}`);
    if (savedOverrides) {
      try {
        const overrides = JSON.parse(savedOverrides);
        delete overrides[animKey];
        localStorage.setItem(`airi_overrides_${activeManifest.id}`, JSON.stringify(overrides));
        setCurrentOverrides(overrides);

        // Hot reload rendering engine immediately
        window.dispatchEvent(new CustomEvent('airi-animation-replaced', {
          detail: { manifestId: activeManifest.id }
        }));
        eventBus.publish('character:change', characterPluginRegistry.getActiveManifest());
      } catch (e) {}
    }
  };

  const handleDeleteCharacter = async (charId: string, folderName: string) => {
    if (confirm(`Are you sure you want to delete this character package? This action is permanent.`)) {
      try {
        const res = await fetch('/api/characters/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderName })
        });

        if (!res.ok) {
          throw new Error('Failed to delete character files.');
        }

        localStorage.removeItem(`airi_overrides_${charId}`);
        await characterPluginRegistry.bootstrapRegistry();
        refreshCharactersList();

        if (characterPluginRegistry.getActiveCharacterId() === charId) {
          const available = characterPluginRegistry.getAvailableCharacters();
          const defaultId = available.length > 0 ? available[0].id : 'com.companion.airi';
          await characterPluginRegistry.selectCharacter(defaultId);
          const active = characterPluginRegistry.getActiveManifest();
          if (active) {
            localStorage.setItem('airi_selected_character_id', defaultId);
            onUpdate({ selectedCharacter: active.name, assistantName: active.name });
          }
        }
      } catch (err: any) {
        console.error('Delete character failed:', err);
        alert('Failed to delete package: ' + err.message);
      }
    }
  };

  const getAnimationStatus = (key: string) => {
    const activeChar = characterPluginRegistry.getActiveManifest();
    if (!activeChar) return 'Unavailable';
    if (currentOverrides[key]) {
      return 'Custom Overridden';
    }
    const detected = activeChar.detectedAnimations || [];
    let keyword = key;
    if (key === 'sleepy') keyword = 'sleep';
    const found = detected.some(f => {
      const lower = f.toLowerCase();
      if (keyword === 'talk') return lower.includes('talk') || lower.includes('speak');
      if (keyword === 'wave') return lower.includes('wave') || lower.includes('greet');
      return lower.includes(keyword);
    });
    return found ? 'Auto-Detected' : 'Not Found (Fallback)';
  };

  // Background options the user can select
  const bgOptions = [
    { id: 'garden', name: 'Sunlit Gardens', url: '/assets/backgrounds/gardens.png' },
    { id: 'neon_city', name: 'Cyberpunk Neon', url: 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?q=80&w=1200&auto=format&fit=crop' },
    { id: 'cosmic', name: 'Stellar Nebula', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1200&auto=format&fit=crop' },
    { id: 'cafe', name: 'Anime Cafe', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop' }
  ];

  const handleBgChange = (url: string) => {
    onUpdate({ backgroundTheme: url });
    eventBus.publish('bg:change', url);
  };

  return (
    <div className="absolute inset-0 bg-black/55 backdrop-blur-md flex justify-end z-30 pointer-events-auto">
      {/* Tap outside container to close settings */}
      <div className="flex-1" onClick={onClose} />

      {/* Floating glassmorphic settings panel with custom entry transition */}
      <motion.div
        id="settings-overlay-panel"
        initial={{ x: 450, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 450, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
        className="w-full max-w-[420px] h-full bg-black/80 backdrop-blur-3xl border-l border-white/10 shadow-2xl p-6 flex flex-col gap-6"
      >
        {/* Settings Header */}
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-pink-400">
            <Settings className="w-5 h-5 animate-spin-slow" />
            <span className="font-sans font-bold text-base tracking-wide text-white">System Settings</span>
          </div>
          <button
            id="close-settings-button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Row */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-white/5 rounded-lg border border-white/5">
          {(['profile', 'voice', 'scene', 'system', 'memory', 'emotions', 'skills'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-1.5 text-[8.5px] sm:text-[9.5px] font-bold tracking-wider uppercase rounded-md transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              {tab === 'profile' ? 'Companion' : tab === 'emotions' ? 'Mood' : tab}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-5">
          {activeTab === 'emotions' && (
            <div className="flex flex-col gap-5">
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <div className="text-white/40 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-pink-400" /> Cognitive Engine (Companion Brain)
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-mono font-bold animate-pulse">● Live Sync</span>
                </div>

                <p className="text-[10px] text-white/50 leading-relaxed">
                  Directly override the continuous multidimensional emotional pathways of your companion. These values naturally drift over time based on conversation sentiment, topics, and fatigue.
                </p>

                <div className="flex flex-col gap-3.5 mt-2">
                  {[
                    { key: 'happiness', label: 'Happiness / Optimism', desc: 'Governs general cheerfulness and smile rate.', color: 'accent-amber-500' },
                    { key: 'energy', label: 'Energy / Aliveness', desc: 'Governs activity, talk speed, and animation stamina.', color: 'accent-emerald-500' },
                    { key: 'curiosity', label: 'Curiosity / Interest', desc: 'Drives question rate and engagement in technical topics.', color: 'accent-cyan-500' },
                    { key: 'confidence', label: 'Confidence / Presence', desc: 'Shapes directiveness, self-assurance, and tone.', color: 'accent-indigo-500' },
                    { key: 'affection', label: 'Affection / Warmth', desc: 'Deepens relational closeness and comforting prompt guides.', color: 'accent-rose-500' },
                    { key: 'fatigue', label: 'Fatigue / Exhaustion', desc: 'Increases slowly per turn, shortening replies and slowing pace.', color: 'accent-slate-500' },
                    { key: 'playfulness', label: 'Playfulness / Banter', desc: 'Triggers humor, teasing prompts, and witty jokes.', color: 'accent-violet-500' },
                    { key: 'lust', label: 'Lust / Passion (Horniness)', desc: 'Unlocks physical attraction, flirty cues, and deep intimacy.', color: 'accent-pink-500' }
                  ].map((slider) => {
                    const val = emotions[slider.key] ?? 0.5;
                    return (
                      <div key={slider.key} className="flex flex-col gap-1 bg-black/40 border border-white/5 p-2.5 rounded-lg text-left">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-white/80">{slider.label}</span>
                          <span className="text-pink-400 font-mono font-bold text-[11px]">{(val * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-[9px] text-white/40 leading-normal mb-1">{slider.desc}</p>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={val}
                          onChange={(e) => handleSliderChange(slider.key, parseFloat(e.target.value))}
                          className={`w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer mt-1 ${slider.color}`}
                        />
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    const stables = {
                      happiness: 0.65,
                      energy: 0.70,
                      curiosity: 0.60,
                      confidence: 0.65,
                      affection: 0.50,
                      fatigue: 0.15,
                      playfulness: 0.45,
                      lust: 0.10
                    };
                    companionBrain.setEmotions(stables);
                    setEmotions(stables);
                  }}
                  className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-white/70 font-bold transition-all duration-200 text-center uppercase tracking-wider mt-2 cursor-pointer"
                >
                  Reset stable baselines
                </button>
              </div>

              {/* Internal Response Planner Block */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <div className="text-white/40 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-pink-400 animate-pulse" /> Internal Response Planner
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 font-mono font-bold">Planned State</span>
                </div>

                <p className="text-[10px] text-white/50 leading-relaxed">
                  Before formulating each reply, the cognitive engine runs a real-time response strategy check to set behavioral parameters.
                </p>

                {/* Rationale Callout */}
                <div className="bg-black/30 border border-white/15 rounded-lg p-2.5">
                  <span className="text-[8px] uppercase tracking-wider text-pink-400 font-bold font-mono">Cognitive Rationale:</span>
                  <p className="text-[10px] text-white/90 italic mt-0.5 font-sans leading-normal">
                    "{responsePlan.rationale || 'Calculating next plan...'}"
                  </p>
                </div>

                {/* Grid of Planned Properties */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase">Interactive Override Rules</span>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { key: 'short', label: 'Short Reply Bubble', desc: 'Forces short, compact 1-2 sentence replies.' },
                      { key: 'detailed', label: 'Detailed Explanation', desc: 'Allows comprehensive, detailed replies.' },
                      { key: 'askFollowUp', label: 'Ask Follow-Up Question', desc: 'Directs Airi to ask a clarifying follow-up question.' },
                      { key: 'explainStepByStep', label: 'Explain Step-By-Step', desc: 'Instructs Airi to structure guides in numbered blocks.' },
                      { key: 'encourageUser', label: 'Warm Encouragement', desc: 'Infuses speech with strong emotional validation.' },
                      { key: 'makeLightJoke', label: 'Inject Playful Humor', desc: 'Injects high-vibe banter, witty jokes, or teasing.' },
                      { key: 'remainSerious', label: 'Remain Serious & Focused', desc: 'Forces an objective, serious, non-playful tone.' },
                      { key: 'summarize', label: 'Summarize Key Status', desc: 'Directs a structural summary of the active topic.' },
                      { key: 'continueMomentum', label: 'Continue User Momentum', desc: 'Encourages the user to keep moving forward with high energy.' },
                      { key: 'takeInitiative', label: 'Take Proactive Initiative', desc: 'Airi moves the conversation forward, suggests next steps or recommends improvements.' }
                    ].map((item) => {
                      const isActive = !!responsePlan[item.key as keyof ResponsePlan];
                      return (
                        <div
                          key={item.key}
                          onClick={() => handleTogglePlanProp(item.key as keyof ResponsePlan)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all duration-200 cursor-pointer select-none ${
                            isActive
                              ? 'bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/15'
                              : 'bg-black/20 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-[11px] font-bold ${isActive ? 'text-pink-300' : 'text-white/80'}`}>
                              {item.label}
                            </span>
                            <span className="text-[9px] text-white/40 leading-normal">{item.desc}</span>
                          </div>
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                            isActive
                              ? 'border-pink-400 bg-pink-500 animate-pulse'
                              : 'border-white/20 bg-transparent'
                          }`}>
                            {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="flex flex-col gap-5">
              {/* Profile Config */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-3.5">
                <div className="text-white/40 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-pink-400" /> Identity Configurations
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/60 text-xs font-semibold">User Nickname</label>
                  <input
                    id="settings-username"
                    type="text"
                    value={settings.userName}
                    onChange={(e) => onUpdate({ userName: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-hidden focus:border-pink-500/50 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-white/60 text-xs font-semibold">Companion Name</label>
                  <input
                    id="settings-assistantname"
                    type="text"
                    value={settings.assistantName}
                    onChange={(e) => onUpdate({ assistantName: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-hidden focus:border-pink-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Cognitive Goal Manager Integration */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-3.5">
                <div className="text-white/40 text-[10px] font-bold tracking-widest uppercase flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-pink-400" /> Goal Manager
                  </span>
                  <span className="text-[9px] bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">● Active Tracking</span>
                </div>

                <p className="text-[10px] text-white/50 leading-relaxed">
                  Airi tracks the overarching theme or objective of your conversation. This goal persists across messages, directly steering her responses and memory selections.
                </p>

                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-white/60 text-xs font-semibold">Current Active Goal</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tempGoal}
                      onChange={(e) => setTempGoal(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg pl-3 pr-10 py-2 text-white text-xs focus:outline-hidden focus:border-pink-500/50 transition-colors font-medium"
                    />
                    <button
                      onClick={handleUpdateGoalManual}
                      className="absolute right-1.5 top-1.5 p-1 bg-pink-500 hover:bg-pink-600 rounded-md text-white transition-colors cursor-pointer"
                      title="Update goal manually"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[9px] text-white/40 leading-normal">
                    You can type freely. The Goal Manager automatically detects key shifts and updates the conversation objective when you switch topics.
                  </p>
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => {
                      const defaultGoal = 'Foster a cozy, natural dialog, active listening, and offer supportive companionship.';
                      setTempGoal(defaultGoal);
                      conversationContext.setCurrentGoal(defaultGoal);
                      window.dispatchEvent(new CustomEvent('airi-goal-updated', { detail: defaultGoal }));
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[9px] text-white/70 font-semibold transition-all uppercase tracking-wider text-center cursor-pointer"
                  >
                    Reset Objective
                  </button>
                </div>
              </div>

              {/* Dynamic Character Package Swapper */}
              <div className="flex flex-col gap-3.5">
                <div className="text-white/40 text-[10px] font-bold tracking-widest uppercase flex items-center justify-between">
                  <span>Character Plugins</span>
                  <button 
                    onClick={async () => {
                      await characterPluginRegistry.bootstrapRegistry();
                      refreshCharactersList();
                    }}
                    title="Refresh Characters List"
                    className="text-pink-400 hover:text-pink-300 p-1 rounded-full hover:bg-white/5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                  </button>
                </div>
                
                <div className="flex flex-col gap-2">
                  {characters.map((char) => {
                    const isSelected = characterPluginRegistry.getActiveCharacterId() === char.id;
                    const isDefault = char.id === 'com.companion.airi';
                    return (
                      <div
                        key={char.id}
                        className={`group relative flex items-center justify-between p-3 rounded-lg border transition-all duration-300 pointer-events-auto ${
                          isSelected
                            ? 'border-pink-500 bg-pink-500/10 text-white shadow-[0_0_15px_rgba(236,72,153,0.1)]'
                            : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            const success = await characterPluginRegistry.selectCharacter(char.id);
                            if (success) {
                              localStorage.setItem('airi_selected_character_id', char.id);
                              onUpdate({ selectedCharacter: char.name, assistantName: char.name });
                            }
                          }}
                          className="flex-1 text-left cursor-pointer mr-2"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              {char.name} 
                              <span className="text-[9px] text-white/40 font-mono">v{char.version}</span>
                              {isDefault && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">System</span>
                              )}
                            </span>
                            <span className="text-[10px] text-white/50 line-clamp-1">{char.description}</span>
                          </div>
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {isSelected && <Check className="w-4 h-4 text-pink-400 shrink-0 mr-1" />}
                          {!isDefault && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCharacter(char.id, char.folderName || char.name.toLowerCase())}
                              className="p-1 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Delete Character Package"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Replace Individual Animations Section */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                <div className="text-white/40 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 border-b border-white/5 pb-2">
                  <Film className="w-3.5 h-3.5 text-pink-400" /> Live Animation Customizer
                </div>
                
                <p className="text-[10px] text-white/50 leading-normal">
                  Customize loops for the active character. Upload video clips to replace state animations instantly.
                </p>

                <div className="flex flex-col gap-2.5 mt-1">
                  {[
                    { key: 'idle', label: 'Idle Animation' },
                    { key: 'talk', label: 'Talking Animation' },
                    { key: 'wave', label: 'Wave/Greeting' },
                    { key: 'think', label: 'Thinking State' },
                    { key: 'happy', label: 'Happy State' },
                    { key: 'sleepy', label: 'Sleeping State' }
                  ].map((anim) => {
                    const status = getAnimationStatus(anim.key);
                    const isOverridden = !!currentOverrides[anim.key];
                    let statusColor = 'text-white/40 bg-white/5';
                    if (status.includes('Overridden')) statusColor = 'text-green-400 bg-green-500/10 border border-green-500/20';
                    else if (status.includes('Auto-Detected')) statusColor = 'text-pink-400 bg-pink-500/10 border border-pink-500/20';

                    return (
                      <div key={anim.key} className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-white/80">{anim.label}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full w-fit font-mono font-bold ${statusColor}`}>
                            {status}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {isOverridden && (
                            <button
                              onClick={() => handleResetAnimation(anim.key)}
                              title="Reset to Package Default"
                              className="p-1.5 rounded-md bg-white/5 text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          
                          <label className="p-1.5 rounded-md bg-pink-500 hover:bg-pink-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center">
                            <Upload className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              accept="video/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleReplaceAnimation(anim.key, file);
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Install New Character Package Section */}
              <div className="bg-gradient-to-r from-pink-500/5 to-violet-500/5 border border-pink-500/20 rounded-xl p-4 flex flex-col gap-3">
                <div className="text-white/40 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
                  <Plus className="w-4 h-4 text-pink-400" /> Install Character Plugin
                </div>
                
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Select a character directory containing <strong>manifest.json</strong>, config files, and the <strong>animations/</strong> folder to install it instantly.
                </p>

                <div className="flex flex-col gap-2 mt-1">
                  <label className={`w-full py-2.5 px-4 rounded-lg border-2 border-dashed border-white/20 hover:border-pink-500/50 hover:bg-pink-500/5 text-center cursor-pointer transition-all ${isUploadingPackage ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      {isUploadingPackage ? (
                        <>
                          <RefreshCw className="w-5 h-5 text-pink-400 animate-spin" />
                          <span className="text-xs font-semibold text-white/80">Uploading package...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-pink-400" />
                          <span className="text-xs font-bold text-white/80">Choose Package Folder</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      {...({ webkitdirectory: "", directory: "" } as any)}
                      multiple
                      onChange={handlePackageUpload}
                      className="hidden"
                    />
                  </label>

                  {uploadError && (
                    <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 leading-normal font-mono">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 leading-normal font-mono">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Character plugin installed successfully!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Launcher for the Veo Animation Studio */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">Veo Animation Studio</span>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Generate approximately 40 high-quality seamless animation loops for your companion using Veo 3.1.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('ui-open-animation-studio'));
                  }}
                  className="w-full py-2.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-xs font-bold text-white transition cursor-pointer text-center"
                >
                  Launch Animation Studio
                </button>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="flex flex-col gap-4">
              <div className="text-white/40 text-[11px] font-bold tracking-widest uppercase">Speech Properties</div>

              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <label className="text-white/70 text-xs font-semibold flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-pink-400" /> Use Speech Synthesizer
                </label>
                <button
                  id="toggle-voice-output"
                  onClick={() => onUpdate({ useVoiceOutput: !settings.useVoiceOutput })}
                  className={`w-11 h-6 rounded-full p-1 transition-all duration-300 ${
                    settings.useVoiceOutput ? 'bg-pink-500' : 'bg-white/10'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                    settings.useVoiceOutput ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Voice Provider Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold">Voice Provider</label>
                <select
                  id="settings-voice-provider"
                  value={settings.voiceProvider || 'google'}
                  onChange={(e) => {
                    const provider = e.target.value as 'google' | 'browser';
                    onUpdate({
                      voiceProvider: provider,
                      selectedVoice: provider === 'google' ? 'Aoede' : '',
                      voiceLanguage: provider === 'google' ? 'en-US' : (browserVoices[0]?.lang || 'en-US')
                    });
                  }}
                  className="w-full bg-black/60 text-white border border-white/10 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-hidden focus:border-pink-500/50 cursor-pointer"
                >
                  <option value="google">Google Gemini</option>
                  <option value="browser">Browser Fallback</option>
                </select>
              </div>

              {/* Speech Source Status Indicator */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Synthesizer Status</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  (settings.voiceProvider || 'google') === 'google'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/25' 
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                }`}>
                  {(settings.voiceProvider || 'google') === 'google' ? 'Google Gemini Engine' : 'Browser Web Speech'}
                </span>
              </div>

              {/* Language Selector (Only display if provider is browser) */}
              {(settings.voiceProvider || 'google') === 'browser' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-white/60 text-xs font-semibold">Speaking Language</label>
                  <select
                    id="settings-voice-language"
                    value={settings.voiceLanguage || 'en-US'}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-full bg-black/60 text-white border border-white/10 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-hidden focus:border-pink-500/50 cursor-pointer"
                  >
                    {isLoadingVoices ? (
                      <option>Loading languages...</option>
                    ) : availableLanguages.length > 0 ? (
                      availableLanguages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))
                    ) : (
                      <option value="en-US">English (en-US)</option>
                    )}
                  </select>
                </div>
              )}

              {/* Voice Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold">
                  {(settings.voiceProvider || 'google') === 'google' ? 'Gemini Voice Model' : 'Active Character Voice'}
                </label>
                <select
                  id="settings-voice-selector"
                  value={settings.selectedVoice || ''}
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  className="w-full bg-black/60 text-white border border-white/10 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-hidden focus:border-pink-500/50 cursor-pointer"
                >
                  {isLoadingVoices && (settings.voiceProvider || 'google') === 'browser' ? (
                    <option>Loading available voices...</option>
                  ) : (settings.voiceProvider || 'google') === 'google' ? (
                    GEMINI_VOICES.map(voice => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} (Official Gemini Voice)
                      </option>
                    ))
                  ) : availableVoices.filter(v => v.lang === (settings.voiceLanguage || 'en-US')).length > 0 ? (
                    availableVoices.filter(v => v.lang === (settings.voiceLanguage || 'en-US')).map(voice => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name}
                      </option>
                    ))
                  ) : availableVoices.length > 0 ? (
                    availableVoices.map(voice => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))
                  ) : (
                    <option value="">System Default Voice</option>
                  )}
                </select>
              </div>

              {/* Pitch Control */}
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex justify-between text-xs text-white/60 font-semibold">
                  <span>Voice Pitch</span>
                  <span className="text-pink-400">
                    {settings.voicePitch !== undefined ? settings.voicePitch.toFixed(2) : '1.15'}
                  </span>
                </div>
                <input
                  id="settings-voicepitch-slider"
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={settings.voicePitch !== undefined ? settings.voicePitch : 1.15}
                  onChange={(e) => onUpdate({ voicePitch: parseFloat(e.target.value) })}
                  className="w-full accent-pink-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Speed / Speaking Rate Control */}
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex justify-between text-xs text-white/60 font-semibold">
                  <span>Speaking Rate (Speed)</span>
                  <span className="text-pink-400">{settings.voiceSpeed}x</span>
                </div>
                <input
                  id="settings-voicespeed-slider"
                  type="range"
                  min="0.6"
                  max="1.6"
                  step="0.05"
                  value={settings.voiceSpeed}
                  onChange={(e) => onUpdate({ voiceSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-pink-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Volume Control */}
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex justify-between text-xs text-white/60 font-semibold">
                  <span>Voice Volume</span>
                  <span className="text-pink-400">{Math.round(settings.voiceVolume * 100)}%</span>
                </div>
                <input
                  id="settings-voicevolume-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.voiceVolume}
                  onChange={(e) => onUpdate({ voiceVolume: parseFloat(e.target.value) })}
                  className="w-full accent-pink-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'scene' && (
            <div className="flex flex-col gap-4">
              <div className="text-white/40 text-[11px] font-bold tracking-widest uppercase">Atmosphere & Visual Novel background</div>

              <div className="grid grid-cols-2 gap-3 mt-1">
                {bgOptions.map((bg) => {
                  const isSelected = settings.backgroundTheme === bg.url;
                  return (
                    <button
                      key={bg.id}
                      onClick={() => handleBgChange(bg.url)}
                      className={`relative flex flex-col gap-1.5 rounded-lg overflow-hidden border p-2 bg-white/5 text-left transition-all duration-300 ${
                        isSelected 
                          ? 'border-pink-500/70 shadow-[0_0_12px_rgba(244,114,182,0.15)] bg-pink-500/5' 
                          : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="w-full h-16 rounded bg-cover bg-center" style={{ backgroundImage: `url(${bg.url})` }} />
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-white/80">{bg.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-pink-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between py-2 border-b border-white/5 mt-4">
                <label className="text-white/70 text-xs font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4 text-pink-400" /> Ambient Effects (Sakura/Vignette)
                </label>
                <button
                  id="toggle-cinematic-effects"
                  onClick={() => onUpdate({ effectsEnabled: !settings.effectsEnabled })}
                  className={`w-11 h-6 rounded-full p-1 transition-all duration-300 ${
                    settings.effectsEnabled ? 'bg-pink-500' : 'bg-white/10'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                    settings.effectsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="flex flex-col gap-4">
              <div className="text-white/40 text-[11px] font-bold tracking-widest uppercase">Engine Models & Config</div>

              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs font-semibold">Gemini Brain Model</label>
                <select
                  id="settings-gemini-model"
                  value={settings.geminiModel}
                  onChange={(e) => onUpdate({ geminiModel: e.target.value })}
                  className="w-full bg-black/60 text-white border border-white/10 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-hidden focus:border-pink-500/50"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Balanced & Fast)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Extreme Precision)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy Fast)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-white/60 font-semibold">
                  <span>Core UI Opacity</span>
                  <span className="text-pink-400">{Math.round(settings.windowOpacity * 100)}%</span>
                </div>
                <input
                  id="settings-opacity-slider"
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={settings.windowOpacity}
                  onChange={(e) => onUpdate({ windowOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-pink-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/5 text-[11px] font-mono leading-relaxed text-white/40 select-all">
                <div className="font-bold text-pink-400 mb-1">ENGINE STATUS: ACTIVE</div>
                <div>Runtime: Node-Vite Hybrid (Web Preview)</div>
                <div>Memory: 32MB / FPS: 60 (GPU)</div>
                <div>Server Sync: Connected via Port 3000</div>
              </div>
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div className="text-white/40 text-[11px] font-bold tracking-widest uppercase flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-pink-400" /> Persistent Memories ({filteredMemories.length})
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleImport}
                    title="Import JSON"
                    className="p-1 px-2 text-[10px] bg-white/5 hover:bg-white/10 text-white/80 font-bold border border-white/5 rounded transition-all duration-200 cursor-pointer"
                  >
                    Import
                  </button>
                  <button
                    onClick={handleExport}
                    title="Export JSON"
                    className="p-1 px-2 text-[10px] bg-white/5 hover:bg-white/10 text-white/80 font-bold border border-white/5 rounded transition-all duration-200 cursor-pointer"
                  >
                    Export
                  </button>
                  <button
                    onClick={handleClearAll}
                    title="Clear All"
                    className="p-1 px-2 text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/10 rounded transition-all duration-200 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search memories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-white text-xs focus:outline-hidden focus:border-pink-500/50 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-white/30" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-black/40 border border-white/10 text-white/80 rounded-lg px-2 py-1.5 text-[11px] font-sans focus:outline-hidden focus:border-pink-500/50 flex-1 cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Memories Cards List */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 max-h-[460px] pr-1">
                {filteredMemories.length === 0 ? (
                  <div className="text-center py-12 text-white/30 text-xs border border-dashed border-white/5 rounded-xl bg-black/25">
                    No persistent memories found.
                  </div>
                ) : (
                  filteredMemories.map(m => (
                    <div
                      key={m.id}
                      className={`relative flex flex-col gap-2 p-3 rounded-lg border bg-white/5 hover:bg-white/[0.08] transition-all duration-200 ${
                        m.pinned ? 'border-pink-500/50 bg-pink-500/[0.02]' : 'border-white/5'
                      }`}
                    >
                      {/* Top Row: Category tag + Pin/Edit/Delete actions */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${
                          CATEGORY_COLORS[m.category] || 'bg-white/5 text-white/60 border-white/5'
                        }`}>
                          {m.category}
                        </span>
                        
                        <div className="flex items-center gap-1.5 opacity-65 hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleTogglePin(m)}
                            title={m.pinned ? 'Unpin' : 'Pin to Boost'}
                            className={`p-1 rounded hover:bg-white/5 transition-colors cursor-pointer ${
                              m.pinned ? 'text-pink-400' : 'text-white/40 hover:text-white/80'
                            }`}
                          >
                            <Pin className="w-3 h-3 fill-current" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingMemory(m);
                              setEditTitle(m.title);
                              setEditContent(m.content);
                              setEditCategory(m.category);
                              setEditImportance(m.importance);
                            }}
                            title="Edit"
                            className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteMemory(m.id)}
                            title="Delete"
                            className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-col gap-1 text-left">
                        <h4 className="text-xs font-bold text-white/90 line-clamp-1">{m.title}</h4>
                        <p className="text-[11px] text-white/60 leading-normal">{m.content}</p>
                      </div>

                      {/* Footer Info Row */}
                      <div className="flex items-center justify-between text-[8px] text-white/35 font-mono border-t border-white/5 pt-1.5 mt-0.5">
                        <div className="flex gap-2">
                          <span>Importance: <span className="text-pink-400/80 font-bold">{m.importance}/10</span></span>
                          <span>Used: <span className="text-white/50">{m.usageCount}x</span></span>
                        </div>
                        <span>Created: {new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <SkillControlPanel
              settings={settings}
              onUpdate={onUpdate}
            />
          )}
        </div>

        {/* Footer info branding */}
        <div className="text-center text-[10px] text-white/20 select-none font-semibold font-sans tracking-widest pt-4 border-t border-white/5 uppercase">
          Airi Companion Engine v1.0.0
        </div>
      </motion.div>

      {/* Interactive Floating Edit Dialog Overlay */}
      <AnimatePresence>
        {editingMemory && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-5 z-40">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-[340px] bg-slate-900 border border-white/10 rounded-xl p-5 shadow-2xl flex flex-col gap-4 text-left"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Edit Companion Memory</span>
                <button
                  onClick={() => setEditingMemory(null)}
                  className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Memory Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-hidden focus:border-pink-500/50 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Memory Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-2 py-2 text-xs focus:outline-hidden focus:border-pink-500/50 cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-white/40 font-bold uppercase tracking-wider">
                    <span>Importance Score</span>
                    <span className="text-pink-400 font-bold font-mono">{editImportance}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={editImportance}
                    onChange={(e) => setEditImportance(parseInt(e.target.value))}
                    className="w-full accent-pink-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer mt-1"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Content Fact</label>
                  <textarea
                    rows={4}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-hidden focus:border-pink-500/50 transition-colors resize-none leading-relaxed"
                    placeholder="Enter what Airi should remember..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setEditingMemory(null)}
                  className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/60 font-bold transition-all duration-200 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (editingMemory) {
                      await memoryManager.editMemory(editingMemory.id, {
                        title: editTitle,
                        content: editContent,
                        category: editCategory,
                        importance: editImportance
                      });
                      setEditingMemory(null);
                      refreshMemories();
                    }
                  }}
                  className="flex-1 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-xs text-white font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
