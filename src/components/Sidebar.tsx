import { useState, useEffect, useMemo } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, User, limit, updateDoc, doc } from '../lib/firebase';
import { MessageSquare, Split, LogOut, ChevronLeft, ChevronRight, Trash2, Bookmark, Search, Brain, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeMode: 'alter-ego' | 'split-personality' | 'personality-test';
  setActiveMode: (mode: 'alter-ego' | 'split-personality' | 'personality-test') => void;
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  user: any;
  onLogout: () => void;
}

export default function Sidebar({
  isOpen,
  setIsOpen,
  activeMode,
  setActiveMode,
  currentChatId,
  setCurrentChatId,
  user,
  onLogout
}: SidebarProps) {
  const [chats, setChats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const isProfileComplete = !!user?.personalityProfile;

  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      where('userId', '==', user.uid),
      where('isSaved', '==', true),
      orderBy('lastMessageAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChats(chatList);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMode = chat.type === activeMode;
      return matchesSearch && matchesMode;
    });
  }, [chats, searchQuery, activeMode]);

  const handleRename = async (chatId: string) => {
    if (!editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    await updateDoc(doc(db, 'chats', chatId), {
      title: editingTitle.trim()
    });
    setEditingChatId(null);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 280 : 0 }}
      className={cn(
        "h-full bg-white border-r border-zinc-100 flex flex-col overflow-hidden transition-all duration-300 ease-in-out z-20",
        !isOpen && "border-none"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        <h1 className="font-serif italic text-xl text-zinc-900 whitespace-nowrap">Identity Mirror</h1>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-zinc-100 rounded text-zinc-400 lg:hidden"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="px-3 space-y-1">
        <button
          onClick={() => setActiveMode('personality-test')}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-4",
            activeMode === 'personality-test' 
              ? "bg-zinc-900 text-white shadow-md" 
              : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
          )}
        >
          <div className="flex items-center gap-3">
            <Brain size={18} className={activeMode === 'personality-test' ? "text-white" : "text-zinc-400"} />
            <span>Identity Profile</span>
          </div>
          {isProfileComplete ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
            <AlertCircle size={16} className="text-rose-500 animate-pulse" />
          )}
        </button>

        <div className="h-px bg-zinc-100 mx-3 my-4" />

        <button
          onClick={() => setActiveMode('alter-ego')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
            activeMode === 'alter-ego' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
          )}
        >
          <MessageSquare size={18} />
          <span>Alter Ego</span>
        </button>
        <button
          onClick={() => setActiveMode('split-personality')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
            activeMode === 'split-personality' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
          )}
        >
          <Split size={18} />
          <span>Split Personality</span>
        </button>
      </div>

      <div className="mt-8 flex-1 overflow-y-auto px-3 space-y-4">
        <div className="px-3 space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {activeMode === 'alter-ego' ? 'Alter Ego History' : 'Debate History'}
            </span>
            <span className="text-[10px] font-bold text-zinc-300">{filteredChats.length}</span>
          </div>
        </div>
        
        <div className="space-y-1">
          {filteredChats.map((chat) => (
            <div key={chat.id} className="relative group">
              {editingChatId === chat.id ? (
                <div className="px-3 py-2">
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleRename(chat.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(chat.id);
                      if (e.key === 'Escape') setEditingChatId(null);
                    }}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setCurrentChatId(chat.id)}
                  onDoubleClick={() => {
                    setEditingChatId(chat.id);
                    setEditingTitle(chat.title);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-sm group relative flex items-center gap-3 transition-all",
                    currentChatId === chat.id 
                      ? "bg-zinc-100 text-zinc-900 font-medium" 
                      : "text-zinc-500 hover:bg-zinc-50"
                  )}
                >
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    chat.isSaved ? "bg-amber-400" : "bg-zinc-200"
                  )} />
                  <span className="truncate flex-1">{chat.title}</span>
                  {chat.isSaved && <Bookmark size={12} className="text-amber-400" />}
                </button>
              )}
            </div>
          ))}
          {chats.length === 0 && (
            <div className="px-3 py-8 text-center space-y-2">
              <p className="text-xs text-zinc-400">No chats yet.</p>
              <p className="text-[10px] text-zinc-300 italic">Start a new reflection above.</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-zinc-100 bg-zinc-50/50">
        <div className="flex items-center gap-3 px-2 py-2">
          <img 
            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
            alt={user.displayName || 'User'} 
            className="w-8 h-8 rounded-full border border-zinc-200"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-900 truncate">{user.displayName}</p>
            <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 hover:bg-zinc-200 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
