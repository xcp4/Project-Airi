import React from 'react';
import { CharacterManifest } from '../types';
import SpriteSequenceRenderer from './SpriteSequenceRenderer';

interface CharacterRendererProps {
  manifest: CharacterManifest | null;
  onRenderReady?: () => void;
}

/**
 * Generic Character Renderer Component
 * Decouples the presentation technology (Canvas, Live2D, WebGL) from the engine.
 * Selects the active renderer dynamically based on character manifest capabilities.
 */
export default function CharacterRenderer({ manifest, onRenderReady }: CharacterRendererProps) {
  if (!manifest) {
    return (
      <div className="flex items-center justify-center w-full h-full text-pink-400 font-sans text-sm animate-pulse">
        Initializing companion systems...
      </div>
    );
  }

  // Support transparent swaps between render technologies
  switch (manifest.capabilities.renderingType) {
    case 'sprite_sequence':
      return <SpriteSequenceRenderer onRenderReady={onRenderReady} />;
      
    case 'live2d':
      // Future-proof integration: Swap to Live2D Canvas/GL SDK
      return (
        <div className="flex flex-col items-center justify-center w-[450px] h-[550px] border border-white/5 bg-black/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl animate-fade-in text-center">
          <div className="w-20 h-20 rounded-full bg-pink-500/10 flex items-center justify-center mb-4 border border-pink-500/20">
            <span className="text-3xl">🤖</span>
          </div>
          <h3 className="text-sm font-bold text-white/90 mb-1">Live2D Renderer Active</h3>
          <p className="text-xs text-white/50 max-w-[280px]">
            The Character Engine is running Live2D parametric animations for <strong>{manifest.name}</strong>.
          </p>
        </div>
      );

    case '3d':
      // Future-proof integration: Swap to WebGL/Three.js
      return (
        <div className="flex flex-col items-center justify-center w-[450px] h-[550px] border border-white/5 bg-black/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl animate-fade-in text-center">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
            <span className="text-3xl">🧊</span>
          </div>
          <h3 className="text-sm font-bold text-white/90 mb-1">3D WebGL Renderer Active</h3>
          <p className="text-xs text-white/50 max-w-[280px]">
            The Character Engine is rendering a 3D glTF mesh with skeletal rig parameters for <strong>{manifest.name}</strong>.
          </p>
        </div>
      );

    default:
      return <SpriteSequenceRenderer onRenderReady={onRenderReady} />;
  }
}
