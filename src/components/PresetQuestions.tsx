import React, { useState } from 'react';
import { PRESET_CATEGORIES } from '../data/presets';
import { AnswerMode } from '../types';
import { Cpu, Atom, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

interface PresetQuestionsProps {
  onSelectQuestion: (question: string, mode: AnswerMode) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Cpu,
  Atom,
  CheckCircle2,
  Sparkles,
};

export const PresetQuestions: React.FC<PresetQuestionsProps> = ({ onSelectQuestion }) => {
  const [activeCategory, setActiveCategory] = useState(PRESET_CATEGORIES[0].id);

  const currentCategory =
    PRESET_CATEGORIES.find((cat) => cat.id === activeCategory) || PRESET_CATEGORIES[0];

  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-4 sm:p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/70">
        {PRESET_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.icon] || Sparkles;
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-850/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {currentCategory.questions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelectQuestion(q.question, q.mode)}
            className="flex flex-col justify-between p-3.5 rounded-xl bg-slate-850/70 hover:bg-slate-800 border border-slate-750/70 hover:border-indigo-500/40 text-left transition-all duration-200 group cursor-pointer shadow-sm hover:shadow-indigo-500/10"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                  {q.tag}
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase">{q.mode}</span>
              </div>
              <h4 className="text-sm font-medium text-slate-200 group-hover:text-white line-clamp-2">
                {q.title}
              </h4>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 group-hover:text-indigo-400 transition">
              <span className="text-[11px]">Click to ask immediately</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
