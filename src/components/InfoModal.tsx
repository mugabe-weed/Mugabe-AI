import React from 'react';
import { X, Sparkles, Globe, Brain, Zap, Key, ShieldCheck, HelpCircle } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl p-6 z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">About Mugabe AI</h3>
              <p className="text-xs text-slate-400">Powered by Google Gemini 3.8 Flash</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3 rounded-xl bg-slate-850/60 border border-slate-750 flex items-start gap-3">
            <Brain className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white">5 Tailored Answering Modes</h4>
              <p className="text-slate-400 mt-0.5">
                Switch dynamically between <strong>Comprehensive</strong>, <strong>Concise</strong> (bullet summary), <strong>ELI5</strong> (simple analogies), <strong>Step-by-Step</strong> (actionable guide), and <strong>Deep Tech</strong> (technical rigor).
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-850/60 border border-slate-750 flex items-start gap-3">
            <Globe className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white">Real-Time Web Grounding</h4>
              <p className="text-slate-400 mt-0.5">
                Toggle <strong>Web Grounding</strong> to let the AI search current Google web data, citing real-world sources and links for verified facts.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-850/60 border border-slate-750 flex items-start gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white">Live Streaming & Audio Speech</h4>
              <p className="text-slate-400 mt-0.5">
                Answers stream progressively in real time. Listen to any answer with one-click Text-to-Speech (TTS), dictate questions with voice input, or copy code blocks instantly.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-850/60 border border-slate-750 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white">Interactive Follow-Ups & Memory</h4>
              <p className="text-slate-400 mt-0.5">
                Ask follow-up questions in the thread to delve deeper or clarify concepts. Click smart suggestion chips to continue learning.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Shortcuts: Press Enter to ask, Shift+Enter for newline</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
