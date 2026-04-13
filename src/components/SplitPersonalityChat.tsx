import React, { useState, useEffect, useRef } from 'react';
import { User, db, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, getDoc, updateDoc } from '../lib/firebase';
import { generateSplitPersonalityResponse, PersonalityConfig, AgentType } from '../services/geminiService';
import { Send, Split, Brain, Heart, Zap, Shield, Info, AlertCircle, ThumbsDown, MessageSquare, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SplitPersonalityChatProps {
  user: any;
  chatId: string | null;
  onChatCreated: (id: string) => void;
}

export default function SplitPersonalityChat({ user, chatId, onChatCreated }: SplitPersonalityChatProps) {
  const [config, setConfig] = useState<PersonalityConfig>({
    love: 50,
    ambition: 50,
    anxiety: 50,
    riskTolerance: 50,
    empathy: 50,
    creativity: 50,
    discipline: 50,
    curiosity: 50,
    resilience: 50
  });
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState<AgentType | null>(null);
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

    getDoc(doc(db, 'chats', chatId)).then(snap => {
      if (snap.exists()) {
        const savedConfig = snap.data().config?.personality;
        if (savedConfig) setConfig(savedConfig);
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
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        userId: user.uid,
        type: 'split-personality',
        title: 'Inner Debate',
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        config: { personality: config },
        isSaved: false
      });
      onChatCreated(chatRef.id);
    } catch (err) {
      setError("Failed to start debate.");
    }
  };

  const updateConfig = async (newConfig: Partial<PersonalityConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    if (chatId) {
      await updateDoc(doc(db, 'chats', chatId), {
        'config.personality': updated
      });
    }
  };

  const triggerAgent = async (agentType: AgentType, currentHistory: any[]) => {
    setIsTyping(agentType);
    try {
      const response = await generateSplitPersonalityResponse(agentType, config, currentHistory, user.personalityProfile);
      
      const msgData = {
        chatId,
        userId: user.uid,
        role: 'model',
        agentType,
        content: response.content,
        emotions: response.emotions,
        confidenceMetrics: response.confidence,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'chats', chatId!, 'messages'), msgData);
      return msgData;
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(null);
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chatId || isTyping) return;

    const userMessage = input;
    setInput('');
    setError(null);

    try {
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

      // Sequential debate: Logical -> Emotional -> Impulsive
      const history = messages.map(m => ({ role: m.role, content: m.content, agentType: m.agentType }));
      history.push({ role: 'user', content: userMessage });

      const logicalMsg = await triggerAgent('logical', history);
      if (logicalMsg) history.push({ role: 'model', content: logicalMsg.content, agentType: 'logical' });
      
      const emotionalMsg = await triggerAgent('emotional', history);
      if (emotionalMsg) history.push({ role: 'model', content: emotionalMsg.content, agentType: 'emotional' });

      await triggerAgent('impulsive', history);

    } catch (err) {
      setError("The debate was interrupted.");
    }
  };

  const flagMessage = async (messageId: string) => {
    // Simple feedback loop
    await updateDoc(doc(db, 'chats', chatId!, 'messages', messageId), {
      flagged: true
    });
    alert("Feedback received. The agents will learn from this.");
  };

  if (!chatId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 space-y-8 max-w-2xl mx-auto">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto text-zinc-400">
            <Split size={32} />
          </div>
          <h2 className="text-3xl font-serif italic text-zinc-900">Inner Debate</h2>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Calibrate your personas and engage in a multi-agent debate about your current life decisions.
          </p>
        </div>

        <CalibrationPanel config={config} onChange={updateConfig} />

        <button
          onClick={startChat}
          className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-medium hover:bg-zinc-800 transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <Split size={18} />
          <span>Start Debate</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <motion.div
            key={msg.id || idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex flex-col max-w-[90%]",
              msg.role === 'user' ? "ml-auto items-end" : "items-start"
            )}
          >
            <div className="flex items-start gap-3">
              {msg.role === 'model' && (
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-1 shadow-sm",
                  msg.agentType === 'logical' ? "bg-indigo-50 text-indigo-600" :
                  msg.agentType === 'emotional' ? "bg-rose-50 text-rose-600" :
                  "bg-amber-50 text-amber-600"
                )}>
                  {msg.agentType === 'logical' ? <Brain size={20} /> :
                   msg.agentType === 'emotional' ? <Heart size={20} /> :
                   <Zap size={20} />}
                </div>
              )}
              <div className="space-y-2">
                <div
                  className={cn(
                    "px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-sm relative group",
                    msg.role === 'user' 
                      ? "bg-zinc-900 text-white rounded-tr-none" 
                      : "bg-white border border-zinc-100 rounded-tl-none text-zinc-800"
                  )}
                >
                  {msg.role === 'model' && (
                    <span className="block text-[10px] font-bold uppercase tracking-widest mb-2 opacity-50">
                      {msg.agentType}
                    </span>
                  )}
                  {msg.content}
                  
                  {msg.role === 'model' && (
                    <button 
                      onClick={() => flagMessage(msg.id)}
                      className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-300 hover:text-red-400 transition-all"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  )}
                </div>

                {msg.role === 'model' && msg.confidenceMetrics && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-1">
                    {Object.entries(msg.confidenceMetrics).map(([key, val]: [string, any]) => (
                      key !== 'overall' && typeof val === 'number' && (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-bold uppercase text-zinc-400">{key}</span>
                          <div className="flex-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-zinc-300 rounded-full" 
                              style={{ width: `${val * 100}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-medium text-zinc-500">{Math.round(val * 100)}%</span>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-3 text-zinc-400 italic text-xs animate-pulse">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
            <span>{isTyping} is formulating a perspective...</span>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-zinc-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-8 px-2">
            <CalibrationPanel config={config} onChange={updateConfig} compact />
          </div>
          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your personas about a decision..."
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || !!isTyping}
              className="bg-zinc-900 text-white p-3 rounded-2xl hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-sm"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function CalibrationPanel({ config, onChange, compact }: { config: PersonalityConfig, onChange: (c: Partial<PersonalityConfig>) => void, compact?: boolean }) {
  const sliders = [
    { key: 'love', label: 'Love & Connection', icon: <Heart size={14} /> },
    { key: 'ambition', label: 'Ambition & Drive', icon: <Zap size={14} /> },
    { key: 'anxiety', label: 'Anxiety & Caution', icon: <Shield size={14} /> },
    { key: 'riskTolerance', label: 'Risk Tolerance', icon: <AlertCircle size={14} /> },
    { key: 'empathy', label: 'Empathy', icon: <Heart size={14} className="text-rose-400" /> },
    { key: 'creativity', label: 'Creativity', icon: <Sparkles size={14} className="text-indigo-400" /> },
    { key: 'discipline', label: 'Discipline', icon: <Shield size={14} className="text-emerald-400" /> },
    { key: 'curiosity', label: 'Curiosity', icon: <Brain size={14} className="text-amber-400" /> },
    { key: 'resilience', label: 'Resilience', icon: <Zap size={14} className="text-blue-400" /> },
  ];

  return (
    <div className={cn(
      "w-full grid gap-6", 
      compact ? "grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4" : "grid-cols-1 md:grid-cols-2"
    )}>
      {sliders.map((s) => (
        <div key={s.key} className="space-y-2">
          {!compact && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {s.icon}
                <span>{s.label}</span>
              </div>
              <span className="text-[10px] font-medium text-zinc-900">{config[s.key as keyof PersonalityConfig]}%</span>
            </div>
          )}
          <input
            type="range"
            min="0"
            max="100"
            value={config[s.key as keyof PersonalityConfig]}
            onChange={(e) => onChange({ [s.key]: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-900"
          />
          {compact && (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1 text-[8px] font-bold uppercase text-zinc-400 truncate max-w-full">
                {s.icon}
                <span className="truncate">{s.label.split(' ')[0]}</span>
              </div>
              <span className="text-[8px] font-medium text-zinc-500">{config[s.key as keyof PersonalityConfig]}%</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
