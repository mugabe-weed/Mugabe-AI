import React from 'react';
import { AnswerMode, ModeOption } from '../types';
import { Target, Lightbulb, Zap, Baby, ListOrdered, GraduationCap, Globe, Check } from 'lucide-react';

interface ModeSelectorProps {
  currentMode: AnswerMode;
  onSelectMode: (mode: AnswerMode) => void;
  enableSearch: boolean;
  onToggleSearch: (enabled: boolean) => void;
  disabled?: boolean;
}

const MODES: Array<{
  id: AnswerMode;
  label: string;
  tagline: string;
  icon: React.ElementType;
  badgeColor: string;
}> = [
  {
    id: 'brainstorm',
    label: 'Idea Lab',
    tagline: 'Prolific brainstorming & inventive solutions',
    icon: Lightbulb,
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    tagline: 'Comprehensive, structured breakdown',
    icon: Target,
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: 'concise',
    label: 'Concise',
    tagline: 'Quick 2-3 bullet answer',
    icon: Zap,
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'eli5',
    label: 'ELI5',
    tagline: 'Explain like I’m 5 with simple analogies',
    icon: Baby,
    badgeColor: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  },
  {
    id: 'steps',
    label: 'Steps',
    tagline: 'Numbered actionable walkthrough',
    icon: ListOrdered,
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'technical',
    label: 'Deep Tech',
    tagline: 'Architectural, mathematical & rigorous',
    icon: GraduationCap,
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  enableSearch,
  onToggleSearch,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm text-xs">
      {/* Mode pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1 hidden md:inline">
          Perspective:
        </span>
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectMode(mode.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-850/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-750/70'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={mode.tagline}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Web search grounding toggle */}
      <div className="flex items-center justify-end border-t sm:border-t-0 border-slate-800/70 pt-2 sm:pt-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggleSearch(!enableSearch)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
            enableSearch
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
              : 'bg-slate-850/80 text-slate-400 border-slate-750/70 hover:text-slate-200 hover:bg-slate-800'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Enable real-time Google Search grounding to retrieve live facts and reference sources"
        >
          <Globe className={`w-3.5 h-3.5 ${enableSearch ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span className="text-xs">Web Grounding</span>
          <span
            className={`w-2 h-2 rounded-full ${
              enableSearch ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
