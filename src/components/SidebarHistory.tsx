import React, { useState } from 'react';
import { Thread } from '../types';
import {
  X,
  Search,
  MessageSquare,
  Trash2,
  Clock,
  Bookmark,
  Star,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';

interface SidebarHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  threads: Thread[];
  currentThreadId: string;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onClearAll: () => void;
  onNewThread: () => void;
  onToggleBookmark: (threadId: string) => void;
}

export const SidebarHistory: React.FC<SidebarHistoryProps> = ({
  isOpen,
  onClose,
  threads,
  currentThreadId,
  onSelectThread,
  onDeleteThread,
  onClearAll,
  onNewThread,
  onToggleBookmark,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);

  if (!isOpen) return null;

  const filteredThreads = threads.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.messages.some((m) => m.text.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFav = filterFavorites ? t.isBookmarked : true;
    return matchesSearch && matchesFav;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-sm sm:max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full z-10">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-white text-sm">Question History</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-750">
              {threads.length}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar & Search */}
        <div className="p-3 border-b border-slate-800/80 space-y-2.5">
          <button
            onClick={() => {
              onNewThread();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start Fresh Question</span>
          </button>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search previous questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-850 border border-slate-750 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterFavorites(false)}
                className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                  !filterFavorites ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({threads.length})
              </button>
              <button
                onClick={() => setFilterFavorites(true)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                  filterFavorites
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Star className="w-3 h-3" />
                <span>Starred ({threads.filter((t) => t.isBookmarked).length})</span>
              </button>
            </div>

            {threads.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-slate-500 hover:text-red-400 transition cursor-pointer text-[11px]"
                title="Clear all stored questions"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* List of threads */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
          {filteredThreads.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
              <p>No questions found.</p>
              {searchTerm && <p className="mt-1 text-[11px]">Try adjusting your search.</p>}
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isActive = thread.id === currentThreadId;
              const dateStr = new Date(thread.updatedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={thread.id}
                  className={`group relative rounded-xl p-3 border transition-all text-left flex items-start justify-between gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500/40 text-white shadow-sm'
                      : 'bg-slate-850/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                  onClick={() => {
                    onSelectThread(thread.id);
                    onClose();
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate mb-1 text-slate-100 group-hover:text-white">
                      {thread.title || 'Untitled Question'}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{dateStr}</span>
                      <span>·</span>
                      <span>{thread.messages.length} msgs</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(thread.id)}
                      className={`p-1.5 rounded hover:bg-slate-700/60 transition cursor-pointer ${
                        thread.isBookmarked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                      }`}
                      title={thread.isBookmarked ? 'Unstar' : 'Star question'}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteThread(thread.id)}
                      className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-slate-700/60 transition cursor-pointer"
                      title="Delete question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
