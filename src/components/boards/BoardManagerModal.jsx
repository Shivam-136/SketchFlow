import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutGrid,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit3,
  Copy,
  ExternalLink,
  X,
  Clock,
  Calendar,
  Layers,
  AlertTriangle,
  Check,
  ArrowUpDown
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

export function BoardManagerModal() {
  const show = useCanvasStore((s) => s.showBoardManager);
  const setShow = useCanvasStore((s) => s.setShowBoardManager);
  const activeBoardId = useCanvasStore((s) => s.activeBoardId);
  const boardsList = useCanvasStore((s) => s.boardsList);
  const switchBoard = useCanvasStore((s) => s.switchBoard);
  const createBoard = useCanvasStore((s) => s.createBoard);
  const renameBoard = useCanvasStore((s) => s.renameBoard);
  const duplicateBoard = useCanvasStore((s) => s.duplicateBoard);
  const deleteBoard = useCanvasStore((s) => s.deleteBoard);
  const refreshBoardsList = useCanvasStore((s) => s.refreshBoardsList);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updated-desc'); // 'updated-desc' | 'created-desc' | 'created-asc' | 'name-asc' | 'name-desc' | 'elements-desc'
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Rename Dialog state
  const [renamingBoard, setRenamingBoard] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');

  // Delete Confirmation state
  const [deletingBoard, setDeletingBoard] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refresh boards list whenever modal opens
  useEffect(() => {
    if (show) {
      refreshBoardsList();
      setSearchQuery('');
      setActiveMenuId(null);
    }
  }, [show, refreshBoardsList]);

  // Filter and sort boards
  const filteredAndSortedBoards = useMemo(() => {
    let list = Array.isArray(boardsList) ? [...boardsList] : [];

    // Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((b) => (b.name || '').toLowerCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'updated-desc':
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        case 'created-desc':
          return (b.createdAt || 0) - (a.createdAt || 0);
        case 'created-asc':
          return (a.createdAt || 0) - (b.createdAt || 0);
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'elements-desc':
          return (b.elementCount || 0) - (a.elementCount || 0);
        default:
          return (b.updatedAt || 0) - (a.updatedAt || 0);
      }
    });

    return list;
  }, [boardsList, searchQuery, sortBy]);

  if (!show) return null;

  const handleOpenBoard = async (boardId) => {
    await switchBoard(boardId);
    setShow(false);
  };

  const handleCreateNew = async () => {
    await createBoard();
    setShow(false);
  };

  const handleStartRename = (board, e) => {
    e?.stopPropagation();
    setActiveMenuId(null);
    setRenamingBoard(board);
    setRenameValue(board.name || '');
    setRenameError('');
  };

  const handleConfirmRename = async (e) => {
    e.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError('Board name cannot be empty.');
      return;
    }

    try {
      await renameBoard(renamingBoard.id, trimmed);
      setRenamingBoard(null);
      setRenameValue('');
      setRenameError('');
    } catch (err) {
      setRenameError(err.message || 'Failed to rename board.');
    }
  };

  const handleDuplicate = async (boardId, e) => {
    e?.stopPropagation();
    setActiveMenuId(null);
    await duplicateBoard(boardId);
  };

  const handleStartDelete = (board, e) => {
    e?.stopPropagation();
    setActiveMenuId(null);
    setDeletingBoard(board);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBoard) return;
    setIsDeleting(true);
    try {
      await deleteBoard(deletingBoard.id);
      setDeletingBoard(null);
    } catch (err) {
      console.warn('Failed to delete board:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in">
      {/* Backdrop click to dismiss */}
      <div
        className="fixed inset-0"
        onClick={() => {
          setActiveMenuId(null);
          setShow(false);
        }}
      />

      {/* Main Dialog Container */}
      <div
        className="relative w-full max-w-4xl max-h-[88vh] bg-white dark:bg-zinc-900 rounded-3xl shadow-sketch-lg border border-zinc-200 dark:border-zinc-800 flex flex-col z-10 overflow-hidden text-zinc-800 dark:text-zinc-100 transition-colors duration-200"
        onClick={() => setActiveMenuId(null)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Whiteboards</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {boardsList.length}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage, switch, and organize your canvases</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Board</span>
            </button>
            <button
              type="button"
              onClick={() => setShow(false)}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search boards by name..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium hidden sm:inline">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl px-2.5 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="updated-desc">Recently Modified</option>
              <option value="created-desc">Creation Date (Newest)</option>
              <option value="created-asc">Creation Date (Oldest)</option>
              <option value="name-asc">Name (A – Z)</option>
              <option value="name-desc">Name (Z – A)</option>
              <option value="elements-desc">Most Elements</option>
            </select>
          </div>
        </div>

        {/* Board Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredAndSortedBoards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
                <LayoutGrid className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {searchQuery ? `No whiteboards match "${searchQuery}"` : 'No whiteboards yet'}
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mt-1 mb-4">
                {searchQuery
                  ? 'Try searching for a different board name or clear the filter.'
                  : 'Get started by creating your very first independent whiteboard.'}
              </p>
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-xl transition-colors"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
                >
                  Create Board
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredAndSortedBoards.map((board) => {
                const isActive = board.id === activeBoardId;
                const isMenuOpen = activeMenuId === board.id;

                return (
                  <div
                    key={board.id}
                    onClick={() => handleOpenBoard(board.id)}
                    className={`group relative flex flex-col rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                      isActive
                        ? 'border-indigo-500/80 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-1 ring-indigo-500/30'
                        : 'border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sketch'
                    }`}
                  >
                    {/* Thumbnail Preview Area */}
                    <div className="relative w-full h-32 bg-zinc-100 dark:bg-zinc-800/80 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-center overflow-hidden">
                      {board.thumbnail ? (
                        <img
                          src={board.thumbnail}
                          alt={board.name}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
                          <Layers className="w-8 h-8 stroke-[1.5] opacity-50 mb-1" />
                          <span className="text-[10px] font-medium tracking-wide">
                            {board.elementCount > 0 ? `${board.elementCount} elements` : 'Empty canvas'}
                          </span>
                        </div>
                      )}

                      {/* Active Status Badge */}
                      {isActive && (
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-semibold shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span>Active</span>
                        </div>
                      )}

                      {/* Element count tag */}
                      <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm text-[10px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                        {board.elementCount || 0} {board.elementCount === 1 ? 'element' : 'elements'}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                          title={board.name}
                        >
                          {board.name || 'Untitled Board'}
                        </h4>

                        {/* Three-dot menu trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(isMenuOpen ? null : board.id);
                            }}
                            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            aria-label="Board options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Action Popover Menu */}
                          {isMenuOpen && (
                            <div
                              className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mb-1 sm:mt-1 w-36 bg-white dark:bg-zinc-800 rounded-xl shadow-sketch-lg border border-zinc-200/80 dark:border-zinc-700 py-1 z-30 animate-in fade-in zoom-in-95"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenBoard(board.id)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors text-left font-medium"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Open</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleStartRename(board, e)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors text-left font-medium"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Rename</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDuplicate(board.id, e)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors text-left font-medium"
                              >
                                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Duplicate</span>
                              </button>
                              <div className="h-[1px] bg-zinc-100 dark:bg-zinc-700 my-1" />
                              <button
                                type="button"
                                onClick={(e) => handleStartDelete(board, e)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors text-left font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timestamps */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                        <div className="flex items-center gap-1" title={new Date(board.updatedAt).toLocaleString()}>
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(board.updatedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1" title={new Date(board.createdAt).toLocaleDateString()}>
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(board.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 text-[11px] text-zinc-400 flex-shrink-0">
          <span>{filteredAndSortedBoards.length} of {boardsList.length} whiteboards shown</span>
          <span>Auto-persisted in local IndexedDB</span>
        </div>
      </div>

      {/* Rename Board Dialog Modal */}
      {renamingBoard && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-zinc-900/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-sketch-lg border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Rename Whiteboard</h3>
              <button
                type="button"
                onClick={() => setRenamingBoard(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRename} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 block">
                  Board Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => {
                    setRenameValue(e.target.value);
                    if (renameError) setRenameError('');
                  }}
                  placeholder="Enter board name..."
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                {renameError && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{renameError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setRenamingBoard(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBoard && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-zinc-900/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-sketch-lg border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Delete Whiteboard</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-zinc-800 dark:text-zinc-200">"{deletingBoard.name}"</span>?
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingBoard(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition-all shadow-sm"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Board'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

