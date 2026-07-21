import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Film, Upload, Sparkles, Download, Play, RotateCw, Check, 
  AlertTriangle, Image as ImageIcon, Sliders, PlayCircle, HelpCircle
} from 'lucide-react';
import { eventBus } from '../services/EventBus';

interface AnimationPreset {
  id: string;
  name: string;
  category: 'Idles' | 'Conversational' | 'Expressions' | 'Actions';
  description: string;
  prompt: string;
  loopable: boolean;
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
  // IDLES (8)
  {
    id: 'Idle_Default',
    name: 'Idle Default',
    category: 'Idles',
    description: 'Serene breathing stand pose, gentle micro-motions.',
    prompt: 'Airi, pink hair anime girl in high-contrast pink dress, standing in a serene pose, looking directly at the viewer with a gentle, loving smile. Elegant soft breathing, hair swaying lightly, seamless looping video starting and ending in the exact same pose, clean design with solid background.',
    loopable: true
  },
  {
    id: 'Idle_Breathing',
    name: 'Idle Breathing',
    category: 'Idles',
    description: 'Rhythmic, natural chest breathing with hair sway.',
    prompt: 'Airi standing, eyes open, chest rising and falling slowly in a calm organic breathing cycle. Pink hair and dress sway gently, seamless loop starting and ending in the default stand pose, identical character artwork.',
    loopable: true
  },
  {
    id: 'Idle_Blink',
    name: 'Idle Blink',
    category: 'Idles',
    description: 'Natural eye blinking sequence during idling.',
    prompt: 'Airi standing, blinking her beautiful green eyes naturally once every few seconds. Seamless stand pose loop, identical hairstyle and clothes, maintaining pristine anime visual style.',
    loopable: true
  },
  {
    id: 'Idle_LookAround',
    name: 'Idle Look Around',
    category: 'Idles',
    description: 'Curious head turns looking left, right, then front.',
    prompt: 'Airi standing, gently turning her head to scan her surroundings with wide curious green eyes, then returning her gaze forward with a warm smile. Smooth seamless looping standing pose, identical proportions.',
    loopable: true
  },
  {
    id: 'Idle_ShiftWeight',
    name: 'Idle Shift Weight',
    category: 'Idles',
    description: 'Subtle weight shifting between feet with rustling dress.',
    prompt: 'Airi standing, softly shifting her weight from one leg to another, her long dress rustling slightly. Smooth seamless transition starting and ending in the same standing pose.',
    loopable: true
  },
  {
    id: 'Sleep',
    name: 'Sleep',
    category: 'Idles',
    description: 'Eyes closed peacefully with slow breathing nodes.',
    prompt: 'Airi standing, eyes closed peacefully, head nodding forward slightly, sleeping while standing. Soft breathing motion, seamless loop returning to initial pose.',
    loopable: true
  },
  {
    id: 'Relax',
    name: 'Relax',
    category: 'Idles',
    description: 'Taking a peaceful deep breath with relaxed shoulders.',
    prompt: 'Airi standing, taking a deep, satisfying breath, closing her eyes as a warm gentle aura sways around her. Peaceful seamless loop, starting and ending in identical pose.',
    loopable: true
  },
  {
    id: 'Waiting',
    name: 'Waiting',
    category: 'Idles',
    description: 'Waiting patiently, tapping foot slightly.',
    prompt: 'Airi standing, tapping her foot gently and crossing her arms with a soft, playful wait expression. Seamless stand pose transition.',
    loopable: true
  },

  // CONVERSATIONAL (7)
  {
    id: 'Listening',
    name: 'Listening',
    category: 'Conversational',
    description: 'Deep attentive listening with gentle sympathetic tilts.',
    prompt: 'Airi standing, head slightly tilted, eyes warm and attentive. Nodding occasionally as if listening with deep care and sympathy. Pink hair swaying, seamless stand loop.',
    loopable: true
  },
  {
    id: 'Thinking',
    name: 'Thinking',
    category: 'Conversational',
    description: 'Finger to chin, eyes looking up in concentration.',
    prompt: 'Airi standing with a delicate finger pressed to her chin, green eyes looking upwards in deep concentration. Subtle head tilting, identical proportions, smooth loop.',
    loopable: true
  },
  {
    id: 'Talking_Normal',
    name: 'Talking Normal',
    category: 'Conversational',
    description: 'Speaking with moderate friendly lip-sync cadence.',
    prompt: 'Airi standing, her mouth moving in a normal speech cadence, her expression friendly and warm. Hair and dress sway, seamless loop starting and ending in standing pose.',
    loopable: true
  },
  {
    id: 'Talking_Happy',
    name: 'Talking Happy',
    category: 'Conversational',
    description: 'Speaking with bright, happy smiles and blushed cheeks.',
    prompt: 'Airi standing with a wide, glowing smile, speaking cheerfully. Cheeks blushing warmly, green eyes sparkling, seamless loop starting and ending in stand pose.',
    loopable: true
  },
  {
    id: 'Talking_Excited',
    name: 'Talking Excited',
    category: 'Conversational',
    description: 'Animated speaking with wide eyes and hand motions.',
    prompt: 'Airi standing, eyes wide with sparkling excitement, speaking with high enthusiasm and expressive gestures. Seamless standing transition with pristine style consistency.',
    loopable: true
  },
  {
    id: 'Confused',
    name: 'Confused',
    category: 'Conversational',
    description: 'Tilting head cutely, questioning expression.',
    prompt: 'Airi standing, tilting her head with a cute puzzled expression, scratching her cheek with her finger. Seamless loop starting and ending in stand pose.',
    loopable: true
  },
  {
    id: 'Shy',
    name: 'Shy',
    category: 'Conversational',
    description: 'Bashful smiling, twiddling fingers together.',
    prompt: 'Airi standing, twiddling her fingers together, looking down and blushing warmly with a sweet, bashful smile. Seamless loop, identical clothes and hairstyle.',
    loopable: true
  },

  // EXPRESSIONS (11)
  {
    id: 'Happy',
    name: 'Happy',
    category: 'Expressions',
    description: 'Double happy hop on feet, clapping hands.',
    prompt: 'Airi standing, doing a little joyful bounce on her feet, clapping her hands together, eyes closed happily. Seamless loop, sparkling visual energy.',
    loopable: true
  },
  {
    id: 'Laugh',
    name: 'Laugh',
    category: 'Expressions',
    description: 'Giggling softly, covering mouth with hands.',
    prompt: 'Airi standing, giggling softly, covering her mouth with her hands as her shoulders shake with laughter. Seamless standing pose, blushing face.',
    loopable: true
  },
  {
    id: 'Surprised',
    name: 'Surprised',
    category: 'Expressions',
    description: 'Comical startle, gasping at cheeks with wide eyes.',
    prompt: 'Airi standing, her eyes wide with shock, hands gasping at her cheeks, mouth slightly agape in surprise. Seamless stand loop, identical character details.',
    loopable: true
  },
  {
    id: 'Sad',
    name: 'Sad',
    category: 'Expressions',
    description: 'Shoulders slumping, looking wistful and teary.',
    prompt: 'Airi standing, her shoulders slumping, green eyes downcast with soft tears sparkling, looking wistful. Starts and ends in stand pose, seamless transition.',
    loopable: true
  },
  {
    id: 'Angry',
    name: 'Angry',
    category: 'Expressions',
    description: 'Hands on hips, cute puffy cheek pout.',
    prompt: 'Airi standing, hands on her hips, cheeks puffed out in a cute, adorable pout, looking away crossly. Seamless standing loop, cartoonish anger.',
    loopable: true
  },
  {
    id: 'Embarrassed',
    name: 'Embarrassed',
    category: 'Expressions',
    description: 'Bright red face, panic hand waving.',
    prompt: 'Airi standing, her face blushing bright red, hands waving in comically cute panic, eyes looking away sheepishly. Starts and ends in stand pose.',
    loopable: true
  },
  {
    id: 'Blushing',
    name: 'Blushing',
    category: 'Expressions',
    description: 'Deep warm blush, shielding warm cheeks.',
    prompt: 'Airi standing, a deep pink blush spreading over her cheeks, hands covering her warm face with a nervous sweet smile. Seamless standing loop.',
    loopable: true
  },
  {
    id: 'Giggle',
    name: 'Giggle',
    category: 'Expressions',
    description: 'Happy giggling bounce, shoulders swaying.',
    prompt: 'Airi standing, shoulders bouncing as she giggles behind her hand with closed happy eyes. Seamless stand pose transition, pink hues.',
    loopable: true
  },
  {
    id: 'Wink',
    name: 'Wink',
    category: 'Expressions',
    description: 'Playful wink, cute tongue sticking out.',
    prompt: 'Airi standing, giving a playful, sweet wink with her left eye and sticking her tongue out cutely. Seamless standing loop, sparkly anime style.',
    loopable: true
  },
  {
    id: 'Pout',
    name: 'Pout',
    category: 'Expressions',
    description: 'Crossing arms, puffing cheeks in cute huff.',
    prompt: 'Airi standing, crossing her arms, puffing out her cheeks, and turning her head away in an adorable huff. Seamless loop, identical proportions.',
    loopable: true
  },
  {
    id: 'Shocked',
    name: 'Shocked',
    category: 'Expressions',
    description: 'Frozen in funny comic panic state.',
    prompt: 'Airi standing, frozen in comical panic, hands clasped over her mouth, wide anime-styled shocked eyes. Seamless loop starting and ending in stand pose.',
    loopable: true
  },

  // ACTIONS (14)
  {
    id: 'Greeting',
    name: 'Greeting',
    category: 'Actions',
    description: 'Sweet bow with hand waving and wide smiling.',
    prompt: 'Airi standing, waving her hand with a huge sweet smile and bowing her head slightly in greeting. Seamless standing loop, identical artwork style.',
    loopable: true
  },
  {
    id: 'Goodbye',
    name: 'Goodbye',
    category: 'Actions',
    description: 'Bittersweet waving and blowing a sweet kiss.',
    prompt: 'Airi standing, giving a soft, bittersweet wave with both hands and blowing a gentle kiss. Starts and ends in stand pose, identical clothes.',
    loopable: true
  },
  {
    id: 'Wave',
    name: 'Wave',
    category: 'Actions',
    description: 'Bright waving with right hand on repeat.',
    prompt: 'Airi standing, waving her right hand enthusiastically with a bright, welcoming expression. Pink hair sways, seamless loop, identical look.',
    loopable: true
  },
  {
    id: 'Yawn',
    name: 'Yawn',
    category: 'Actions',
    description: 'Cute stretch and yawning cycle.',
    prompt: 'Airi standing, stretching her arms and yawning cutely, eyes watering slightly. Seamless loop returning to standing pose, consistent style.',
    loopable: true
  },
  {
    id: 'Stretch',
    name: 'Stretch',
    category: 'Actions',
    description: 'Stretching arms high above head, feeling refreshed.',
    prompt: 'Airi standing, raising both arms high above her head to stretch her back, smiling refreshed. Seamless stand pose loop, identical features.',
    loopable: true
  },
  {
    id: 'Cute_Pose',
    name: 'Cute Pose',
    category: 'Actions',
    description: 'Wink and peace sign next to cheek.',
    prompt: 'Airi standing, winking and giving a cute peace sign next to her cheek. Sparkling visual flower effects, seamless loop starting and ending in stand pose.',
    loopable: true
  },
  {
    id: 'Heart_Gesture',
    name: 'Heart Gesture',
    category: 'Actions',
    description: 'Forming sweet heart shape with hands.',
    prompt: 'Airi standing, bringing both hands together in front of her chest to form a sweet heart gesture. Blushing, seamless loop, identical pink clothing.',
    loopable: true
  },
  {
    id: 'Notification',
    name: 'Notification',
    category: 'Actions',
    description: 'Holding glowing envelope with perked expression.',
    prompt: 'Airi standing, her ears perking up, holding up a small glowing envelope or star notification with a bright smile. Seamless loop, consistent hairstyle.',
    loopable: true
  },
  {
    id: 'Celebrate',
    name: 'Celebrate',
    category: 'Actions',
    description: 'Leaping with joy and throwing confetti.',
    prompt: 'Airi standing, throwing confetti into the air with a huge triumphant leap, cheering. Sparkling stars, seamless loop starting and ending in stand pose.',
    loopable: true
  },
  {
    id: 'Curtsy',
    name: 'Curtsy',
    category: 'Actions',
    description: 'Holding dress edges, bowing in elegant curtsy.',
    prompt: 'Airi standing, gently holding the edges of her dress and bowing in an elegant, polite curtsy. Seamless stand pose, consistent proportions.',
    loopable: true
  },
  {
    id: 'Sneeze',
    name: 'Sneeze',
    category: 'Actions',
    description: 'Cute nose twitch, sneezing and blushing.',
    prompt: 'Airi standing, her nose twitching, closing her eyes tight and sneezing with a tiny cute sound, then looking embarrassed. Seamless loop, pink hair.',
    loopable: true
  },
  {
    id: 'Dizzy',
    name: 'Dizzy',
    category: 'Actions',
    description: 'Wobbling slightly with spiral stars swirling.',
    prompt: 'Airi standing, tiny yellow stars or spirals swirling around her head, wobbling slightly on her feet with dizzy eyes. Seamless standing loop.',
    loopable: true
  },
  {
    id: 'Teasing',
    name: 'Teasing',
    category: 'Actions',
    description: 'Leaning forward, pulling down eye with tongue out.',
    prompt: 'Airi standing, leaning forward slightly, pulling her lower eyelid down and sticking her tongue out playfully. Seamless loop, identical cute face.',
    loopable: true
  },
  {
    id: 'Air_Kiss',
    name: 'Air Kiss',
    category: 'Actions',
    description: 'Blowing heart-shaped air kiss.',
    prompt: 'Airi standing, blowing a glowing heart air kiss from her hands toward the viewer, smiling warmly. Seamless stand pose, hair and dress sway.',
    loopable: true
  }
];

interface AnimationStudioProps {
  onClose: () => void;
}

export default function AnimationStudio({ onClose }: AnimationStudioProps) {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Idles' | 'Conversational' | 'Expressions' | 'Actions'>('All');
  const [selectedPreset, setSelectedPreset] = useState<AnimationPreset>(ANIMATION_PRESETS[0]);
  const [customPrompt, setCustomPrompt] = useState<string>(ANIMATION_PRESETS[0].prompt);
  const [startFrameBase64, setStartFrameBase64] = useState<string>(''); // Base64 starting pose
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  
  // Generation state tracking
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [operationName, setOperationName] = useState<string>('');
  const [generationProgressText, setGenerationProgressText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Library of generated loops
  const [generatedLoops, setGeneratedLoops] = useState<{ [id: string]: string }>({}); // map state ID to local object URL or base64
  const [activeSimulationState, setActiveSimulationState] = useState<string | null>(null);

  // Load default Airi image on mount
  useEffect(() => {
    // Load Airi's original girl.png and convert to base64 so they don't have to upload anything by default!
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/png');
          setStartFrameBase64(dataURL);
        } catch (e) {
          console.error("Local canvas conversion failed:", e);
        }
      }
    };
    img.onerror = () => {
      console.warn("Failed to preload default avatar from /assets/characters/airi/girl.png");
    };
    img.src = '/assets/characters/airi/girl.png';

    // Load any saved loops from localStorage
    const saved = localStorage.getItem('airi_generated_animations');
    if (saved) {
      try {
        setGeneratedLoops(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Update prompt when preset changes
  useEffect(() => {
    setCustomPrompt(selectedPreset.prompt);
  }, [selectedPreset]);

  // File uploading handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setStartFrameBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop uploading
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setStartFrameBase64(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Reassuring loading step rotation
  const loadingSteps = [
    "Initializing Veo 3.1 Neural engine parameters...",
    "Analyzing starting frame character contours...",
    "Preserving hair aesthetics and pink dress color mapping...",
    "Synthesizing smooth motion vector paths...",
    "Enforcing identical facial proportions and eyes...",
    "Aligning first and last frame anchors for seamless loop...",
    "Compiling generated neural video frames...",
    "Finalizing transparent background rendering mask..."
  ];

  // Starts the video generation workflow using Veo
  const triggerVeoGeneration = async () => {
    if (!startFrameBase64) {
      setErrorMsg("Please upload or load a valid starting pose image first.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');
    setOperationName('');
    setGenerationProgressText("Contacting Veo 3.1 model server...");

    // Setup an interval to cycle loading steps so it feels alive and reassuring
    let stepIdx = 0;
    const progressInterval = setInterval(() => {
      setGenerationProgressText(loadingSteps[stepIdx % loadingSteps.length]);
      stepIdx++;
    }, 4500);

    try {
      // 1. POST to generate-video
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: startFrameBase64,
          prompt: customPrompt,
          aspectRatio: aspectRatio
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to trigger video generation");
      }

      const data = await res.json();
      const opName = data.operationName;
      setOperationName(opName);

      // 2. Poll the status of the operation
      let pollingCount = 0;
      const maxPolls = 60; // 60 * 5s = 5 minutes max
      let isDone = false;

      while (!isDone && pollingCount < maxPolls) {
        pollingCount++;
        await new Promise(resolve => setTimeout(resolve, 5000));

        const statusRes = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName: opName })
        });

        if (!statusRes.ok) {
          throw new Error("Failed to retrieve generation status.");
        }

        const statusData = await statusRes.json();
        if (statusData.done) {
          isDone = true;
          if (statusData.error) {
            throw new Error(statusData.error);
          }
        }
      }

      if (!isDone) {
        throw new Error("Generation timed out. The model is still processing. Please try polling later.");
      }

      // 3. Download the finished video from server proxy
      setGenerationProgressText("Downloading finished video loop from Google secure cache...");
      const downloadRes = await fetch('/api/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName: opName })
      });

      if (!downloadRes.ok) {
        throw new Error("Failed to download final video asset.");
      }

      const videoBlob = await downloadRes.blob();
      const videoObjectUrl = URL.createObjectURL(videoBlob);

      // We convert blob to data-url to store persistently or save object URL for current session
      // For now, let's store the object URL for instant play, and let them download it!
      const updatedLoops = {
        ...generatedLoops,
        [selectedPreset.id]: videoObjectUrl
      };
      setGeneratedLoops(updatedLoops);
      localStorage.setItem('airi_generated_animations', JSON.stringify(updatedLoops));

      // Auto-preview generated video
      setActiveSimulationState(selectedPreset.id);

    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "An unexpected error occurred during Veo generation.");
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
    }
  };

  // Triggers manual download of generated MP4
  const handleDownloadMp4 = async (id: string) => {
    const url = generatedLoops[id];
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = `Airi_${id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Broadcasts generated video to Character.tsx as the live active loop
  const handleApplyToDesktopCompanion = (id: string) => {
    const videoUrl = generatedLoops[id];
    if (!videoUrl) return;

    // Publish event via eventBus
    eventBus.publish('settings:update', {
      backgroundTheme: eventBus.subscribe ? undefined : '' // dummy check or just payload
    });

    // We can directly send the live active video URL to the active character screen
    (window as any).AiriActiveCustomVideoUrl = videoUrl;
    
    // Also broadcast state change to force Character.tsx to re-render using the custom override
    setActiveSimulationState(id);
    
    // Dispatch a custom event to notify Character.tsx to reload the video override
    const customEvent = new CustomEvent('airi-custom-video-change', { detail: { videoUrl, stateId: id } });
    window.dispatchEvent(customEvent);
  };

  // Clears any active simulator video overrides and returns to default Airi static/animated image
  const handleClearOverride = () => {
    (window as any).AiriActiveCustomVideoUrl = null;
    setActiveSimulationState(null);
    const customEvent = new CustomEvent('airi-custom-video-change', { detail: { videoUrl: null, stateId: null } });
    window.dispatchEvent(customEvent);
  };

  const filteredPresets = activeCategory === 'All' 
    ? ANIMATION_PRESETS 
    : ANIMATION_PRESETS.filter(p => p.category === activeCategory);

  return (
    <div id="animation-studio-backdrop" className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col z-50 overflow-hidden font-sans text-white/90">
      
      {/* HEADER BAR */}
      <header id="studio-header" className="flex justify-between items-center px-8 py-5 border-b border-white/10 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-400">
            <Film className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent font-sans">
              Veo Animation Studio
            </h1>
            <p className="text-xs text-white/40">Animate static characters into high-fidelity seamless loops using veo-3.1-fast-generate-preview</p>
          </div>
        </div>

        <button 
          id="close-studio-btn"
          onClick={onClose}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* CORE WORKSPACE */}
      <div id="studio-workspace" className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: 40 STATES DIRECTORY */}
        <aside id="states-sidebar" className="w-[360px] border-r border-white/10 bg-slate-950 flex flex-col">
          <div className="p-5 border-b border-white/5">
            <div className="text-[11px] font-bold text-pink-400 tracking-wider uppercase mb-3">Animation Directory</div>
            
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {(['All', 'Idles', 'Conversational', 'Expressions', 'Actions'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer font-medium ${
                    activeCategory === cat 
                      ? 'bg-pink-500 text-white shadow-md' 
                      : 'bg-white/5 hover:bg-white/10 text-white/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Directory List of 40 animations */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {filteredPresets.map((preset) => {
              const isGenerated = !!generatedLoops[preset.id];
              const isSelected = selectedPreset.id === preset.id;
              const isSimulating = activeSimulationState === preset.id;

              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`w-full p-3.5 rounded-xl border transition-all text-left flex justify-between items-center cursor-pointer ${
                    isSelected 
                      ? 'bg-gradient-to-r from-pink-500/15 to-violet-500/15 border-pink-500/40 shadow-inner' 
                      : 'bg-white/5 hover:bg-white/10 border-white/5'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold font-sans ${isSelected ? 'text-pink-400' : 'text-white/80'}`}>
                        {preset.name}
                      </span>
                      {isGenerated && (
                        <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-mono border border-emerald-500/20 uppercase font-bold">
                          Ready
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/40 mt-1 truncate">{preset.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/40 font-semibold font-mono uppercase">
                      {preset.category[0]}
                    </span>
                    {isSimulating && (
                      <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active override status footer */}
          {activeSimulationState && (
            <div className="p-4 border-t border-white/5 bg-pink-500/5 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs text-pink-400 font-bold">
                  <PlayCircle className="w-4 h-4 text-pink-400" />
                  Live Simulator Override Active
                </div>
                <button
                  onClick={handleClearOverride}
                  className="text-[11px] text-white/40 hover:text-white hover:underline transition"
                >
                  Clear Override
                </button>
              </div>
              <div className="text-[10px] text-white/50 leading-tight">
                Airi's main avatar on the desktop dashboard is currently playing your generated "{ANIMATION_PRESETS.find(p => p.id === activeSimulationState)?.name}" video!
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN: GENERATOR LAB */}
        <main id="generator-dashboard" className="flex-1 overflow-y-auto p-8 bg-slate-900 flex flex-col gap-8">
          
          {/* Presets Description Jumbotron */}
          <div className="bg-gradient-to-r from-pink-500/10 via-violet-500/5 to-transparent border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-pink-500/20 text-pink-400 font-bold font-mono px-2.5 py-0.5 rounded-full border border-pink-500/10 uppercase">
                  {selectedPreset.category} Presets
                </span>
                <span className="text-xs text-white/40">State ID: {selectedPreset.id}</span>
              </div>
              <h2 className="text-xl font-bold font-sans text-white/95">{selectedPreset.name} Animation Loop</h2>
              <p className="text-sm text-white/50 leading-relaxed">
                {selectedPreset.description} This asset must start and end in the exact same standing pose to allow smooth, uninterrupted companion state transitions on your desktop screen.
              </p>
            </div>

            {/* Generated Quick Status */}
            {generatedLoops[selectedPreset.id] ? (
              <div className="flex flex-col justify-center items-end flex-shrink-0 gap-2">
                <div className="bg-emerald-500/15 border border-emerald-500/20 rounded-xl px-4 py-2 text-right">
                  <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 justify-end">
                    <Check className="w-4 h-4" /> Loop Exported
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">Asset compiled in local sandbox</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApplyToDesktopCompanion(selectedPreset.id)}
                    className="px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-[11px] font-bold flex items-center gap-1 shadow-lg cursor-pointer transition-all active:scale-95"
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> Set Simulator Active
                  </button>
                  <button
                    onClick={() => handleDownloadMp4(selectedPreset.id)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download MP4
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-xs text-white/30 italic">No video compiled for this state yet</span>
              </div>
            )}
          </div>

          {/* TWO PANEL INPUTS & OUTPUTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* INPUT PANEL: 5 COLS */}
            <section className="lg:col-span-5 space-y-6">
              
              {/* Photo Upload Canvas */}
              <div className="border border-white/10 rounded-2xl bg-slate-950 p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold tracking-wider text-pink-400 uppercase font-sans">Starting Character Pose</h3>
                  {uploadedFileName && (
                    <button
                      onClick={() => {
                        setUploadedFileName('');
                        // Reset to original Airi sprite
                        setStartFrameBase64('/assets/characters/airi/girl.png');
                      }}
                      className="text-[10px] text-white/40 hover:text-pink-400 transition hover:underline"
                    >
                      Reset Default
                    </button>
                  )}
                </div>

                {/* Drag and Drop Box */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative aspect-[3/4] rounded-xl border border-dashed flex flex-col justify-center items-center overflow-hidden transition-all bg-slate-900/50 ${
                    isDragging ? 'border-pink-500 bg-pink-500/5' : 'border-white/10'
                  }`}
                >
                  {startFrameBase64 ? (
                    <>
                      <img
                        src={startFrameBase64}
                        referrerPolicy="no-referrer"
                        alt="Starting Pose"
                        className="w-full h-full object-contain p-4"
                      />
                      <label className="absolute bottom-3 right-3 p-2 bg-black/65 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-bold text-pink-400 hover:text-pink-300 cursor-pointer flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </>
                  ) : (
                    <div className="p-6 text-center space-y-3 pointer-events-none">
                      <div className="p-3 bg-white/5 rounded-full inline-block border border-white/5 text-white/40">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white/80">Upload custom reference photo</div>
                        <p className="text-[10px] text-white/30 mt-1">Drag and drop or click to upload</p>
                      </div>
                      <label className="px-3 py-1.5 rounded-lg bg-pink-500 text-[10px] font-bold text-white cursor-pointer inline-block mt-2">
                        Browse File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-white/40 leading-relaxed">
                  {uploadedFileName ? (
                    <span className="text-pink-400 font-semibold font-mono">Uploaded: {uploadedFileName}</span>
                  ) : (
                    "Airi's native high-quality standing sprite has been preloaded for you. You can animate her immediately or upload any custom character photo of your own."
                  )}
                </div>
              </div>

              {/* Generation Parameters */}
              <div className="border border-white/10 rounded-2xl bg-slate-950 p-5 space-y-5">
                <h3 className="text-xs font-bold tracking-wider text-pink-400 uppercase font-sans">Model Settings</h3>

                {/* Aspect Ratio Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-white/60">Aspect Ratio</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setAspectRatio('9:16')}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold font-sans text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        aspectRatio === '9:16'
                          ? 'bg-pink-500/10 border-pink-500 text-pink-400 shadow-md'
                          : 'bg-white/5 hover:bg-white/10 border-white/5'
                      }`}
                    >
                      <div className="w-3.5 h-6 rounded bg-current/20 flex-shrink-0" />
                      Portrait (9:16)
                    </button>
                    <button
                      onClick={() => setAspectRatio('16:9')}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold font-sans text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        aspectRatio === '16:9'
                          ? 'bg-pink-500/10 border-pink-500 text-pink-400 shadow-md'
                          : 'bg-white/5 hover:bg-white/10 border-white/5'
                      }`}
                    >
                      <div className="w-6 h-3.5 rounded bg-current/20 flex-shrink-0" />
                      Landscape (16:9)
                    </button>
                  </div>
                </div>

                {/* Prompt Editor */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-semibold text-white/60">Veo Motion Prompt</label>
                    <button 
                      onClick={() => setCustomPrompt(selectedPreset.prompt)}
                      className="text-[10px] text-white/30 hover:text-white flex items-center gap-1 font-semibold"
                    >
                      <RotateCw className="w-3 h-3" /> Reset Prompt
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white/80 focus:border-pink-500 focus:outline-none font-mono leading-relaxed"
                  />
                  <div className="text-[9px] text-white/30 font-mono leading-tight">
                    Tip: Ask Veo to loop the motion smoothly starting and ending in the default stand pose to avoid visual glitches.
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={triggerVeoGeneration}
                  disabled={isGenerating || !startFrameBase64}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 font-extrabold text-sm tracking-wide text-white uppercase shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-pink-500/15"
                >
                  <Sparkles className="w-5 h-5 animate-spin-slow" />
                  {isGenerating ? "Compiling Loop..." : "Generate Animation Loop"}
                </button>
              </div>

            </section>

            {/* OUTPUT PREVIEW PANEL: 7 COLS */}
            <section className="lg:col-span-7 space-y-6">
              
              <div className="border border-white/10 rounded-2xl bg-slate-950 p-6 space-y-5 flex flex-col min-h-[500px]">
                <h3 className="text-xs font-bold tracking-wider text-pink-400 uppercase font-sans">Active Animation Previewer</h3>

                {/* Video Generation Feedback Area */}
                <div className="flex-1 flex flex-col justify-center items-center relative rounded-xl border border-white/5 bg-slate-900 overflow-hidden">
                  
                  {isGenerating ? (
                    // LOADING STATE
                    <div className="p-8 text-center max-w-sm space-y-5">
                      <div className="relative flex justify-center items-center">
                        <div className="w-16 h-16 rounded-full border-4 border-pink-500/20 border-t-pink-500 animate-spin" />
                        <Film className="w-6 h-6 text-pink-400 absolute animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-bold text-white/90">Veo 3.1 is synthesizing motion...</div>
                        <p className="text-xs text-white/50 leading-relaxed font-mono italic animate-pulse">
                          "{generationProgressText}"
                        </p>
                      </div>
                      <div className="text-[10px] text-white/30 bg-black/35 px-4 py-2.5 rounded-xl leading-relaxed border border-white/5">
                        Video generation is heavy and takes about 1 minute. Please do not close this window while the neural frames are being compiled.
                      </div>
                    </div>

                  ) : errorMsg ? (
                    // ERROR STATE
                    <div className="p-8 text-center max-w-sm space-y-4">
                      <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-full inline-block text-rose-400">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-rose-400">Generation Failed</div>
                        <p className="text-xs text-white/50 leading-relaxed">{errorMsg}</p>
                      </div>
                      <button
                        onClick={triggerVeoGeneration}
                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 transition"
                      >
                        Try Again
                      </button>
                    </div>

                  ) : generatedLoops[selectedPreset.id] ? (
                    // SUCCESS PREVIEW STATE
                    <div className="w-full h-full flex flex-col justify-center items-center p-4">
                      <div className={`relative ${aspectRatio === '9:16' ? 'aspect-[9/16] h-[400px]' : 'aspect-[16/9] w-full'} bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-white/5`}>
                        <video
                          src={generatedLoops[selectedPreset.id]}
                          className="w-full h-full object-contain"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-md text-[9px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                          Loop Previewing
                        </div>
                      </div>
                    </div>

                  ) : (
                    // INITIAL BLANK STATE
                    <div className="p-8 text-center max-w-sm space-y-4">
                      <div className="p-4 bg-white/5 rounded-full inline-block border border-white/5 text-white/20">
                        <Play className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white/70">Ready to animate</div>
                        <p className="text-xs text-white/40 mt-1">Select a state on the left and click "Generate" to compile a neural 720p loop.</p>
                      </div>
                    </div>
                  )}

                </div>

                {/* Video controls */}
                {generatedLoops[selectedPreset.id] && (
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs text-white/60 font-semibold">Compiled Successfully in High-Quality MP4</span>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                      <button
                        onClick={() => handleApplyToDesktopCompanion(selectedPreset.id)}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition duration-200 active:scale-95 cursor-pointer ${
                          activeSimulationState === selectedPreset.id
                            ? 'bg-emerald-500 text-white'
                            : 'bg-pink-500 hover:bg-pink-600 text-white'
                        }`}
                      >
                        <PlayCircle className="w-4 h-4" />
                        {activeSimulationState === selectedPreset.id ? 'Active on Simulator' : 'Simulate Loop'}
                      </button>
                      <button
                        onClick={() => handleDownloadMp4(selectedPreset.id)}
                        className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center justify-center gap-2 transition"
                      >
                        <Download className="w-4 h-4 text-white/70" /> Export Asset
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </section>

          </div>

          {/* ASSETS LIBRARY GALLERY */}
          <div className="border border-white/10 rounded-2xl bg-slate-950 p-6 space-y-4">
            <h3 className="text-xs font-bold tracking-wider text-pink-400 uppercase font-sans">Airi Animated Library (Compiled States)</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {ANIMATION_PRESETS.map((preset) => {
                const videoUrl = generatedLoops[preset.id];
                if (!videoUrl) return null;

                const isCurrentSimulating = activeSimulationState === preset.id;

                return (
                  <div key={preset.id} className="bg-slate-900 border border-white/5 rounded-xl p-3 flex flex-col gap-3 relative group">
                    <div className="aspect-[3/4] rounded-lg bg-slate-950 overflow-hidden relative border border-white/5">
                      <video
                        src={videoUrl}
                        className="w-full h-full object-contain"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center items-center gap-1.5">
                        <button
                          onClick={() => handleApplyToDesktopCompanion(preset.id)}
                          className="p-1.5 bg-pink-500 hover:bg-pink-600 rounded-lg text-white text-xs shadow-lg"
                          title="Simulate this state"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadMp4(preset.id)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg text-white text-xs shadow-lg"
                          title="Export MP4"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-bold text-white/90 truncate">{preset.name}</div>
                      <div className="text-[9px] text-pink-400 font-medium">{preset.category}</div>
                    </div>

                    {isCurrentSimulating && (
                      <span className="absolute top-2 right-2 bg-pink-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                        Active
                      </span>
                    )}
                  </div>
                );
              })}

              {Object.keys(generatedLoops).length === 0 && (
                <div className="col-span-full py-10 text-center border border-dashed border-white/10 rounded-xl">
                  <span className="text-xs text-white/30 italic">No animated states compiled yet. Select a state above to begin!</span>
                </div>
              )}
            </div>
          </div>

        </main>

      </div>

    </div>
  );
}
