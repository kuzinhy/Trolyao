import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Send, Mic, MicOff, Trash2, Activity, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Chat() {
  const { messages, isThinking, isSpeaking, sendMessage, clearChat, isListening, setListening, assistant } = useStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Speech Recognition setup (using Web Speech API for MVP)
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'vi-VN';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        sendMessage(transcript);
        setListening(false);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setListening(false);
      };

      rec.onend = () => {
        setListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognition?.stop();
      setListening(false);
    } else {
      recognition?.start();
      setListening(true);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-3xl overflow-hidden relative">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8">
            {isListening ? (
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
            ) : isThinking ? (
              <Loader2 className="animate-spin text-indigo-400" size={18} />
            ) : isSpeaking ? (
              <Activity className="text-green-400 animate-pulse" size={18} />
            ) : (
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-medium text-white tracking-wide">{assistant?.name || 'Trợ lý ảo'}</h2>
            <p className="text-[10px] text-white/50 font-mono uppercase tracking-wider">
              {isListening ? 'Đang nghe...' : isThinking ? 'Đang xử lý...' : isSpeaking ? 'Đang phản hồi...' : 'Sẵn sàng'}
            </p>
          </div>
        </div>
        <button onClick={clearChat} className="text-white/40 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5" title="Xóa lịch sử">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-4">
            <Activity size={32} className="opacity-50" />
            <p className="text-sm font-light tracking-wide">Hệ thống đã sẵn sàng. Hãy bắt đầu giao tiếp.</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-tr-sm shadow-lg shadow-indigo-900/20'
                    : 'bg-white/5 text-zinc-200 rounded-tl-sm border border-white/10 backdrop-blur-md'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
          {isThinking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-sm flex items-center space-x-2 backdrop-blur-md">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-black/20">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <button
            type="button"
            onClick={toggleListen}
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening 
                ? 'bg-red-500 text-white mic-glow-active' 
                : 'bg-indigo-600 text-white mic-glow hover:bg-indigo-500'
            }`}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <div className="flex-1 glass-input rounded-2xl flex items-center pr-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập lệnh hoặc câu hỏi..."
              className="w-full bg-transparent border-none px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-0"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
