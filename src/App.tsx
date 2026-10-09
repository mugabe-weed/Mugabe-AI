import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { QuestionInput } from './components/QuestionInput';
import { AnswerCard } from './components/AnswerCard';
import { PresetQuestions } from './components/PresetQuestions';
import { SidebarHistory } from './components/SidebarHistory';
import { InfoModal } from './components/InfoModal';
import { Thread, Message, AnswerMode, GroundingMetadata } from './types';
import { Sparkles, HelpCircle, ArrowDownCircle, BookOpen, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'mugabe_ai_threads_v1';

export default function App() {
  const [threads, setThreads] = useState<Thread[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('omniask_ai_threads_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentThreadId, setCurrentThreadId] = useState<string>(() => {
    return `thread_${Date.now()}`;
  });

  const [currentMode, setCurrentMode] = useState<AnswerMode>('balanced');
  const [enableSearch, setEnableSearch] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Save threads to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    } catch (e) {
      console.error('Failed to save threads to localStorage:', e);
    }
  }, [threads]);

  // Find active thread
  const currentThread = threads.find((t) => t.id === currentThreadId);
  const messages = currentThread?.messages || [];

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isStreaming]);

  // Create fresh thread
  const handleNewThread = () => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
    const newId = `thread_${Date.now()}`;
    setCurrentThreadId(newId);
  };

  // Toggle favorite / bookmark on current thread
  const handleToggleBookmark = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, isBookmarked: !t.isBookmarked } : t))
    );
  };

  // Delete thread
  const handleDeleteThread = (threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (currentThreadId === threadId) {
      handleNewThread();
    }
  };

  // Clear all history
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all saved question history?')) {
      setThreads([]);
      handleNewThread();
    }
  };

  // Select thread from history
  const handleSelectThread = (threadId: string) => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
    setCurrentThreadId(threadId);
  };

  // Fetch follow-up suggestions in background
  const fetchFollowUps = async (question: string, answer: string, messageId: string) => {
    try {
      const res = await fetch('/api/suggest-followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer }),
      });
      const data = await res.json();
      if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setThreads((prev) =>
          prev.map((thread) => {
            if (thread.id !== currentThreadId) return thread;
            return {
              ...thread,
              messages: thread.messages.map((m) =>
                m.id === messageId ? { ...m, followUpSuggestions: data.suggestions } : m
              ),
            };
          })
        );
      }
    } catch (err) {
      console.warn('Could not fetch follow-up suggestions:', err);
    }
  };

  // Submit question
  const handleSubmitQuestion = async (
    questionText: string,
    modeOverride?: AnswerMode,
    isFollowUp: boolean = false
  ) => {
    if (!questionText.trim() || isStreaming) return;

    const mode = modeOverride || currentMode;

    // Abort any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessageId = `msg_user_${Date.now()}`;
    const aiMessageId = `msg_ai_${Date.now()}`;

    const userMsg: Message = {
      id: userMessageId,
      role: 'user',
      text: questionText,
      timestamp: Date.now(),
      mode,
    };

    const aiPlaceholderMsg: Message = {
      id: aiMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      mode,
      isStreaming: true,
    };

    // Update state with user message and AI placeholder
    setThreads((prev) => {
      const existing = prev.find((t) => t.id === currentThreadId);
      if (existing) {
        return prev.map((t) =>
          t.id === currentThreadId
            ? {
                ...t,
                updatedAt: Date.now(),
                messages: [...t.messages, userMsg, aiPlaceholderMsg],
              }
            : t
        );
      } else {
        const newThread: Thread = {
          id: currentThreadId,
          title: questionText.slice(0, 60),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [userMsg, aiPlaceholderMsg],
        };
        return [newThread, ...prev];
      }
    });

    setIsStreaming(true);

    // Prepare history payload for context
    const currentMsgs = currentThread?.messages || [];
    const historyPayload = currentMsgs.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    try {
      const response = await fetch('/api/ask/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          mode,
          enableSearch,
          history: historyPayload,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported.');

      const decoder = new TextDecoder();
      let accumulatedText = '';
      let groundingData: GroundingMetadata | undefined = undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.replace('event: ', '').trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            try {
              const data = JSON.parse(dataStr);
              if (currentEvent === 'chunk' && data.text) {
                accumulatedText += data.text;
                setThreads((prev) =>
                  prev.map((thread) => {
                    if (thread.id !== currentThreadId) return thread;
                    return {
                      ...thread,
                      messages: thread.messages.map((m) =>
                        m.id === aiMessageId ? { ...m, text: accumulatedText } : m
                      ),
                    };
                  })
                );
              } else if (currentEvent === 'grounding' && data.groundingMetadata) {
                const gm = data.groundingMetadata;
                const sources =
                  gm.groundingChunks?.map((c: any) => ({
                    title: c.web?.title || 'Web Source',
                    url: c.web?.uri || '#',
                  })) || [];

                groundingData = {
                  webSearchQueries: gm.webSearchQueries || [],
                  sources,
                };

                setThreads((prev) =>
                  prev.map((thread) => {
                    if (thread.id !== currentThreadId) return thread;
                    return {
                      ...thread,
                      messages: thread.messages.map((m) =>
                        m.id === aiMessageId ? { ...m, groundingMetadata: groundingData } : m
                      ),
                    };
                  })
                );
              } else if (currentEvent === 'error') {
                throw new Error(data.error || 'Stream error occurred.');
              }
            } catch (jsonErr) {
              // Ignore non-json or incomplete SSE chunks
            }
          }
        }
      }

      // Mark streaming as finished
      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== currentThreadId) return thread;
          return {
            ...thread,
            messages: thread.messages.map((m) =>
              m.id === aiMessageId ? { ...m, isStreaming: false } : m
            ),
          };
        })
      );

      // Trigger follow-up questions suggestions in background
      if (accumulatedText) {
        fetchFollowUps(questionText, accumulatedText, aiMessageId);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request aborted by user.');
        return;
      }
      console.error('Error answering question:', err);
      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== currentThreadId) return thread;
          return {
            ...thread,
            messages: thread.messages.map((m) =>
              m.id === aiMessageId
                ? {
                    ...m,
                    isStreaming: false,
                    error:
                      err.message ||
                      'An unexpected error occurred while communicating with Gemini AI.',
                  }
                : m
            ),
          };
        })
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Group messages into question-answer pairs
  const pairs: Array<{ user: Message; ai?: Message }> = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user') {
      const nextMsg = messages[i + 1]?.role === 'model' ? messages[i + 1] : undefined;
      pairs.push({
        user: messages[i],
        ai: nextMsg,
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header */}
      <Header
        onNewThread={handleNewThread}
        onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
        isHistoryOpen={isHistoryOpen}
        historyCount={threads.length}
        onOpenInfo={() => setIsInfoOpen(true)}
        enableSearch={enableSearch}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col">
        {/* If thread has messages: Render Q&A Conversation */}
        {pairs.length > 0 ? (
          <div className="flex-1 space-y-6 pb-24">
            {/* Thread Title Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200 truncate max-w-sm sm:max-w-md">
                  {currentThread?.title}
                </span>
                <span className="text-slate-600">·</span>
                <span>{pairs.length} {pairs.length === 1 ? 'question' : 'questions'}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleBookmark(currentThreadId)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition cursor-pointer ${
                    currentThread?.isBookmarked
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title="Bookmark this thread"
                >
                  <span>{currentThread?.isBookmarked ? '★ Starred' : '☆ Star'}</span>
                </button>

                <button
                  onClick={() => handleDeleteThread(currentThreadId)}
                  className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition cursor-pointer"
                  title="Delete current thread"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Answer Cards */}
            {pairs.map((pair, idx) => {
              if (!pair.ai) return null;
              return (
                <AnswerCard
                  key={pair.user.id}
                  userMessage={pair.user}
                  aiMessage={pair.ai}
                  onFollowUpClick={(suggestion) => handleSubmitQuestion(suggestion, undefined, true)}
                  onReaskMode={(q, m) => handleSubmitQuestion(q, m, false)}
                  isLatest={idx === pairs.length - 1}
                  isBookmarked={currentThread?.isBookmarked}
                  onToggleBookmark={() => handleToggleBookmark(currentThreadId)}
                />
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        ) : (
          /* Empty State: Hero Banner & Preset Questions */
          <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-10 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ask anything · Deep insights & Structured answers</span>
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-2xl">
              What question would you like answered today?
            </h2>

            <p className="mt-3 text-slate-400 text-sm sm:text-base max-w-xl">
              Get comprehensive explanations, step-by-step guides, simple ELI5 analogies, or technical breakdowns powered by Gemini 3.8 Flash.
            </p>

            {/* Curated Preset Inspiration Categories */}
            <PresetQuestions
              onSelectQuestion={(q, mode) => {
                setCurrentMode(mode);
                handleSubmitQuestion(q, mode, false);
              }}
            />
          </div>
        )}

        {/* Floating Bottom Control Bar */}
        <div className="sticky bottom-4 z-20 mt-auto pt-2 space-y-2 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pb-1">
          {/* Perspective & Search Grounding Selector */}
          <ModeSelector
            currentMode={currentMode}
            onSelectMode={setCurrentMode}
            enableSearch={enableSearch}
            onToggleSearch={setEnableSearch}
            disabled={isStreaming}
          />

          {/* Question Input Box */}
          <QuestionInput
            onSubmit={(q) => handleSubmitQuestion(q)}
            isLoading={isStreaming}
            mode={currentMode}
            placeholder={
              pairs.length > 0
                ? 'Ask a follow-up question or explore deeper...'
                : 'Ask any question... (e.g. How does photosynthesis work?, Explain Docker vs Kubernetes)'
            }
          />
        </div>
      </main>

      {/* History Drawer Modal */}
      <SidebarHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        threads={threads}
        currentThreadId={currentThreadId}
        onSelectThread={handleSelectThread}
        onDeleteThread={handleDeleteThread}
        onClearAll={handleClearAll}
        onNewThread={handleNewThread}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* About & Info Modal */}
      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </div>
  );
}
