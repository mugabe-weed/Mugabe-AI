import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  X,
  CornerDownLeft,
  Loader2,
  Paperclip,
  FileText,
  FileCode,
  Image as ImageIcon,
  Square,
  AlertCircle,
} from 'lucide-react';
import { AnswerMode, AttachedFile } from '../types';

interface QuestionInputProps {
  onSubmit: (question: string, attachments?: AttachedFile[]) => void;
  onStopGeneration?: () => void;
  isLoading: boolean;
  mode: AnswerMode;
  placeholder?: string;
}

export const QuestionInput: React.FC<QuestionInputProps> = ({
  onSubmit,
  onStopGeneration,
  isLoading,
  mode,
  placeholder = 'Ask any question or attach documents/images... (Enter to ask, Shift+Enter for newline)',
}) => {
  const [question, setQuestion] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setQuestion((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
        }
        setIsListening(false);
        setVoiceError(null);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission denied. Please allow microphone access in your browser.');
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech detected. Please try speaking again.');
        } else {
          setVoiceError(`Voice input error (${event.error}).`);
        }
        setTimeout(() => setVoiceError(null), 5000);
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
    if ((!question.trim() && attachments.length === 0) || isLoading) return;
    onSubmit(question.trim(), attachments);
    setQuestion('');
    setAttachments([]);
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
      setVoiceError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      }
    }
  };

  // Handle file uploads (Images, PDFs, Text files)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 4 - attachments.length;
    if (remainingSlots <= 0) {
      alert('You can attach a maximum of 4 files per question.');
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots);

    selectedFiles.forEach((file) => {
      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        alert(`"${file.name}" exceeds the 10MB size limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const isImage = file.type.startsWith('image/');
        const isDocument =
          file.type === 'application/pdf' ||
          file.type.startsWith('text/') ||
          file.type === 'application/json';

        const newAttachment: AttachedFile = {
          id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          dataUrl,
          isImage,
          isDocument,
        };

        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          <span>Listening... speak your question clearly into your microphone</span>
        </div>
      )}

      {/* Voice Error Banner */}
      {voiceError && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-500/40 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
          <span>{voiceError}</span>
        </div>
      )}

      {/* Attached Files Preview Chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 shadow-sm"
            >
              {file.isImage ? (
                <img
                  src={file.dataUrl}
                  alt={file.name}
                  className="w-5 h-5 rounded object-cover border border-slate-600"
                />
              ) : file.type === 'application/pdf' ? (
                <FileText className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
              )}
              <div className="flex flex-col max-w-[140px] sm:max-w-[180px]">
                <span className="truncate font-medium text-[11px] leading-tight">{file.name}</span>
                <span className="text-[9px] text-slate-400">{formatFileSize(file.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(file.id)}
                className="p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition"
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.csv,.md,.json"
        onChange={handleFileChange}
        className="hidden"
      />

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

      {/* Bottom Bar: Attachments, Voice Input, Stop, Submit */}
      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* File Attachment Button */}
          <button
            type="button"
            disabled={isLoading || attachments.length >= 4}
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              attachments.length > 0
                ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            } ${attachments.length >= 4 ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Attach documents (PDF, TXT, CSV, MD) or images (PNG, JPG)"
          >
            <Paperclip className="w-4 h-4" />
            <span className="hidden sm:inline">Attach</span>
          </button>

          {/* Voice Input */}
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

          <span className="text-[11px] text-slate-500 hidden md:inline-flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3 text-slate-600" />
            <span>Enter to ask</span>
            <span className="text-slate-600">·</span>
            <span>Shift+Enter for newline</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Stop Generation Button when streaming */}
          {isLoading && onStopGeneration && (
            <button
              type="button"
              onClick={onStopGeneration}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs font-semibold shadow-md transition active:scale-95 cursor-pointer"
              title="Stop response generation"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          )}

          {/* Submit Button */}
          {!isLoading ? (
            <button
              type="submit"
              disabled={!question.trim() && attachments.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shadow-md cursor-pointer ${
                question.trim() || attachments.length > 0
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/30 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <span>Ask Mugabe AI</span>
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Generating...</span>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};
