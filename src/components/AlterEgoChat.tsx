import React, { useState, useEffect, useRef } from 'react';
import { User as FirebaseUser, db, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, getDoc, updateDoc } from '../lib/firebase';
import { generateAlterEgoResponse } from '../services/geminiService';
import { Send, RotateCcw, Sparkles, Brain, Heart, Info, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AlterEgoChatProps {
  user: any;
  chatId: string | null;
  onChatCreated: (id: string) => void;
}

export default function AlterEgoChat({ user, chatId, onChatCreated }: AlterEgoChatProps) {
  const [path, setPath] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    // Fetch path from chat doc
    getDoc(doc(db, 'chats', chatId)).then(snap => {
      if (snap.exists()) {
        setPath(snap.data().config?.path || '');
      }
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const startChat = async () => {
    if (!path.trim()) return;
    
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        userId: user.uid,
        type: 'alter-ego',
        title: path.length > 30 ? path.substring(0, 30) + '...' : path,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        config: { path },
        isSaved: false
      });
      onChatCreated(chatRef.id);
    } catch (err) {
      setError("Failed to start chat. Please try again.");
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chatId || isTyping) return;

    const userMessage = input;
    setInput('');
    setError(null);
    setIsTyping(true);

    try {
      // Add user message to firestore
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId,
        userId: user.uid,
        role: 'user',
        content: userMessage,
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessageAt: serverTimestamp()
      });

      // Prepare history for Gemini
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      history.push({ role: 'user', content: userMessage });

      const response = await generateAlterEgoResponse(path, history, user.personalityProfile);

      // Add model response to firestore
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId,
        userId: user.uid,
        role: 'model',
        content: response.content,
        emotions: response.emotions,
        confidenceMetrics: response.confidence,
        timestamp: serverTimestamp()
      });

    } catch (err) {
      setError("Failed to get response. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  if (!chatId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 space-y-8 max-w-2xl mx-auto">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto text-zinc-400">
            <Sparkles size={32} />
          </div>
          <h2 className="text-3xl font-serif italic text-zinc-900">The Path Not Taken</h2>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Describe a major life decision and the path you didn't take. 
            We'll simulate a conversation with the version of you who lives that reality.
          </p>
        </div>

        <div className="w-full space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 ml-1">Your Alternate Path</label>
            <textarea
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="e.g., I chose to study engineering instead of pursuing music..."
              className="w-full h-32 p-4 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none text-zinc-800 placeholder:text-zinc-300"
            />
          </div>
          <button
            onClick={startChat}
            disabled={!path.trim()}
            className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            <span>Start Chat</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <motion.div
            key={msg.id || idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex flex-col max-w-[85%]",
              msg.role === 'user' ? "ml-auto items-end" : "items-start"
            )}
          >
            <div className="flex items-end gap-2">
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 mb-1">
                  <UserIcon size={16} className="text-white" />
                </div>
              )}
              <div
                className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                  msg.role === 'user' 
                    ? "bg-zinc-900 text-white rounded-br-none" 
                    : "bg-zinc-50 text-zinc-800 border border-zinc-100 rounded-bl-none font-serif italic"
                )}
              >
                {msg.content}
              </div>
            </div>
            
            {msg.role === 'model' && msg.emotions && (
              <div className="mt-2 flex items-center gap-3 px-1">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                  <Heart size={10} className="text-rose-400" />
                  <span>{msg.emotions.primary}</span>
                  <span className="text-zinc-200">|</span>
                  <span className="italic normal-case font-normal text-zinc-500">{msg.emotions.nuance}</span>
                </div>
                {msg.confidenceMetrics && (
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                    <Brain size={10} className="text-indigo-400" />
                    <span>Confidence: {Math.round(msg.confidenceMetrics.understanding * 100)}%</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-zinc-400 italic text-xs animate-pulse">
            <Sparkles size={14} />
            <span>Reflecting on the other side...</span>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs text-center">
            {error}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-zinc-100 bg-white/80 backdrop-blur-md">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Talk to your other self..."
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="bg-zinc-900 text-white p-3 rounded-2xl hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-sm"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
