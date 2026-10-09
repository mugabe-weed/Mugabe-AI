import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, X, CornerDownLeft, Sparkles, Loader2 } from 'lucide-react';
import { AnswerMode } from '../types';

interface QuestionInputProps {
  onSubmit: (question: string) => void;
  isLoading: boolean;
  mode: AnswerMode;
  placeholder?: string;
}

export const QuestionInput: React.FC<QuestionInputProps> = ({
  onSubmit,
  isLoading,
  mode,
  placeholder = 'Ask any question... (e.g., "Explain how quantum computers work", "Why is the ocean salty?", "How to write clean code?")',
}) => {
  const [question, setQuestion] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setQuestion((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [question]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim() || isLoading) return;
    onSubmit(question.trim());
    setQuestion('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-750 p-2 sm:p-3 shadow-xl shadow-black/40 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all duration-200"
    >
      {/* Listening Banner */}
      {isListening && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-xs text-indigo-300 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>Listening... speak your question now</span>
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
          placeholder={placeholder}
          className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base resize-none focus:outline-none px-2 py-1 max-h-[180px] scrollbar-thin"
        />

        {question && !isLoading && (
          <button
            type="button"
            onClick={() => setQuestion('')}
            className="absolute right-2 top-2 p-1 text-slate-500 hover:text-slate-300 rounded transition"
            title="Clear text"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bottom Bar: Voice Input, Shortcut, Submit */}
      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {speechSupported && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={isLoading}
              className={`p-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                isListening
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`}
              title={isListening ? 'Stop listening' : 'Voice input (Dictate question)'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span className="hidden sm:inline">{isListening ? 'Stop' : 'Voice'}</span>
            </button>
          )}

          <span className="text-[11px] text-slate-500 hidden sm:inline-flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3 text-slate-600" />
            <span>Enter to ask</span>
            <span className="text-slate-600">·</span>
            <span>Shift+Enter for newline</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {question.length > 0 && (
            <span className="text-[11px] text-slate-500 hidden xs:inline">
              {question.length} chars
            </span>
          )}

          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shadow-md cursor-pointer ${
              question.trim() && !isLoading
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/30 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <span>Ask Mugabe AI</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};
