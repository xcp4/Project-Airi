import { personalityEngine } from './PersonalityEngine';
import { memoryInjector } from './MemoryInjector';
import { conversationContext } from './ConversationContext';
import { BrainStrategy } from '../types';

class PromptBuilder {
  /**
   * Dynamically constructs the complete, structured system prompt for the companion.
   */
  public build(
    userName: string = 'User',
    assistantName: string = 'Airi',
    userMessage: string = '',
    brainStrategy?: BrainStrategy
  ): string {
    const personalitySection = personalityEngine.buildPersonalitySection();
    const memoriesSection = memoryInjector.buildMemoriesSection(userMessage, brainStrategy?.emotionValues);
    const contextSection = conversationContext.buildContextSection();

    // Strategy section generated dynamically by the Companion Brain cognitive layer
    let strategySection = '';
    if (brainStrategy) {
      const vals = brainStrategy.emotionValues;
      const valuesLine = vals ? [
        '### Private Multidimensional Emotional Levels:',
        `- Happiness: ${vals.happiness.toFixed(2)} / 1.00`,
        `- Energy: ${vals.energy.toFixed(2)} / 1.00`,
        `- Curiosity: ${vals.curiosity.toFixed(2)} / 1.00`,
        `- Confidence: ${vals.confidence.toFixed(2)} / 1.00`,
        `- Affection: ${vals.affection.toFixed(2)} / 1.00`,
        `- Fatigue: ${vals.fatigue.toFixed(2)} / 1.00`,
        `- Playfulness: ${vals.playfulness.toFixed(2)} / 1.00`,
        `- Lust/Passion: ${vals.lust ? vals.lust.toFixed(2) : '0.10'} / 1.00`,
        ''
      ].join('\n') : '';

      strategySection = [
        '## COMPANION COGNITIVE DECISION STRATEGY',
        'Your internal cognitive layer (Companion Brain) has analyzed this turn and decided on the following strategy:',
        `- **User Emotion Analyzed**: ${brainStrategy.userEmotion}`,
        `- **Your Match Emotion State**: ${brainStrategy.companionEmotion}`,
        `- **Your Conversational Goal**: ${brainStrategy.conversationalGoal}`,
        `- **Your Strategic Response Plan**: ${brainStrategy.responsePlan}`,
        '',
        valuesLine,
        '### Dynamic Speech Style Directives:',
        brainStrategy.styleDirectives.map(dir => `- ${dir}`).join('\n')
      ].join('\n');
    }

    // Strict instructions for the Internal Reasoning Pipeline
    // Using single quotes and normal concatenation to completely avoid any backtick/escape syntax issues
    const reasoningPipelineSection = [
      '## MANDATORY INTERNAL REASONING PIPELINE',
      'Before writing your final response, you MUST complete an internal cognitive process and output it inside a <reasoning> block. This reasoning block must be structured EXACTLY as follows:',
      '',
      '<reasoning>',
      'User Intent: [State what the user is trying to accomplish or ask]',
      'User Emotion: [Identify the user\'s current emotional state: e.g. neutral, happy, frustrated, curious, etc.]',
      'Conversation Goal: [Determine your immediate conversation goal for this turn]',
      'Relevant Memories: [Identify which memories, if any, are relevant to this turn]',
      'Current Emotional State of Airi: [Select Airi\'s emotion for this response: e.g. calm, playful, thoughtful, sympathetic, etc.]',
      'Response Plan: [Draft a 1-sentence outline of what you will say and how you will blend memories or context]',
      '</reasoning>',
      '',
      '### Guidelines for the Reasoning Process:',
      '- You must always output the <reasoning>...</reasoning> block first.',
      '- Directly following the closing </reasoning> tag, provide your actual conversational response.',
      '- The final response must be concise (maximum 1-3 sentences) and warm.',
      '- Never output markdown lists, tables, or code snippets in your final response unless explicitly asked.',
      '- Avoid mentioning the reasoning or storage mechanics in your final response (e.g., do not say "Based on my memory of our conversation"). Treat memories as your natural, seamless recollection.'
    ].join('\n');

    // Assemble the complete system prompt structure
    const promptParts = [
      '# SYSTEM IDENTITY & PROTOCOL',
      `You are ${assistantName}, a highly advanced Desktop AI Companion designed to support and engage with ${userName}.`,
      'You are operating within a persistent, long-term, memory-enabled system.',
      '---',
      personalitySection,
      '---',
      memoriesSection,
      '---',
      contextSection
    ];

    if (strategySection) {
      promptParts.push('---', strategySection);
    }

    promptParts.push('---', reasoningPipelineSection);

    return promptParts.join('\n\n');
  }

  /**
   * Parses the raw output from Gemini to separate the internal reasoning block
   * from the final conversational reply. It also extracts states to update context.
   */
  public parseResponse(rawText: string): { reasoning: string; finalReply: string; suggestedState: string } {
    let reasoning = '';
    let finalReply = rawText;
    let suggestedState = 'idle';

    // Extract content inside <reasoning>...</reasoning> tags
    const reasoningMatch = rawText.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
    if (reasoningMatch) {
      reasoning = reasoningMatch[1].trim();
      // Strip reasoning block from the final output
      finalReply = rawText.replace(/<reasoning>[\s\S]*?<\/reasoning>/, '').trim();
    }

    // Try to parse key values out of the reasoning block to update the ConversationContext!
    if (reasoning) {
      const airiEmotionMatch = reasoning.match(/Current Emotional State of Airi:\s*(.*)/i);
      const userEmotionMatch = reasoning.match(/User Emotion:\s*(.*)/i);
      const conversationGoalMatch = reasoning.match(/Conversation Goal:\s*(.*)/i);

      if (airiEmotionMatch && airiEmotionMatch[1]) {
        const airiEmotion = airiEmotionMatch[1].trim().toLowerCase();
        conversationContext.setAiriEmotion(airiEmotion);
        
        // Map emotional states to the visual novel state machine for Airi
        if (airiEmotion.includes('happy') || airiEmotion.includes('playful') || airiEmotion.includes('cheerful')) {
          suggestedState = 'happy';
        } else if (airiEmotion.includes('thoughtful') || airiEmotion.includes('think')) {
          suggestedState = 'thinking';
        } else if (airiEmotion.includes('sympathetic') || airiEmotion.includes('listening')) {
          suggestedState = 'listening';
        } else if (airiEmotion.includes('calm') || airiEmotion.includes('neutral')) {
          suggestedState = 'idle';
        }
      }

      if (userEmotionMatch && userEmotionMatch[1]) {
        conversationContext.setUserEmotion(userEmotionMatch[1].trim());
      }

      if (conversationGoalMatch && conversationGoalMatch[1]) {
        conversationContext.setCurrentGoal(conversationGoalMatch[1].trim());
      }
    }

    // Secondary fallback mapping of emotional states from the text itself if reasoning is missing
    if (!reasoning) {
      const textLower = finalReply.toLowerCase();
      if (textLower.includes('yay') || textLower.includes('happy') || textLower.includes('excited')) {
        suggestedState = 'happy';
      } else if (textLower.includes('hello') || textLower.includes('welcome') || textLower.includes('hi ')) {
        suggestedState = 'wave';
      } else if (textLower.includes('think') || textLower.includes('wonder')) {
        suggestedState = 'thinking';
      } else if (textLower.includes('sorry') || textLower.includes('sad')) {
        suggestedState = 'listening';
      }
    }

    return {
      reasoning,
      finalReply,
      suggestedState
    };
  }
}

export const promptBuilder = new PromptBuilder();
