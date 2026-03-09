import React, { useEffect } from 'react';
import { useStore } from '../store';
import { Database, Trash2, Cpu } from 'lucide-react';

export function MemoryPanel() {
  const { memories, fetchMemories, deleteMemory } = useStore();

  useEffect(() => {
    fetchMemories();
  }, []);

  return (
    <div className="glass-panel rounded-3xl flex flex-col h-full overflow-hidden relative">
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <Database className="text-indigo-400" size={18} />
          <h2 className="text-sm font-medium text-white tracking-wide">Dữ liệu cá nhân</h2>
        </div>
        <div className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-1 rounded-md">
          {memories.length} RECORDS
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {memories.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-4">
            <Cpu size={32} className="opacity-50" />
            <p className="text-sm font-light text-center px-4">Chưa có dữ liệu. Trợ lý sẽ tự động học hỏi trong quá trình giao tiếp.</p>
          </div>
        ) : (
          memories.map((memory) => (
            <div key={memory.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 group hover:bg-white/10 transition-colors relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50" />
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded">
                  {memory.category}
                </span>
                <button 
                  onClick={() => deleteMemory(memory.id)}
                  className="text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Xóa dữ liệu này"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed font-light">
                {memory.fact}
              </p>
              <div className="text-[9px] font-mono text-white/30 mt-3 flex items-center gap-2">
                <span>ID: {memory.id.toString().padStart(4, '0')}</span>
                <span>•</span>
                <span>{new Date(memory.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
