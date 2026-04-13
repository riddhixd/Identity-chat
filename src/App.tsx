/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth, db, onAuthStateChanged, User, signInWithPopup, googleProvider, doc, setDoc, getDoc, updateDoc, onSnapshot } from './lib/firebase';
import { LogIn, User as UserIcon, MessageSquare, Split, History, LogOut, Plus, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AlterEgoChat from './components/AlterEgoChat';
import SplitPersonalityChat from './components/SplitPersonalityChat';
import Sidebar from './components/Sidebar';
import PersonalityAssessment from './components/PersonalityAssessment';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<'alter-ego' | 'split-personality' | 'personality-test'>('alter-ego');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isNamingChat, setIsNamingChat] = useState(false);
  const [newChatName, setNewChatName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Sync user to firestore
        const userRef = doc(db, 'users', user.uid);
        
        // Use onSnapshot for real-time user profile updates (including personalityProfile)
        const unsubUser = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUser({ ...user, ...snap.data() });
          } else {
            setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
            });
            setUser(user);
          }
          setLoading(false);
        });

        return () => unsubUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setLoginError("The login popup was closed before completion. Please try again.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore this one as it usually means another popup was opened
      } else {
        setLoginError("An unexpected error occurred during login. Please try again.");
      }
    }
  };

  const handleLogout = () => auth.signOut();

  const handleSaveChat = async () => {
    if (!currentChatId) return;
    setIsNamingChat(true);
    // Try to get current title as default
    const chatSnap = await getDoc(doc(db, 'chats', currentChatId));
    if (chatSnap.exists()) {
      setNewChatName(chatSnap.data().title || '');
    }
  };

  const confirmSaveChat = async () => {
    if (!currentChatId || !newChatName.trim()) return;
    await updateDoc(doc(db, 'chats', currentChatId), {
      isSaved: true,
      title: newChatName.trim()
    });
    setIsNamingChat(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#fafafa]">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-zinc-400 font-medium"
        >
          Identity Mirror
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#fafafa] p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-serif italic text-zinc-900">Identity Mirror</h1>
            <p className="text-zinc-500">Explore the paths not taken and the voices within.</p>
          </div>
          
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-zinc-900 text-white py-4 px-6 rounded-2xl hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <LogIn size={20} />
            <span className="font-medium">Sign in with Google</span>
          </button>

          {loginError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm"
            >
              {loginError}
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-8">
            <div className="p-4 bg-white rounded-2xl border border-zinc-100 text-left space-y-2">
              <MessageSquare size={20} className="text-zinc-400" />
              <h3 className="font-medium text-zinc-900">Alter Ego</h3>
              <p className="text-xs text-zinc-500">Talk to the version of you that chose differently.</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-zinc-100 text-left space-y-2">
              <Split size={20} className="text-zinc-400" />
              <h3 className="font-medium text-zinc-900">Split Personality</h3>
              <p className="text-xs text-zinc-500">Debate life decisions with your inner voices.</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-[#fafafa] overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        currentChatId={currentChatId}
        setCurrentChatId={setCurrentChatId}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 border-b border-zinc-100 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg text-zinc-500"
            >
              <History size={20} />
            </button>
            <h2 className="font-medium text-zinc-900">
              {activeMode === 'alter-ego' ? 'Alter Ego Chat' : 
               activeMode === 'split-personality' ? 'Split Personality Mode' : 
               'Personality Assessment'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {activeMode !== 'personality-test' && (
              <>
                {currentChatId && (
                  <button
                    onClick={handleSaveChat}
                    className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors mr-4"
                  >
                    <Bookmark size={18} />
                    <span>Save Chat</span>
                  </button>
                )}
                <button
                  onClick={() => setCurrentChatId(null)}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  <Plus size={18} />
                  <span>New Chat</span>
                </button>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence>
            {isNamingChat && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm p-6"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white border border-zinc-100 shadow-2xl rounded-3xl p-8 max-w-sm w-full space-y-6"
                >
                  <div className="space-y-2">
                    <h3 className="text-xl font-serif italic text-zinc-900">Name your reflection</h3>
                    <p className="text-sm text-zinc-500">Give this conversation a title to find it later.</p>
                  </div>
                  <input
                    autoFocus
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmSaveChat()}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none"
                    placeholder="Enter chat name..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsNamingChat(false)}
                      className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmSaveChat}
                      className="flex-1 bg-zinc-900 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeMode === 'alter-ego' ? (
              <motion.div
                key="alter-ego"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <AlterEgoChat user={user} chatId={currentChatId} onChatCreated={setCurrentChatId} />
              </motion.div>
            ) : activeMode === 'split-personality' ? (
              <motion.div
                key="split-personality"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <SplitPersonalityChat user={user} chatId={currentChatId} onChatCreated={setCurrentChatId} />
              </motion.div>
            ) : (
              <motion.div
                key="personality-test"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <PersonalityAssessment userId={user.uid} onComplete={() => setActiveMode('alter-ego')} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
