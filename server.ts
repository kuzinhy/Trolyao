import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

const db = new Database('memory.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT,
    preferences TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS assistant_profiles (
    id TEXT PRIMARY KEY,
    name TEXT,
    role_description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    fact TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial data if empty
const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
if (userCount === 0) {
  db.prepare('INSERT INTO users (id, full_name) VALUES (?, ?)').run('default_user', 'Chủ nhân');
  db.prepare('INSERT INTO assistant_profiles (id, name, role_description) VALUES (?, ?, ?)').run(
    'default_assistant',
    'Aura',
    'Bạn là Aura, một trợ lý ảo cá nhân thông minh, thân thiện và chuyên nghiệp. Bạn có hình dạng là một con người 3D chân thật.'
  );
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/profile', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get('default_user');
  const assistant = db.prepare('SELECT * FROM assistant_profiles WHERE id = ?').get('default_assistant');
  res.json({ user, assistant });
});

app.get('/api/memories', (req, res) => {
  const memories = db.prepare('SELECT * FROM memories ORDER BY created_at DESC').all();
  res.json(memories);
});

app.delete('/api/memories/:id', (req, res) => {
  db.prepare('DELETE FROM memories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/chat/history', (req, res) => {
  const history = db.prepare('SELECT * FROM chat_history ORDER BY created_at ASC').all();
  res.json(history);
});

app.post('/api/chat/clear', (req, res) => {
  db.prepare('DELETE FROM chat_history').run();
  res.json({ success: true });
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get('default_user') as any;
    const assistant = db.prepare('SELECT * FROM assistant_profiles WHERE id = ?').get('default_assistant') as any;

    db.prepare('INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)').run('default_user', 'user', message);

    const memories = db.prepare('SELECT fact FROM memories WHERE user_id = ?').all('default_user') as {fact: string}[];
    const memoryContext = memories.length > 0 
      ? `Thông tin đã biết về người dùng (${user.full_name}):\n${memories.map(m => `- ${m.fact}`).join('\n')}`
      : `Chưa có thông tin nào về người dùng (${user.full_name}).`;

    const systemInstruction = `${assistant.role_description}
Tên của bạn là ${assistant.name}.
Hãy trả lời ngắn gọn, tự nhiên như đang nói chuyện trực tiếp.
${memoryContext}

Nhiệm vụ đặc biệt: Nếu người dùng cung cấp thông tin mới về bản thân họ (sở thích, thói quen, công việc, v.v.) hoặc yêu cầu bạn nhớ một điều gì đó, hãy gọi function 'saveMemory' để lưu lại.`;

    const saveMemoryTool = {
      name: "saveMemory",
      description: "Lưu trữ thông tin quan trọng về người dùng vào bộ nhớ dài hạn.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          fact: {
            type: Type.STRING,
            description: "Sự thật hoặc thông tin cần nhớ (ví dụ: 'Người dùng thích uống cà phê không đường')",
          },
          category: {
            type: Type.STRING,
            description: "Phân loại thông tin (ví dụ: 'Sở thích', 'Công việc', 'Cá nhân')",
          }
        },
        required: ["fact", "category"],
      }
    };

    const historyRows = db.prepare('SELECT role, content FROM chat_history ORDER BY created_at DESC LIMIT 10').all().reverse() as {role: string, content: string}[];
    
    const contents = historyRows.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [saveMemoryTool] }],
        temperature: 0.7,
      }
    });

    let replyText = response.text || '';

    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        if (call.name === 'saveMemory') {
          const args = call.args as any;
          if (args.fact && args.category) {
            db.prepare('INSERT INTO memories (user_id, fact, category) VALUES (?, ?, ?)').run('default_user', args.fact, args.category);
            console.log('Saved memory:', args.fact);
          }
        }
      }
      
      if (!replyText) {
         const followUpContents = [
            ...contents,
            { role: 'model', parts: [{ functionCall: response.functionCalls[0] }] },
            { role: 'user', parts: [{ functionResponse: { name: 'saveMemory', response: { success: true } } }] }
         ];
         const followUp = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: followUpContents as any,
            config: { systemInstruction }
         });
         replyText = followUp.text || 'Tôi đã ghi nhớ điều này.';
      }
    }

    db.prepare('INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)').run('default_user', 'model', replyText);

    res.json({ reply: replyText });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
