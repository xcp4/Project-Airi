import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Check, X, Sliders, Cpu, History, Zap, Sparkles, 
  Trash2, RefreshCw, AlertCircle, Info, ChevronDown, ChevronUp, ShieldCheck
} from 'lucide-react';
import { skillRegistry } from '../services/skills/SkillRegistry';
import { skillManager } from '../services/skills/SkillManager';
import { companionBrain } from '../services/CompanionBrain';
import { conversationContext } from '../services/ConversationContext';
import { SkillExecutionInfo, SkillResult } from '../services/skills/types';
import { AppSettings } from '../types';

export default function SkillControlPanel({
  settings,
  onUpdate
}: {
  settings: AppSettings;
  onUpdate?: (updates: Partial<AppSettings>) => void;
}) {
  const [skills, setSkills] = useState(() => skillRegistry.getAllSkills());
  const [disabledSkills, setDisabledSkills] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('airi_disabled_skills');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [autopilotEnabled, setAutopilotEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('airi_skill_planner_enabled');
      return saved ? JSON.parse(saved) !== false : true;
    } catch {
      return true;
    }
  });

  const [recentLogs, setRecentLogs] = useState<SkillExecutionInfo[]>([]);
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [testParams, setTestParams] = useState<Record<string, any>>({});
  const [runningSkillId, setRunningSkillId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<Record<string, SkillResult>>({});

  // Sync state & register listeners
  useEffect(() => {
    setRecentLogs([...skillManager.getRecentExecutions()]);

    const handleExecutionUpdate = () => {
      setRecentLogs([...skillManager.getRecentExecutions()]);
    };

    const handleHistoryClear = () => {
      setRecentLogs([]);
    };

    window.addEventListener('airi-skill-execution', handleExecutionUpdate);
    window.addEventListener('airi-skill-execution-clear', handleHistoryClear);
    
    return () => {
      window.removeEventListener('airi-skill-execution', handleExecutionUpdate);
      window.removeEventListener('airi-skill-execution-clear', handleHistoryClear);
    };
  }, []);

  const handleToggleAutopilot = () => {
    const newVal = !autopilotEnabled;
    setAutopilotEnabled(newVal);
    localStorage.setItem('airi_skill_planner_enabled', JSON.stringify(newVal));
  };

  const handleToggleSkill = (skillId: string) => {
    let updatedDisabled: string[];
    if (disabledSkills.includes(skillId)) {
      updatedDisabled = disabledSkills.filter(id => id !== skillId);
    } else {
      updatedDisabled = [...disabledSkills, skillId];
    }
    setDisabledSkills(updatedDisabled);
    localStorage.setItem('airi_disabled_skills', JSON.stringify(updatedDisabled));

    // Hot-reload planning systems
    window.dispatchEvent(new CustomEvent('airi-disabled-skills-updated', {
      detail: updatedDisabled
    }));
  };

  const handleExpandSkill = (skillId: string) => {
    if (expandedSkillId === skillId) {
      setExpandedSkillId(null);
      setTestParams({});
    } else {
      setExpandedSkillId(skillId);
      // Pre-fill parameters with defaults from schema or empty values
      const skill = skills.find(s => s.id === skillId);
      const defaults: Record<string, any> = {};
      if (skill?.parameterSchema?.properties) {
        Object.entries(skill.parameterSchema.properties).forEach(([key, prop]: [string, any]) => {
          if (prop.default !== undefined) {
            defaults[key] = prop.default;
          } else if (prop.enum && prop.enum.length > 0) {
            defaults[key] = prop.enum[0];
          } else if (prop.type === 'boolean') {
            defaults[key] = false;
          } else if (prop.type === 'integer' || prop.type === 'number') {
            defaults[key] = 0;
          } else {
            defaults[key] = '';
          }
        });
      }
      setTestParams(defaults);
    }
  };

  const handleParamChange = (key: string, value: any) => {
    setTestParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExecuteSkill = async (skillId: string) => {
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;

    setRunningSkillId(skillId);
    try {
      const result = await skillManager.executeSkill(skillId, {
        message: '[Manual Dashboard Trigger]',
        history: [],
        emotions: companionBrain.getEmotions(),
        goal: conversationContext.getCurrentGoal(),
        userName: settings.userName,
        assistantName: settings.assistantName,
        parameters: testParams
      });

      setExecutionResult(prev => ({
        ...prev,
        [skillId]: result
      }));
    } catch (err: any) {
      setExecutionResult(prev => ({
        ...prev,
        [skillId]: {
          success: false,
          output: null,
          error: err.message || 'Execution failed'
        }
      }));
    } finally {
      setRunningSkillId(null);
    }
  };

  const handleClearLogs = () => {
    skillManager.clearHistory();
  };

  return (
    <div className="flex flex-col gap-5 text-left h-full">
      {/* Autopilot Overview Row */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">AI Skill Autopilot</span>
          </div>
          <button
            onClick={handleToggleAutopilot}
            className={`w-11 h-6 rounded-full p-1 transition-all duration-300 ${
              autopilotEnabled ? 'bg-pink-500' : 'bg-white/10'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
              autopilotEnabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
        <p className="text-[10px] text-white/50 leading-relaxed">
          When Autopilot is enabled, Gemini's cognitive core automatically detects user intents, plans appropriate skill execution sequences, and streams results directly back to the active thread.
        </p>
      </div>

      {/* Available Skills Heading */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <span className="text-white/40 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-pink-400" /> Discovered Skills ({skills.length})
        </span>
      </div>

      {/* Skills Grid */}
      <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
        {skills.map(skill => {
          const isEnabled = !disabledSkills.includes(skill.id);
          const isExpanded = expandedSkillId === skill.id;
          const isRunning = runningSkillId === skill.id;
          const result = executionResult[skill.id];

          return (
            <div
              key={skill.id}
              className={`border rounded-xl transition-all duration-300 bg-white/5 ${
                isEnabled 
                  ? 'border-white/5 hover:border-white/10' 
                  : 'border-white/5 opacity-50 bg-black/20'
              }`}
            >
              {/* Header card info */}
              <div className="p-3.5 flex items-start justify-between gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{skill.name}</span>
                    <span className="text-[8px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/50">{skill.id}</span>
                  </div>
                  <p className="text-[10px] text-white/60 leading-relaxed">{skill.description}</p>
                  
                  {/* Capabilities tags */}
                  {skill.capabilities && skill.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {skill.capabilities.map((cap: string) => (
                        <span key={cap} className="text-[8px] font-mono px-1.5 py-0.5 bg-pink-500/10 text-pink-300 rounded border border-pink-500/10">
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Switch Toggle */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleSkill(skill.id)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 ${
                      isEnabled ? 'bg-pink-500' : 'bg-white/10'
                    }`}
                    title={isEnabled ? 'Disable Skill' : 'Enable Skill'}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                      isEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Action and manual controls drawer */}
              {isEnabled && (
                <div className="border-t border-white/5 bg-black/25 rounded-b-xl">
                  <button
                    onClick={() => handleExpandSkill(skill.id)}
                    className="w-full px-3.5 py-2 flex items-center justify-between text-[10px] font-bold tracking-wider text-pink-400 hover:text-pink-300 hover:bg-white/5 transition-all rounded-b-xl"
                  >
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 animate-pulse" /> Manual Test Execution Panel
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3.5 pt-1 border-t border-white/5 flex flex-col gap-3.5 text-left">
                          {/* Dynamic Parameters */}
                          {skill.parameterSchema?.properties && (
                            <div className="flex flex-col gap-2.5 bg-black/30 p-2.5 rounded-lg border border-white/5">
                              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-0.5">Parameters Input</span>
                              {Object.entries(skill.parameterSchema.properties).map(([key, prop]: [string, any]) => {
                                const isRequired = skill.parameterSchema.required?.includes(key);
                                const currentValue = testParams[key];

                                return (
                                  <div key={key} className="flex flex-col gap-1 text-left">
                                    <div className="flex justify-between items-center">
                                      <label className="text-[10px] font-semibold text-white/80">
                                        {key} {isRequired && <span className="text-red-400 font-bold">*</span>}
                                      </label>
                                      <span className="text-[8px] font-mono text-white/35">({prop.type})</span>
                                    </div>

                                    {prop.enum ? (
                                      <select
                                        value={currentValue || ''}
                                        onChange={(e) => handleParamChange(key, e.target.value)}
                                        className="w-full bg-black/60 border border-white/10 rounded px-2 py-1.5 text-xs text-white cursor-pointer focus:outline-hidden focus:border-pink-500/50"
                                      >
                                        {prop.enum.map((opt: string) => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    ) : prop.type === 'boolean' ? (
                                      <button
                                        onClick={() => handleParamChange(key, !currentValue)}
                                        className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 ${
                                          currentValue ? 'bg-pink-500' : 'bg-white/10'
                                        }`}
                                      >
                                        <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                                          currentValue ? 'translate-x-4' : 'translate-x-0'
                                        }`} />
                                      </button>
                                    ) : (
                                      <input
                                        type={prop.type === 'integer' || prop.type === 'number' ? 'number' : 'text'}
                                        value={currentValue !== undefined ? currentValue : ''}
                                        onChange={(e) => handleParamChange(key, prop.type === 'integer' || prop.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                        className="w-full bg-black/60 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-pink-500/50"
                                        placeholder={`Enter ${key}...`}
                                      />
                                    )}
                                    {prop.description && (
                                      <p className="text-[9px] text-white/40 leading-normal">{prop.description}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Trigger button */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleExecuteSkill(skill.id)}
                              disabled={isRunning}
                              className="flex-1 py-1.5 rounded bg-pink-500 hover:bg-pink-600 disabled:bg-pink-500/20 text-[11px] text-white font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              {isRunning ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" /> Executing...
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3" /> Execute Test Run
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setExpandedSkillId(null);
                                setTestParams({});
                              }}
                              className="px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-[11px] text-white/60 font-bold transition cursor-pointer"
                            >
                              Close
                            </button>
                          </div>

                          {/* Output Display */}
                          {result && (
                            <div className="mt-1 bg-black/40 border border-white/10 rounded-lg p-2.5 flex flex-col gap-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Execution Result</span>
                                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${
                                  result.success 
                                    ? 'bg-green-500/10 text-green-400 border-green-500/25' 
                                    : 'bg-red-500/10 text-red-400 border-red-500/25'
                                }`}>
                                  {result.success ? 'Success' : 'Failed'}
                                </span>
                              </div>

                              {result.success ? (
                                <pre className="text-[9px] font-mono bg-black/50 p-2 rounded border border-white/5 text-emerald-400 max-h-32 overflow-auto select-all leading-normal whitespace-pre-wrap">
                                  {JSON.stringify(result.output, null, 2)}
                                </pre>
                              ) : (
                                <p className="text-[10px] text-red-400 leading-normal font-medium bg-red-500/5 p-2 rounded border border-red-500/10">
                                  Error: {result.error || 'Unknown execution error'}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Activity Logs Feed */}
      <div className="flex flex-col gap-3.5 mt-2 flex-1">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-white/40 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-pink-400" /> Live Execution Feed ({recentLogs.length})
          </span>
          {recentLogs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="text-[9px] text-white/30 hover:text-white flex items-center gap-1 transition"
            >
              <Trash2 className="w-3 h-3" /> Clear History
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto max-h-[300px] flex flex-col gap-2 pr-1">
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-xs border border-dashed border-white/5 rounded-xl bg-black/25">
              No recent skill logs found. Trigger a skill manually or converse with Airi!
            </div>
          ) : (
            recentLogs.map((log, idx) => {
              const skillObj = skills.find(s => s.id === log.skillId);
              const duration = log.endTime ? log.endTime - log.startTime : null;

              return (
                <div
                  key={`${log.skillId}-${log.startTime}-${idx}`}
                  className="bg-white/[0.02] border border-white/5 rounded-lg p-3 flex flex-col gap-1.5 text-left"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white/90">{skillObj?.name || log.skillId}</span>
                      <span className="text-[8px] text-white/35 font-mono">{new Date(log.startTime).toLocaleTimeString()}</span>
                    </div>

                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${
                      log.state === 'executing' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 animate-pulse' 
                        : log.state === 'success' 
                        ? 'bg-green-500/10 text-green-400 border-green-500/25'
                        : log.state === 'cancelled'
                        ? 'bg-slate-500/10 text-slate-400 border-slate-500/25'
                        : 'bg-red-500/10 text-red-400 border-red-500/25'
                    }`}>
                      {log.state}
                    </span>
                  </div>

                  {log.parameters && Object.keys(log.parameters).length > 0 && (
                    <div className="text-[9px] font-mono text-white/50 bg-black/20 p-1.5 rounded border border-white/5">
                      <span className="text-white/30">Inputs:</span> {JSON.stringify(log.parameters)}
                    </div>
                  )}

                  {log.result && (
                    <div className="text-[9px] font-mono text-white/60">
                      {log.result.success ? (
                        <div className="text-emerald-400 max-h-16 overflow-y-auto leading-normal bg-black/20 p-1.5 rounded border border-white/5">
                          <span className="text-white/30 text-[8px]">Output:</span> {JSON.stringify(log.result.output)}
                        </div>
                      ) : (
                        <div className="text-red-400 bg-red-500/5 p-1.5 rounded border border-red-500/10 font-sans">
                          {log.result.error || 'Execution failed'}
                        </div>
                      )}
                    </div>
                  )}

                  {duration !== null && (
                    <div className="text-[8px] font-mono text-white/30 text-right mt-0.5">
                      Duration: {duration}ms
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
