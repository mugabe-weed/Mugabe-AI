import React from 'react';
import { Sparkles, PlusCircle, History, Info, BookOpen, Globe2 } from 'lucide-react';

interface HeaderProps {
  onNewThread: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  historyCount: number;
  onOpenInfo: () => void;
  enableSearch: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onNewThread,
  onToggleHistory,
  isHistoryOpen,
  historyCount,
  onOpenInfo,
  enableSearch,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                Mugabe <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">AI</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Intelligent Question-Answering & Deep Exploration
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {enableSearch && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-lg">
              <Globe2 className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
              <span>Web Grounded</span>
            </div>
          )}

          <button
            onClick={onNewThread}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition rounded-lg shadow-sm shadow-indigo-600/30 cursor-pointer"
            title="Start fresh question thread"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden xs:inline">New Question</span>
          </button>

          <button
            onClick={onToggleHistory}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
              isHistoryOpen
                ? 'bg-slate-800 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900/80 text-slate-300 border-slate-750 hover:bg-slate-850 hover:text-white'
            }`}
            title="View saved question history"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {historyCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenInfo}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded-lg border border-slate-800 transition cursor-pointer"
            title="About OmniAsk AI"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
