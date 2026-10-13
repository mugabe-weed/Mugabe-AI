import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  User,
  Copy,
  Check,
  Volume2,
  VolumeX,
  ExternalLink,
  RotateCcw,
  Download,
  Star,
  ChevronDown,
  ChevronUp,
  Globe,
  HelpCircle,
  FileText,
  FileCode,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Message, AnswerMode } from '../types';
import { renderMarkdown, stripMarkdown } from '../utils/markdown';

interface AnswerCardProps {
  userMessage: Message;
  aiMessage: Message;
  onFollowUpClick: (followUpQuestion: string) => void;
  onReaskMode?: (question: string, mode: AnswerMode) => void;
  onRegenerate?: () => void;
  onRetry?: () => void;
  isLatest: boolean;
  onToggleBookmark?: () => void;
  isBookmarked?: boolean;
}

export const AnswerCard: React.FC<AnswerCardProps> = ({
  userMessage,
  aiMessage,
  onFollowUpClick,
  onReaskMode,
  onRegenerate,
  onRetry,
  isLatest,
  onToggleBookmark,
  isBookmarked = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showSources, setShowSources] = useState(false);

  // Copy answer to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(aiMessage.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Text to speech using browser SpeechSynthesis
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      window.speechSynthesis.cancel();
      const plainText = stripMarkdown(aiMessage.text);
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  useEffect(() => {
    return () => {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlayingAudio]);

  // Export answer
  const handleDownload = (type: 'markdown' | 'text') => {
    const filename = `MugabeAI-${Date.now()}.${type === 'markdown' ? 'md' : 'txt'}`;
    const content =
      type === 'markdown'
        ? `# Question:\n${userMessage.text}\n\n# Answer:\n${aiMessage.text}\n\n_Answered by Mugabe AI (Gemini 3.8 Flash)_`
        : `Question: ${userMessage.text}\n\nAnswer:\n${stripMarkdown(aiMessage.text)}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const modeBadge = {
    brainstorm: { label: 'Idea Lab', bg: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
    balanced: { label: 'Comprehensive', bg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' },
    concise: { label: 'Concise', bg: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
    eli5: { label: 'ELI5', bg: 'bg-pink-500/10 text-pink-300 border-pink-500/20' },
    steps: { label: 'Step-by-Step', bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
    technical: { label: 'Technical', bg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' },
  }[aiMessage.mode || userMessage.mode || 'balanced'];

  const sources = aiMessage.groundingMetadata?.sources || [];
  const searchQueries = aiMessage.groundingMetadata?.webSearchQueries || [];

  return (
    <div className="space-y-4 my-6">
      {/* 1. User Question Card */}
      <div className="flex items-start gap-3 justify-end pl-6 sm:pl-12">
        <div className="flex flex-col items-end max-w-2xl w-full">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${modeBadge.bg}`}>
              {modeBadge.label}
            </span>
            <span className="text-[11px] text-slate-500">
              {new Date(userMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-4 py-3 shadow-lg shadow-indigo-900/20 text-sm sm:text-base font-normal leading-relaxed w-fit">
            {/* Attached files preview in user message */}
            {userMessage.attachments && userMessage.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-indigo-500/40">
                {userMessage.attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-900/60 border border-indigo-400/30 text-xs text-indigo-100"
                  >
                    {file.isImage ? (
                      <img
                        src={file.dataUrl}
                        alt={file.name}
                        className="w-5 h-5 rounded object-cover"
                      />
                    ) : file.type === 'application/pdf' ? (
                      <FileText className="w-3.5 h-3.5 text-red-300" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-cyan-300" />
                    )}
                    <span className="truncate max-w-[120px] text-[11px]">{file.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div>{userMessage.text}</div>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1 text-slate-300">
          <User className="w-4 h-4" />
        </div>
      </div>

      {/* 2. AI Answer Card */}
      <div className="flex items-start gap-3 pr-2 sm:pr-8">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-0.5 shrink-0 mt-1 shadow-md shadow-indigo-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="rounded-2xl rounded-tl-sm bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-xl shadow-black/20">
            {/* Header info bar */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white tracking-tight">Mugabe AI</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">Gemini 3.8 Flash</span>
                {aiMessage.isStreaming && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    Generating...
                  </span>
                )}
              </div>

              {/* Action shortcuts */}
              <div className="flex items-center gap-1">
                {onRegenerate && !aiMessage.isStreaming && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                    title="Regenerate this answer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                  title="Copy answer to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleToggleSpeech}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    isPlayingAudio
                      ? 'text-cyan-400 bg-cyan-500/20 border border-cyan-500/30 animate-pulse'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={isPlayingAudio ? 'Stop speaking' : 'Read aloud (Text-to-Speech)'}
                >
                  {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('markdown')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                  title="Export as Markdown"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Markdown rendered body / Error State */}
            {aiMessage.error ? (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 space-y-3">
                <div className="flex items-center gap-2 text-red-300 font-semibold text-sm">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Unable to complete response</span>
                </div>
                <p className="text-xs text-red-200/90 leading-relaxed">{aiMessage.error}</p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 border border-red-500/40 text-red-100 text-xs font-medium transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Question</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="markdown-body">
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(aiMessage.text || ''),
                  }}
                />

                {aiMessage.isStreaming && !aiMessage.text && (
                  <div className="flex items-center gap-2 py-4 text-slate-400 text-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                    </div>
                    <span>Analyzing context and structuring response...</span>
                  </div>
                )}
              </div>
            )}

            {/* Web Grounding Sources Accordion */}
            {(sources.length > 0 || searchQueries.length > 0) && (
              <div className="mt-5 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowSources(!showSources)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-slate-850/60 hover:bg-slate-850 border border-slate-800 text-xs font-medium text-slate-300 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Web Grounding Sources & Search Queries</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                      {sources.length || searchQueries.length}
                    </span>
                  </div>
                  {showSources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showSources && (
                  <div className="mt-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                    {searchQueries.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Searched Queries:
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {searchQueries.map((query, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px]"
                            >
                              "{query}"
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {sources.length > 0 ? (
                      <div className="space-y-1 pt-2">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Verified Reference Sources:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {sources.map((source, idx) => (
                            <a
                              key={idx}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition group"
                            >
                              <span className="truncate pr-2">{source.title || source.url}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs italic pt-1">
                        Live web search was executed, and the facts were verified without requiring external links.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions: Re-ask in different mode */}
            {onReaskMode && !aiMessage.isStreaming && !aiMessage.error && (
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span className="text-[11px] text-slate-500">Need a different perspective?</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['brainstorm', 'eli5', 'concise', 'steps', 'technical', 'balanced'] as AnswerMode[])
                    .filter((m) => m !== (aiMessage.mode || 'balanced'))
                    .slice(0, 3)
                    .map((targetMode) => {
                      const labels: Record<AnswerMode, string> = {
                        brainstorm: 'Brainstorm Ideas',
                        balanced: 'Comprehensive',
                        concise: 'Make Concise',
                        eli5: 'Explain Like I’m 5',
                        steps: 'As Step-by-Step',
                        technical: 'Deep Technical',
                      };
                      return (
                        <button
                          key={targetMode}
                          type="button"
                          onClick={() => onReaskMode(userMessage.text, targetMode)}
                          className="px-2.5 py-1 rounded-md bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750/70 transition cursor-pointer text-[11px] font-medium"
                        >
                          {labels[targetMode]}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Follow-up suggestions */}
          {aiMessage.followUpSuggestions && aiMessage.followUpSuggestions.length > 0 && !aiMessage.isStreaming && (
            <div className="mt-3 pl-2">
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-indigo-300">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Explore Further:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiMessage.followUpSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onFollowUpClick(suggestion)}
                    className="text-left px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-indigo-950/60 text-slate-300 hover:text-indigo-200 border border-slate-800 hover:border-indigo-500/40 text-xs transition-all shadow-sm cursor-pointer group flex items-center gap-1.5"
                  >
                    <span>{suggestion}</span>
                    <span className="text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
