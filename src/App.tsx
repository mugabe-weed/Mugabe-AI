import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { QuestionInput } from './components/QuestionInput';
import { AnswerCard } from './components/AnswerCard';
import { SidebarHistory } from './components/SidebarHistory';
import { InfoModal } from './components/InfoModal';
import { Thread, Message, AnswerMode, GroundingMetadata, AttachedFile } from './types';
import { Sparkles, HelpCircle, ArrowDownCircle, BookOpen, Trash2, ArrowUpRight } from 'lucide-react';

const STORAGE_KEY = 'mugabe_ai_threads_v1';

// Useful, sleek suggestion prompt chips for the home screen
const SUGGESTED_PROMPTS = [
  {
    title: '💡 10 innovative startup & app ideas using AI',
    mode: 'brainstorm' as AnswerMode,
  },
  {
    title: '💡 5 creative ways to market a product with $0 budget',
    mode: 'brainstorm' as AnswerMode,
  },
  {
    title: 'Explain Quantum Computing simply',
    mode: 'eli5' as AnswerMode,
  },
  {
    title: 'Step-by-step framework to master deep work',
    mode: 'steps' as AnswerMode,
  },
];

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

  // Stop in-flight generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    // Mark latest AI message as not streaming
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== currentThreadId) return thread;
        return {
          ...thread,
          messages: thread.messages.map((m, idx) =>
            idx === thread.messages.length - 1 && m.role === 'model'
              ? { ...m, isStreaming: false, text: m.text ? `${m.text} \n\n*[Generation stopped by user]*` : 'Generation was stopped.' }
              : m
          ),
        };
      })
    );
  };

  // Create fresh thread
  const handleNewThread = () => {
    if (isStreaming) {
      handleStopGeneration();
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
    if (isStreaming) {
      handleStopGeneration();
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
    attachments: AttachedFile[] = [],
    isFollowUp: boolean = false
  ) => {
    if ((!questionText.trim() && attachments.length === 0) || isStreaming) return;

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
      attachments: attachments.length > 0 ? attachments : undefined,
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
      const displayTitle = questionText.trim()
        ? questionText.slice(0, 60)
        : attachments[0]?.name || 'Analyzed Document';

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
          title: displayTitle,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [userMsg, aiPlaceholderMsg],
        };
        return [newThread, ...prev];
      }
    });

    setIsStreaming(true);

    // Prepare history payload for context (last 8 messages)
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
          attachments: attachments.map((a) => ({
            name: a.name,
            type: a.type,
            size: a.size,
            dataUrl: a.dataUrl,
          })),
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
      let sseBuffer = '';
      let accumulatedText = '';
      let groundingData: GroundingMetadata | undefined = undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        // Split on double newline (standard SSE event boundary)
        const eventBlocks = sseBuffer.split('\n\n');
        // Keep remainder (possibly incomplete block) in buffer
        sseBuffer = eventBlocks.pop() || '';

        for (const block of eventBlocks) {
          if (!block.trim()) continue;

          let eventName = 'message';
          let dataPayload = '';

          const lines = block.split('\n');
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventName = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataPayload = line.slice(6).trim();
            }
          }

          if (!dataPayload) continue;

          try {
            const data = JSON.parse(dataPayload);
            if (eventName === 'chunk' && data.text) {
              accumulatedText += data.text;
              setThreads((prev) =>
                prev.map((thread) =>
                  thread.id === currentThreadId
                    ? {
                        ...thread,
                        messages: thread.messages.map((m) =>
                          m.id === aiMessageId ? { ...m, text: accumulatedText } : m
                        ),
                      }
                    : thread
                )
              );
            } else if (eventName === 'grounding' && data.groundingMetadata) {
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
                prev.map((thread) =>
                  thread.id === currentThreadId
                    ? {
                        ...thread,
                        messages: thread.messages.map((m) =>
                          m.id === aiMessageId ? { ...m, groundingMetadata: groundingData } : m
                        ),
                      }
                    : thread
                )
              );
            } else if (eventName === 'done') {
              if (data.fullAnswer && !accumulatedText) {
                accumulatedText = data.fullAnswer;
              }
            } else if (eventName === 'error') {
              throw new Error(data.error || 'Streaming error occurred.');
            }
          } catch (jsonErr) {
            console.warn('Incomplete or non-JSON SSE payload:', jsonErr);
          }
        }
      }

      // If stream finished with empty text (e.g. proxy buffering or edge case), fallback to non-streaming endpoint
      if (!accumulatedText.trim()) {
        console.warn('Stream returned empty answer, running non-streaming fallback...');
        const fallbackRes = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: questionText,
            mode,
            enableSearch,
            history: historyPayload,
            attachments: attachments.map((a) => ({
              name: a.name,
              type: a.type,
              size: a.size,
              dataUrl: a.dataUrl,
            })),
          }),
        });

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          accumulatedText = fallbackData.answer || '';
          if (fallbackData.groundingMetadata) {
            const gm = fallbackData.groundingMetadata;
            groundingData = {
              webSearchQueries: gm.webSearchQueries || [],
              sources: gm.groundingChunks?.map((c: any) => ({
                title: c.web?.title || 'Web Source',
                url: c.web?.uri || '#',
              })) || [],
            };
          }
        }
      }

      // Mark streaming as finished and set final text
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === currentThreadId
            ? {
                ...thread,
                messages: thread.messages.map((m) =>
                  m.id === aiMessageId
                    ? {
                        ...m,
                        text: accumulatedText || 'Could not generate an answer. Please try asking again.',
                        groundingMetadata: groundingData,
                        isStreaming: false,
                      }
                    : m
                ),
              }
            : thread
        )
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
      console.warn('Streaming error, attempting non-streaming fallback endpoint:', err);

      try {
        const fallbackRes = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: questionText,
            mode,
            enableSearch,
            history: historyPayload,
            attachments: attachments.map((a) => ({
              name: a.name,
              type: a.type,
              size: a.size,
              dataUrl: a.dataUrl,
            })),
          }),
        });

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.answer) {
            const gm = fallbackData.groundingMetadata;
            const groundingData = gm
              ? {
                  webSearchQueries: gm.webSearchQueries || [],
                  sources:
                    gm.groundingChunks?.map((c: any) => ({
                      title: c.web?.title || 'Web Source',
                      url: c.web?.uri || '#',
                    })) || [],
                }
              : undefined;

            setThreads((prev) =>
              prev.map((thread) =>
                thread.id === currentThreadId
                  ? {
                      ...thread,
                      messages: thread.messages.map((m) =>
                        m.id === aiMessageId
                          ? {
                              ...m,
                              text: fallbackData.answer,
                              groundingMetadata: groundingData,
                              isStreaming: false,
                              error: undefined,
                            }
                          : m
                      ),
                    }
                  : thread
              )
            );
            return;
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback endpoint also failed:', fallbackErr);
      }

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
                      'An unexpected error occurred while communicating with Gemini AI. Check your connection or API configuration.',
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

  // Handle re-asking or regenerating a pair
  const handleRegeneratePair = (pair: { user: Message; ai?: Message }) => {
    handleSubmitQuestion(pair.user.text, pair.user.mode, pair.user.attachments || []);
  };

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
          <div className="flex-1 space-y-6 pb-28">
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
                  onFollowUpClick={(suggestion) => handleSubmitQuestion(suggestion, undefined, [], true)}
                  onReaskMode={(q, m) => handleSubmitQuestion(q, m, pair.user.attachments || [])}
                  onRegenerate={() => handleRegeneratePair(pair)}
                  onRetry={() => handleRegeneratePair(pair)}
                  isLatest={idx === pairs.length - 1}
                  isBookmarked={currentThread?.isBookmarked}
                  onToggleBookmark={() => handleToggleBookmark(currentThreadId)}
                />
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        ) : (
          /* Empty State: Hero Banner with Minimal Prompt Suggestions */
          <div className="flex-1 flex flex-col items-center justify-center py-12 sm:py-20 text-center my-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Deep Research & Intelligent Question-Answering</span>
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-2xl">
              What question would you like answered today?
            </h2>

            <p className="mt-3 text-slate-400 text-sm sm:text-base max-w-lg">
              Ask anything, attach PDF documents or images, and get rigorous, well-structured answers from Mugabe AI.
            </p>

            {/* Sleek, Non-intrusive Suggested Quick Prompts */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl text-left">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCurrentMode(prompt.mode);
                    handleSubmitQuestion(prompt.title, prompt.mode);
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-850 border border-slate-800/80 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition group cursor-pointer shadow-sm"
                >
                  <span className="truncate pr-2 font-medium">{prompt.title}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              ))}
            </div>
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
            onSubmit={(q, files) => handleSubmitQuestion(q, undefined, files)}
            onStopGeneration={handleStopGeneration}
            isLoading={isStreaming}
            mode={currentMode}
            placeholder={
              pairs.length > 0
                ? 'Ask a follow-up question or attach documents/images...'
                : 'Ask any question or attach files... (e.g. How does photosynthesis work?, Analyze this PDF)'
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
