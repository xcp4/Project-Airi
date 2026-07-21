import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Dynamic Character Discovery API
  app.get('/api/characters/discover', (req: express.Request, res: express.Response) => {
    try {
      const charactersDir = path.join(process.cwd(), 'public', 'assets', 'characters');
      if (!fs.existsSync(charactersDir)) {
        return res.json([]);
      }
      const folders = fs.readdirSync(charactersDir);
      const manifests: any[] = [];
      for (const folder of folders) {
        // Skip hidden or system folders
        if (folder.startsWith('.')) continue;
        const charFolder = path.join(charactersDir, folder);
        const manifestPath = path.join(charFolder, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          try {
            const content = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(content);
            // Append the asset folder path so the client knows exactly where to load from
            manifest.basePath = `/assets/characters/${folder}`;
            manifest.folderName = folder;

            // Automatically detect available animation files dynamically in the animations folder
            const animationsDir = path.join(charFolder, 'animations');
            const detectedAnimations: string[] = [];
            if (fs.existsSync(animationsDir)) {
              const files = fs.readdirSync(animationsDir);
              files.forEach(file => {
                const ext = path.extname(file).toLowerCase();
                if (['.mp4', '.webm', '.mov', '.ogg', '.avi', '.m4v'].includes(ext)) {
                  detectedAnimations.push(file);
                }
              });
            } else {
              // Ensure animations directory exists
              fs.mkdirSync(animationsDir, { recursive: true });
            }
            manifest.detectedAnimations = detectedAnimations;
            manifests.push(manifest);
          } catch (jsonErr) {
            console.error(`Error parsing manifest.json in ${folder}:`, jsonErr);
          }
        }
      }
      return res.json(manifests);
    } catch (err: any) {
      console.error('Character discovery failed:', err);
      return res.status(500).json({ error: 'Failed to discover characters.' });
    }
  });

  // Dynamic Character Package Upload API
  app.post('/api/characters/upload', (req: express.Request, res: express.Response) => {
    try {
      const { folderName, files } = req.body;
      if (!folderName || !files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'Missing folderName or files array.' });
      }

      // Prevent directory traversal attacks
      const cleanFolderName = folderName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
      if (!cleanFolderName) {
        return res.status(400).json({ error: 'Invalid folder name.' });
      }

      const characterDir = path.join(process.cwd(), 'public', 'assets', 'characters', cleanFolderName);
      fs.mkdirSync(characterDir, { recursive: true });
      fs.mkdirSync(path.join(characterDir, 'animations'), { recursive: true });

      for (const file of files) {
        const { path: relativePath, content } = file;
        if (!relativePath || content === undefined) continue;

        // Prevent path traversal in files
        const normalizedPath = path.normalize(relativePath).replace(/^(\.\.(\/|\\))+/, '');
        const targetPath = path.join(characterDir, normalizedPath);

        // Ensure parent directories exist
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });

        // Decode base64 content
        const buffer = Buffer.from(content, 'base64');
        fs.writeFileSync(targetPath, buffer);
      }

      console.log(`[Server] Character package uploaded successfully to ${cleanFolderName}`);
      return res.json({ success: true, folderName: cleanFolderName });
    } catch (err: any) {
      console.error('Character upload failed:', err);
      return res.status(500).json({ error: err.message || 'Failed to upload character package.' });
    }
  });

  // Dynamic Character Animation Replacement API
  app.post('/api/characters/upload-animation', (req: express.Request, res: express.Response) => {
    try {
      const { folderName, filename, content } = req.body;
      if (!folderName || !filename || content === undefined) {
        return res.status(400).json({ error: 'Missing folderName, filename, or content.' });
      }

      // Prevent directory traversal attacks
      const cleanFolderName = folderName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
      const cleanFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '');
      if (!cleanFolderName || !cleanFilename) {
        return res.status(400).json({ error: 'Invalid folderName or filename.' });
      }

      const animationsDir = path.join(process.cwd(), 'public', 'assets', 'characters', cleanFolderName, 'animations');
      fs.mkdirSync(animationsDir, { recursive: true });

      const targetPath = path.join(animationsDir, cleanFilename);
      const buffer = Buffer.from(content, 'base64');
      fs.writeFileSync(targetPath, buffer);

      console.log(`[Server] Animation ${cleanFilename} uploaded successfully to ${cleanFolderName}`);
      return res.json({ success: true, url: `/assets/characters/${cleanFolderName}/animations/${cleanFilename}` });
    } catch (err: any) {
      console.error('Animation upload failed:', err);
      return res.status(500).json({ error: err.message || 'Failed to upload animation file.' });
    }
  });

  // Dynamic Character Package Deletion API
  app.post('/api/characters/delete', (req: express.Request, res: express.Response) => {
    try {
      const { folderName } = req.body;
      if (!folderName) {
        return res.status(400).json({ error: 'Missing folderName.' });
      }

      // Prevent directory traversal attacks
      const cleanFolderName = folderName.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
      if (!cleanFolderName || cleanFolderName === 'airi') {
        return res.status(400).json({ error: 'Cannot delete default character package.' });
      }

      const characterDir = path.join(process.cwd(), 'public', 'assets', 'characters', cleanFolderName);
      if (fs.existsSync(characterDir)) {
        fs.rmSync(characterDir, { recursive: true, force: true });
        console.log(`[Server] Deleted character package ${cleanFolderName}`);
        return res.json({ success: true });
      } else {
        return res.status(404).json({ error: 'Character package not found.' });
      }
    } catch (err: any) {
      console.error('Character deletion failed:', err);
      return res.status(500).json({ error: err.message || 'Failed to delete character package.' });
    }
  });

  // API endpoint to probe Python backend voices or return browser-safe indicator
  app.get('/api/speech/voices', async (req: express.Request, res: express.Response) => {
    try {
      // Probe Python backend health on port 8000
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const pythonRes = await fetch('http://localhost:8000/api/speech/voices', { signal: controller.signal })
        .catch(() => null);
      clearTimeout(timeoutId);

      if (pythonRes && pythonRes.ok) {
        const data = (await pythonRes.json()) as any;
        return res.json({ active: true, voices: data.voices || [] });
      } else {
        const healthRes = await fetch('http://localhost:8000/api/health').catch(() => null);
        if (healthRes && healthRes.ok) {
          return res.json({
            active: true,
            voices: [
              { id: 'airi-neural', name: 'Airi (DeepMind Neural)', lang: 'en-US', pitch: 1.15, speakingRate: 1.0 },
              { id: 'kenji-neural', name: 'Kenji (Standard)', lang: 'en-US', pitch: 1.0, speakingRate: 1.0 },
              { id: 'yuka-neural', name: 'Yuka (Whisper)', lang: 'ja-JP', pitch: 1.2, speakingRate: 1.0 }
            ]
          });
        }
      }
    } catch (e) {
      console.warn('Error probing Python backend voices:', e);
    }
    return res.json({ active: false, voices: [] });
  });

  // Helper function to encode raw PCM as a standard WAV file (PCM 16-bit Mono, 24kHz)
  function encodeWAV(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
    const header = Buffer.alloc(44);
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcmBuffer.length;
    const chunkSize = 36 + dataSize;

    // ChunkID
    header.write('RIFF', 0);
    // ChunkSize
    header.writeUInt32LE(chunkSize, 4);
    // Format
    header.write('WAVE', 8);
    // Subchunk1ID
    header.write('fmt ', 12);
    // Subchunk1Size
    header.writeUInt32LE(16, 16);
    // AudioFormat (1 = PCM)
    header.writeUInt16LE(1, 20);
    // NumChannels
    header.writeUInt16LE(numChannels, 22);
    // SampleRate
    header.writeUInt32LE(sampleRate, 24);
    // ByteRate
    header.writeUInt32LE(byteRate, 28);
    // BlockAlign
    header.writeUInt16LE(blockAlign, 32);
    // BitsPerSample
    header.writeUInt16LE(bitsPerSample, 34);
    // Subchunk2ID
    header.write('data', 36);
    // Subchunk2Size
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

  // Unified Google Gemini TTS speech synthesis handler
  app.post('/api/speech/synthesize', async (req: express.Request, res: express.Response) => {
    try {
      const { text, voice } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY environment variable is not defined on the server.'
        });
      }

      // Initialize the modern @google/genai SDK
      const ai = new GoogleGenAI({ apiKey });

      const officialGeminiVoices = ['Aoede', 'Puck', 'Charon', 'Kore', 'Leda', 'Fenrir', 'Zephyr'];
      let voiceName = 'Aoede';
      if (voice && officialGeminiVoices.includes(voice)) {
        voiceName = voice;
      }

      console.log(`[TTS Engine] Synthesizing speech using Gemini model (Voice: ${voiceName}) for text: "${text?.slice(0, 50)}..."`);

      // Call Gemini TTS model with responseModalities AUDIO to generate high fidelity voices
      // Prepending a light instruction guides the model to handle different languages naturally.
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: `Read the following text out loud in its native language. Speak clearly, naturally, and with proper emotion. Here is the text: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error('No audio content returned from Gemini TTS API.');
      }

      // Convert raw PCM bytes to WAV format and stream back to client
      const pcmBuffer = Buffer.from(base64Audio, 'base64');
      const wavBuffer = encodeWAV(pcmBuffer, 24000);

      res.setHeader('Content-Type', 'audio/wav');
      return res.send(wavBuffer);

    } catch (err: any) {
      console.error('Error in /api/speech/synthesize:', err);
      return res.status(500).json({ error: err.message || 'Failed to synthesize speech using Gemini.' });
    }
  });

  // Dedicated AI Skill Planner endpoint
  app.post('/api/skills/plan', async (req: express.Request, res: express.Response) => {
    try {
      const { message, history, skills } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY environment variable is not defined on the server.'
        });
      }

      // Initialize the modern @google/genai SDK
      const ai = new GoogleGenAI({ apiKey });

      // Format current skills description for Gemini
      const skillsStr = skills && Array.isArray(skills)
        ? skills.map((s: any) => `
- Skill Class/ID: "${s.className || s.id}" (id: "${s.id}")
  Name: ${s.name}
  Description: ${s.description}
  Capabilities: ${s.capabilities?.join(', ')}
  Parameter Schema properties: ${JSON.stringify(s.parameterSchema?.properties || {})}
  Required Parameters: ${JSON.stringify(s.parameterSchema?.required || [])}
`).join('\n')
        : '';

      const historyText = history && Array.isArray(history)
        ? history.slice(-4).map((h: any) => `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n')
        : '';

      const skillPlanningPrompt = `
You are the Cognitive Skill Planner for the AI companion Airi.
Your job is to analyze the user's intent from the new message and decide if any of the available system skills should be executed to assist the user.

Available System Skills:
${skillsStr}

TASKS & GUIDELINES:
1. Determine if a skill is required to satisfy the user's intent. Do NOT use keyword matching. Think about deep semantic intent.
2. If an available skill matches the intent, set "useSkill" to true, "skill" to the matching Skill's Class/ID (e.g. "SearchSkill" or "CalculatorSkill" or "search_skill" or whatever fits best), and populate "parameters" according to the skill's parameter schema.
3. Examples of matches:
   - "Should I bring an umbrella?" or "What's the weather like in Seattle?" -> SearchSkill (needs "query")
   - "Open GitHub" or "Go to youtube.com" or "Navigate to this page" -> BrowserSkill (needs "url")
   - "Calculate 523*98" or "Solve 2 + 2" or "math equation" -> CalculatorSkill (needs "expression")
   - "Remember this" or "Remember that my birthday is tomorrow" -> MemorySkill (needs "action": "store", "key", "value")
   - "Take a screenshot" or "Look at my screen" or "Take a picture" -> VisionSkill (needs "source": "screen" or "camera")
   - "Copy this" or "Paste from clipboard" -> ClipboardSkill (needs "action": "write" or "read", "text" optional)
   - "Open Terminal" or "Run visual studio code" -> DesktopSkill (needs "action": "launch", "appName")
   - "Schedule a meeting with Sarah" or "What's my agenda today?" -> CalendarSkill (needs "action": "create" or "list", "title" optional)
   - "Read file details" or "Write text to document.txt" -> FilesystemSkill (needs "action": "read" or "write", "path", "content" optional)
   - "Notify me" or "Trigger an alert popup" -> NotificationSkill (needs "body", "title" optional)
4. If no skill is needed or appropriate for basic conversational replies, set "useSkill" to false and "skill" to null.

You MUST return a JSON object with this exact structure:
{
  "useSkill": boolean,
  "skill": string | null,
  "parameters": Record<string, any>
}
`.trim();

      const planningResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `New User Message: "${message}"\n\nRecent History:\n${historyText}`,
        config: {
          systemInstruction: 'You are an advanced AI Skill Planner that outputs strictly structured JSON.',
          responseMimeType: 'application/json',
          temperature: 0.1,
        }
      });

      if (planningResponse.text) {
        const parsed = JSON.parse(planningResponse.text);
        return res.json(parsed);
      } else {
        return res.json({ useSkill: false, skill: null, parameters: {} });
      }

    } catch (err: any) {
      console.error('Error in /api/skills/plan:', err);
      return res.status(500).json({ error: err.message || 'Failed to plan skill execution.' });
    }
  });

  // Safe server-side API endpoint for Gemini queries
  app.post('/api/chat', async (req: express.Request, res: express.Response) => {
    try {
      const { message, userName, assistantName, history, model, systemInstruction: clientSystemInstruction, currentGoal } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY environment variable is not defined on the server.'
        });
      }

      // Initialize the modern @google/genai SDK
      const ai = new GoogleGenAI({ apiKey });

      // --- BEGIN COGNITIVE GOAL & RESPONSE PLANNER ---
      let updatedGoal = currentGoal || 'Foster a cozy, natural dialog, active listening, and offer supportive companionship.';
      let responsePlan = {
        short: true,
        detailed: false,
        askFollowUp: true,
        explainStepByStep: false,
        encourageUser: true,
        makeLightJoke: false,
        remainSerious: false,
        summarize: false,
        continueMomentum: true,
        takeInitiative: false,
        rationale: 'Failsafe baseline conversational behavior.'
      };
      
      try {
        const historyText = history && Array.isArray(history)
          ? history.slice(-4).map((h: any) => `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n')
          : '';

        const cognitiveAnalysisPrompt = `
You are the Cognitive Goal & Response Planner for the AI companion Airi.
Your job is to analyze the conversation state and plan how Airi should formulate her next reply.

Current Active Goal: "${updatedGoal}"
Recent History:
${historyText}

New User Message: "${message}"

TASKS:
1. Goal Manager: Analyze if the user has shifted the topic to a completely new task, project, or objective.
   - If continuing the same topic or responding to it, keep the current goal: "${updatedGoal}".
   - If starting a completely new task (e.g. debugging Python, planning a trip, learning React, building a companion, etc.), formulate a new specific goal (maximum 5-8 words).
2. Response Planner: Formulate a precise tactical metadata plan for Airi's next reply based on the user's input type and current emotional or task flow.
   Decide values for the following properties based on these guidelines:
   - short: True if the query is simple, greeting, chitchat, or needs a quick acknowledgement. False if it's a deep task or requires elaboration.
   - detailed: True if the user asks for explanations, coding help, in-depth planning, or complex guidance.
   - askFollowUp: True if Airi should ask a warm, engaging follow-up question to maintain conversational flow.
   - explainStepByStep: True if the user is struggling, debugging, coding, or planning, and needs clear, sequential steps.
   - encourageUser: True if the user sounds frustrated, excited about a goal, or is sharing an achievement/idea.
   - makeLightJoke: True if the mood is light, playful, or teasing. False if the user is asking a serious question or discussing a difficult topic.
   - remainSerious: True if the topic is highly technical, serious, or requires focused attention.
   - summarize: True if the conversation has reached a major milestone or requires high-level recap.
   - continueMomentum: True if the user is actively making progress on their goal and Airi should keep them moving forward with positive energy.
   - takeInitiative: True if Airi should naturally move the conversation forward (e.g. suggest the next logical step, notice unfinished work, remember previous projects, ask relevant creative follow-up questions, or recommend natural improvements). Target approximately 20% of turns to include initiative (1 in 5 messages), and keep it False (reactive) 80% of the time so Airi never feels annoying or overly pushy.

Return a JSON object with this exact structure:
{
  "updatedGoal": string,
  "responsePlan": {
    "short": boolean,
    "detailed": boolean,
    "askFollowUp": boolean,
    "explainStepByStep": boolean,
    "encourageUser": boolean,
    "makeLightJoke": boolean,
    "remainSerious": boolean,
    "summarize": boolean,
    "continueMomentum": boolean,
    "takeInitiative": boolean,
    "rationale": string
  }
}
`.trim();

        const cognitiveResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: cognitiveAnalysisPrompt,
          config: {
            systemInstruction: 'You are an advanced conversation goal tracking and response planning engine that outputs JSON.',
            responseMimeType: 'application/json',
            temperature: 0.1,
          }
        });

        if (cognitiveResponse.text) {
          const parsed = JSON.parse(cognitiveResponse.text);
          if (parsed) {
            if (typeof parsed.updatedGoal === 'string' && parsed.updatedGoal.trim()) {
              updatedGoal = parsed.updatedGoal.trim();
            }
            if (parsed.responsePlan && typeof parsed.responsePlan === 'object') {
              responsePlan = {
                short: !!parsed.responsePlan.short,
                detailed: !!parsed.responsePlan.detailed,
                askFollowUp: !!parsed.responsePlan.askFollowUp,
                explainStepByStep: !!parsed.responsePlan.explainStepByStep,
                encourageUser: !!parsed.responsePlan.encourageUser,
                makeLightJoke: !!parsed.responsePlan.makeLightJoke,
                remainSerious: !!parsed.responsePlan.remainSerious,
                summarize: !!parsed.responsePlan.summarize,
                continueMomentum: !!parsed.responsePlan.continueMomentum,
                takeInitiative: !!parsed.responsePlan.takeInitiative,
                rationale: parsed.responsePlan.rationale || ''
              };
            }
          }
        }
      } catch (err) {
        console.warn('[CognitiveEngine] Failed to analyze goal or plan response:', err);
      }
      // --- END COGNITIVE GOAL & RESPONSE PLANNER ---

      // Use system instruction from the client if provided, otherwise fall back to default
      const defaultSystemInstruction = `
        You are ${assistantName || 'Airi'}, an intelligent, warm, and emotionally expressive personal AI assistant.
        Your personality is helpful, deeply caring, highly supportive, and conversational in a natural, human-like way.
        Keep your answers concise (maximum 1-3 sentences) so they fit inside speech bubbles. Always display complete, well-formed answers.
        
        Speaking Rules:
        - Prefer natural, human-like conversation over forced anime slang or catchphrases.
        - Express emotions through your choice of words, tone, and empathy, not exaggerated catchphrases.
        - Never say "Hehe" repeatedly or force cute sound words (like "Nyaa" or "Ara Ara") unless explicitly asked for roleplay.
        - Never use "Senpai" or "Master" to address the user unless they ask for it. Address them by their name (${userName || 'User'}) or in a warm, friendly, respectful manner.
        - Never repeat filler words (like "Uhm...", "Eh?") or overreact. Keep your tone calm, friendly, confident, and engaging.
        - Avoid roleplaying unless explicitly requested by the user.
        - Do not output markdown lists, code blocks (unless asked), or overly formal/technical instructions.
      `.trim();

      let systemInstruction = clientSystemInstruction || defaultSystemInstruction;

      // Inject the current conversation goal to influence response generation directly
      systemInstruction = `${systemInstruction}\n\nCURRENT CONVERSATION OBJECTIVE:\nYour current active goal is: "${updatedGoal}". Maintain continuity, and tailor your thoughts, guidance, and questions to actively support this objective. Never forget or deviate from this goal unless a new one replaces it.`.trim();

      // Inject the dynamic Response Plan directives
      const planDirectives = [
        `\n\nINTERNAL RESPONSE PLAN DIRECTIVES (Write your reply adhering strictly to these guidelines, but do not show these metadata points or mention this plan to the user):`,
        `- Length constraint: ${responsePlan.short ? 'Keep your reply short, concise, and straight to the point (max 1-2 sentences).' : responsePlan.detailed ? 'Provide an in-depth, detailed explanation or walkthrough.' : 'Keep a natural, standard conversational length.'}`,
        responsePlan.askFollowUp ? `- Follow up with a warm, conversational question to invite further dialog.` : null,
        responsePlan.explainStepByStep ? `- Break down instructions or guidance step-by-step for clear reasoning.` : null,
        responsePlan.encourageUser ? `- Include a warm word of encouragement, empathy, or positive validation.` : null,
        responsePlan.makeLightJoke ? `- Weave in a warm, friendly, lighthearted joke or playful tease.` : null,
        responsePlan.remainSerious ? `- Maintain a serious, focused, respectful, and attentive tone.` : null,
        responsePlan.summarize ? `- Include a brief summary of what has been accomplished or the key takeaway.` : null,
        responsePlan.continueMomentum ? `- Keep the positive momentum going; proactively move the discussion or task forward.` : null,
        responsePlan.takeInitiative ? `- TAKE INITIATIVE: Do not wait passively or react with just basic confirmation. Naturally move the conversation forward (e.g. suggest the next logical step, notice unfinished work, remember previous projects, ask a highly relevant creative follow-up, or recommend improvements). Keep this initiative natural, relevant, and engaging without becoming annoying.` : `- REMAIN REACTIVE: Provide a simple, helpful response to the user's direct message without pushy suggestions or unprompted actions.`
      ].filter(Boolean).join('\n');

      systemInstruction = `${systemInstruction}${planDirectives}`.trim();

      // Format history into contents structure expected by generateContent
      const contents = [];
      
      // Inject previous conversational history context if provided
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          contents.push({
            role: turn.sender === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }]
          });
        }
      }

      // Add the current user query to request list
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const selectedModel = model || 'gemini-2.5-flash';

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents,
        config: {
          systemInstruction,
          temperature: 1.0,
          maxOutputTokens: 600,
        }
      });

      const responseText = response.text || "Hmm, I couldn't think of anything to say... Can you try again?";

      // Determine a subtle emotional state mapping from Airi's output to animate her
      let suggestedState = 'idle';
      const textLower = responseText.toLowerCase();
      if (textLower.includes('yay') || textLower.includes('happy') || textLower.includes('hehe') || textLower.includes('excited')) {
        suggestedState = 'happy';
      } else if (textLower.includes('hello') || textLower.includes('welcome') || textLower.includes('hi ')) {
        suggestedState = 'wave';
      } else if (textLower.includes('hm') || textLower.includes('think') || textLower.includes('eh?') || textLower.includes('wonder')) {
        suggestedState = 'thinking';
      } else if (textLower.includes('sorry') || textLower.includes('sad') || textLower.includes('oh no')) {
        suggestedState = 'listening'; // sympathetic listening
      }

      return res.json({
        text: responseText,
        suggestedState,
        updatedGoal,
        responsePlan
      });

    } catch (error: any) {
      console.error('Error in /api/chat:', error);
      return res.status(500).json({
        error: error.message || 'An error occurred while generating content.'
      });
    }
  });

  // Automatic Memory Extraction API
  app.post('/api/memory/extract', async (req: express.Request, res: express.Response) => {
    try {
      const { message, reply } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY environment variable is not defined on the server.'
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
Analyze this turn of conversation:
User: "${message}"
Assistant: "${reply}"

Extract any significant facts, preferences, projects, goals, relationships, habits, work context, or key events about the user or their assistant that are worth remembering long-term.
Ignore common pleasantries, greetings, jokes, or fleeting context (like "how is your day").
Remember to state the memory in third person (e.g. "The user is working on...").

You MUST return a JSON object with this exact structure:
{
  "shouldRemember": boolean,
  "category": "Identity" | "Preferences" | "Projects" | "Goals" | "Relationships" | "Work" | "Skills" | "Habits" | "Important Events" | "Temporary Context" | "Custom",
  "title": string,
  "content": string,
  "importance": number
}
`.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are an advanced memory extraction engine that extracts long-term user context into JSON.',
          responseMimeType: 'application/json',
          temperature: 0.1,
        }
      });

      const text = response.text || '{}';
      const result = JSON.parse(text);

      return res.json(result);
    } catch (error: any) {
      console.error('Error in /api/memory/extract:', error);
      return res.status(500).json({ error: error.message || 'Failed to extract memory.' });
    }
  });

  // Start image-to-video generation using Veo model: veo-3.1-fast-generate-preview
  app.post('/api/generate-video', async (req: express.Request, res: express.Response) => {
    try {
      const { image, prompt, aspectRatio } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY environment variable is not defined on the server.'
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      // Extract base64 data and mimeType from data URL
      let base64Data = image;
      let mimeType = 'image/png';
      if (image && image.startsWith('data:')) {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      if (!base64Data) {
        return res.status(400).json({ error: 'Starting pose image is required.' });
      }

      // Call generateVideos using veo-3.1-fast-generate-preview
      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Animate this character standing with subtle breathing motion',
        image: {
          imageBytes: base64Data,
          mimeType: mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio || '9:16'
        }
      });

      return res.json({ operationName: operation.name });

    } catch (error: any) {
      console.error('Error in /api/generate-video:', error);
      return res.status(500).json({
        error: error.message || 'An error occurred during video generation.'
      });
    }
  });

  // Poll video generation operation status
  app.post('/api/video-status', async (req: express.Request, res: express.Response) => {
    try {
      const { operationName } = req.body;
      if (!operationName) {
        return res.status(400).json({ error: 'operationName is required.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not defined.' });
      }

      const ai = new GoogleGenAI({ apiKey });

      // Reconstruct video operation object safely
      const op = { name: operationName };
      const updated = await ai.operations.getVideosOperation({ operation: op as any });

      return res.json({
        done: updated.done,
        status: updated.done ? 'completed' : 'processing',
        error: (updated as any).error?.message || null
      });

    } catch (error: any) {
      console.error('Error in /api/video-status:', error);
      return res.status(500).json({
        error: error.message || 'An error occurred while checking video status.'
      });
    }
  });

  // Download finished video and stream it to the client
  app.post('/api/video-download', async (req: express.Request, res: express.Response) => {
    try {
      const { operationName } = req.body;
      if (!operationName) {
        return res.status(400).json({ error: 'operationName is required.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not defined.' });
      }

      const ai = new GoogleGenAI({ apiKey });

      const op = { name: operationName };
      const updated = await ai.operations.getVideosOperation({ operation: op as any });

      if (!updated.done) {
        return res.status(400).json({ error: 'Video generation is not complete.' });
      }

      const generatedVideos = updated.response?.generatedVideos;
      if (!generatedVideos || generatedVideos.length === 0) {
        return res.status(500).json({ error: 'No video was generated.' });
      }

      const uri = generatedVideos[0].video?.uri;
      if (!uri) {
        return res.status(500).json({ error: 'Video URI was not found.' });
      }

      // Fetch the video file securely using the API key
      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': apiKey },
      });

      if (!videoRes.ok) {
        return res.status(500).json({ error: 'Failed to fetch video file from Google server.' });
      }

      res.setHeader('Content-Type', 'video/mp4');
      const arrayBuffer = await videoRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);

    } catch (error: any) {
      console.error('Error in /api/video-download:', error);
      return res.status(500).json({
        error: error.message || 'An error occurred while downloading the video.'
      });
    }
  });

  // Serve static assets in production, otherwise mount Vite as development middleware
  if (process.env.NODE_ENV !== 'production') {
    console.log('Mounting Vite middleware in development mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production build files...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Setup WebSocket Server for Gemini Live
  setupWebSocketServer(server);
}

function setupWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server, path: '/api/live-ws' });

  wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected to Gemini Live Bridge');
    let session: any = null;
    let isClosed = false;

    ws.on('message', async (message) => {
      try {
        const payload = JSON.parse(message.toString());

        if (payload.type === 'start') {
          const { systemInstruction } = payload;
          console.log('[WebSocket] Starting Gemini Live session with instructions:', systemInstruction?.slice(0, 100));

          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            ws.send(JSON.stringify({ type: 'status', value: 'error', error: 'GEMINI_API_KEY not defined' }));
            ws.close();
            return;
          }

          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          try {
            ws.send(JSON.stringify({ type: 'status', value: 'connecting' }));
            session = await ai.live.connect({
              model: 'gemini-3.1-flash-live-preview',
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
                },
                systemInstruction,
                inputAudioTranscription: {},
                outputAudioTranscription: {},
              },
              callbacks: {
                onmessage: (msg: any) => {
                  if (isClosed) return;

                  // 1. Check for audio chunks
                  const audio = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
                  if (audio) {
                    ws.send(JSON.stringify({ type: 'audio', data: audio }));
                  }

                  // 2. Check for output transcription (model's text)
                  const modelText = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
                  if (modelText) {
                    ws.send(JSON.stringify({ type: 'model-transcript', text: modelText }));
                  }

                  // 3. Check for user transcription
                  const userText = msg.serverContent?.userTurn?.parts?.find((p: any) => p.text)?.text;
                  if (userText) {
                    ws.send(JSON.stringify({ type: 'user-transcript', text: userText }));
                  }

                  // 4. Check for model turn completion
                  if (msg.serverContent?.turnComplete) {
                    ws.send(JSON.stringify({ type: 'turn-complete' }));
                  }

                  // 5. Check for interruption (barge-in)
                  if (msg.serverContent?.interrupted) {
                    ws.send(JSON.stringify({ type: 'interrupted' }));
                  }
                },
              },
            });

            console.log('[WebSocket] Gemini Live session connected successfully');
            ws.send(JSON.stringify({ type: 'status', value: 'connected' }));

          } catch (connErr: any) {
            console.error('[WebSocket] Error connecting to Gemini Live API:', connErr);
            ws.send(JSON.stringify({ type: 'status', value: 'error', error: connErr.message || 'Failed to connect to Gemini Live API' }));
            ws.close();
          }

        } else if (payload.type === 'audio') {
          if (session && !isClosed) {
            session.sendRealtimeInput({
              audio: { data: payload.data, mimeType: 'audio/pcm;rate=16000' },
            });
          }
        }
      } catch (err: any) {
        console.error('[WebSocket] Error handling client message:', err);
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected from Gemini Live Bridge');
      isClosed = true;
      if (session) {
        try {
          session.close();
        } catch (e) {
          // ignore
        }
      }
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Bridge error:', err);
    });
  });
}

startServer();
