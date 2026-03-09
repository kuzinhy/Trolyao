import { create } from 'zustand';

export interface Memory {
  id: number;
  fact: string;
  category: string;
  created_at: string;
}

export interface Message {
  id: number;
  role: 'user' | 'model';
  content: string;
  created_at: string;
}

interface AppState {
  memories: Memory[];
  messages: Message[];
  user: any;
  assistant: any;
  isThinking: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  fetchProfile: () => Promise<void>;
  fetchMemories: () => Promise<void>;
  fetchMessages: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  deleteMemory: (id: number) => Promise<void>;
  clearChat: () => Promise<void>;
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  memories: [],
  messages: [],
  user: null,
  assistant: null,
  isThinking: false,
  isListening: false,
  isSpeaking: false,

  fetchProfile: async () => {
    const res = await fetch('/api/profile');
    if (res.ok) {
      const data = await res.json();
      set({ user: data.user, assistant: data.assistant });
    }
  },

  fetchMemories: async () => {
    const res = await fetch('/api/memories');
    if (res.ok) {
      set({ memories: await res.json() });
    }
  },

  fetchMessages: async () => {
    const res = await fetch('/api/chat/history');
    if (res.ok) {
      set({ messages: await res.json() });
    }
  },

  sendMessage: async (text: string) => {
    // Optimistic update
    const tempId = Date.now();
    set((state) => ({
      messages: [...state.messages, { id: tempId, role: 'user', content: text, created_at: new Date().toISOString() }],
      isThinking: true
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Refetch everything to get the real DB state and any new memories
        await get().fetchMessages();
        await get().fetchMemories();
        
        // Speak the response using Web Speech API
        if (data.reply && 'speechSynthesis' in window) {
          // Cancel any ongoing speech
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(data.reply);
          utterance.lang = 'vi-VN';
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isThinking: false });
    }
  },

  deleteMemory: async (id: number) => {
    const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      set((state) => ({ memories: state.memories.filter(m => m.id !== id) }));
    }
  },

  clearChat: async () => {
    const res = await fetch('/api/chat/clear', { method: 'POST' });
    if (res.ok) {
      set({ messages: [] });
    }
  },

  setListening: (listening: boolean) => set({ isListening: listening }),
  setSpeaking: (speaking: boolean) => set({ isSpeaking: speaking })
}));
