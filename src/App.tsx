import React, { useEffect, useState } from 'react';
import { Avatar } from './components/Avatar';
import { Chat } from './components/Chat';
import { MemoryPanel } from './components/MemoryPanel';
import { useStore } from './store';
import { Menu, X, BrainCircuit } from 'lucide-react';

export default function App() {
  const { fetchMessages, fetchMemories, fetchProfile, assistant } = useStore();
  const [showMemory, setShowMemory] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchMessages();
    fetchMemories();
  }, []);

  return (
    <div className="relative h-screen w-full bg-[#050505] text-white overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Background Atmospheric Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(30,27,75,0.4)_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,_rgba(17,24,39,0.8)_0%,_transparent_50%)] pointer-events-none" />

      {/* Center: 3D Avatar (Full bleed background) */}
      <div className="absolute inset-0 z-0">
        <Avatar />
      </div>

      {/* Top Navigation / Header (Mobile toggle) */}
      <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-10 h-10 rounded-full glass-panel flex items-center justify-center border border-white/10">
            <BrainCircuit className="text-indigo-400" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-widest uppercase text-white/90">{assistant?.name || 'Aura'}</h1>
            <p className="text-[10px] text-white/50 font-mono tracking-wider">NEXUS_AI_CORE_v3.1</p>
          </div>
        </div>
        <button
          className="lg:hidden pointer-events-auto glass-panel p-3 rounded-full"
          onClick={() => setShowMemory(!showMemory)}
        >
          {showMemory ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Left Sidebar: Chat Interface */}
      <div className={`absolute top-0 left-0 h-full w-full lg:w-[440px] z-10 transition-transform duration-500 ease-in-out ${showMemory ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full pt-24 pb-6 px-6">
          <Chat />
        </div>
      </div>

      {/* Right Sidebar: Memory Panel */}
      <div className="absolute top-0 right-0 h-full w-full lg:w-[380px] z-10 hidden lg:block">
        <div className="h-full pt-24 pb-6 px-6">
          <MemoryPanel />
        </div>
      </div>
    </div>
  );
}
