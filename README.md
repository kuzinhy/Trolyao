# Tài liệu triển khai: Trợ lý ảo AI 3D Đa phương thức (MVP)

Tài liệu này hướng dẫn developer triển khai một trợ lý ảo cá nhân với Avatar 3D, hỗ trợ Voice/Text Chat và Bộ nhớ dài hạn (Long-term Memory) sử dụng kiến trúc Full-stack (React + Express + SQLite + Gemini API).

---

## 1. Sơ đồ thư mục Project

Cấu trúc thư mục được thiết kế theo mô hình Monorepo đơn giản (Frontend và Backend nằm chung một project để dễ quản lý trong giai đoạn MVP).

\`\`\`text
/
├── .env.example              # Mẫu biến môi trường
├── package.json              # Quản lý dependencies và scripts
├── server.ts                 # Backend (Express) - Xử lý API, DB và gọi Gemini
├── tsconfig.json             # Cấu hình TypeScript
├── vite.config.ts            # Cấu hình Vite (Frontend bundler)
├── src/
│   ├── App.tsx               # Component gốc của Frontend
│   ├── main.tsx              # Entry point của React
│   ├── index.css             # Global CSS (Tailwind)
│   ├── store.ts              # Quản lý State toàn cục (Zustand)
│   └── components/
│       ├── Avatar.tsx        # Render 3D Avatar (React Three Fiber)
│       ├── Chat.tsx          # Giao diện Chat (Text + Voice)
│       └── MemoryPanel.tsx   # Giao diện hiển thị Bộ nhớ dài hạn
\`\`\`

---

## 2. Biến môi trường cần thiết

Tạo file \`.env\` ở thư mục gốc với nội dung sau:

\`\`\`env
# Bắt buộc: API Key của Google Gemini (Lấy từ Google AI Studio)
GEMINI_API_KEY="AIzaSy..."

# Không bắt buộc: Cổng chạy server (Mặc định 3000)
PORT=3000
\`\`\`

---

## 3. Hướng dẫn chạy Local từng bước

### Bước 1: Cài đặt Dependencies
Mở terminal tại thư mục gốc và chạy:
\`\`\`bash
npm install
\`\`\`

Các thư viện chính được sử dụng:
- **Frontend:** \`react\`, \`@react-three/fiber\`, \`@react-three/drei\`, \`three\`, \`zustand\`, \`framer-motion\`, \`lucide-react\`, \`tailwindcss\`
- **Backend:** \`express\`, \`better-sqlite3\`, \`@google/genai\`, \`dotenv\`
- **Công cụ:** \`vite\`, \`tsx\`, \`typescript\`

### Bước 2: Khởi động hệ thống
Chạy lệnh sau để khởi động cả Backend (Express) và Frontend (Vite) cùng lúc:
\`\`\`bash
npm run dev
\`\`\`
- Server sẽ chạy tại: \`http://localhost:3000\`
- Database SQLite (\`memory.db\`) sẽ tự động được tạo ở thư mục gốc trong lần chạy đầu tiên.

---

## 4. Chi tiết triển khai các Module cốt lõi

### 4.1. Cách kết nối Database (SQLite)
*File: \`server.ts\`*

Chúng ta sử dụng \`better-sqlite3\` vì nó nhanh, đồng bộ (synchronous) và không cần cài đặt server DB phức tạp.

\`\`\`typescript
import Database from 'better-sqlite3';

// Khởi tạo file DB
const db = new Database('memory.db');

// Tạo bảng tự động nếu chưa có
db.exec(\`
  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    fact TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
\`);
\`\`\`
*Phương án thay thế sau này:* Khi scale lên production, có thể dễ dàng thay \`better-sqlite3\` bằng \`pg\` (PostgreSQL) hoặc \`mongoose\` (MongoDB).

### 4.2. Cách lưu Memory (Trí nhớ dài hạn)
*File: \`server.ts\`*

Đây là tính năng quan trọng nhất. Chúng ta sử dụng **Function Calling (Tools)** của Gemini.

1. **Định nghĩa Tool:** Báo cho Gemini biết nó có khả năng gọi hàm \`saveMemory\`.
\`\`\`typescript
const saveMemoryTool = {
  name: "saveMemory",
  description: "Lưu trữ thông tin quan trọng về người dùng vào bộ nhớ dài hạn.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fact: { type: Type.STRING, description: "Sự thật cần nhớ" },
      category: { type: Type.STRING, description: "Phân loại (Sở thích, Công việc...)" }
    },
    required: ["fact", "category"],
  }
};
\`\`\`

2. **Xử lý khi Gemini gọi Tool:**
\`\`\`typescript
// Trong route POST /api/chat
if (response.functionCalls && response.functionCalls.length > 0) {
  for (const call of response.functionCalls) {
    if (call.name === 'saveMemory') {
      const args = call.args;
      // Lưu trực tiếp vào Database
      db.prepare('INSERT INTO memories (user_id, fact, category) VALUES (?, ?, ?)')
        .run('default_user', args.fact, args.category);
    }
  }
}
\`\`\`

3. **Truy xuất Memory:** Trước mỗi câu hỏi mới, query toàn bộ \`memories\` và nhúng vào \`System Prompt\` để Gemini biết.

### 4.3. Cách tích hợp Voice (Giọng nói)
*File: \`src/components/Chat.tsx\` và \`src/store.ts\`*

Để triển khai nhanh nhất (MVP), chúng ta dùng API có sẵn của trình duyệt.

**Speech-to-Text (Nghe người dùng nói):**
Sử dụng \`webkitSpeechRecognition\`.
\`\`\`typescript
const recognition = new (window as any).webkitSpeechRecognition();
recognition.lang = 'vi-VN';
recognition.onresult = (event) => {
  const text = event.results[0][0].transcript;
  sendMessage(text); // Gửi text lên server
};
recognition.start();
\`\`\`

**Text-to-Speech (AI trả lời bằng giọng nói):**
Sử dụng \`window.speechSynthesis\`.
\`\`\`typescript
// Trong hàm sendMessage của store.ts, sau khi nhận kết quả từ server:
if (data.reply && 'speechSynthesis' in window) {
  const utterance = new SpeechSynthesisUtterance(data.reply);
  utterance.lang = 'vi-VN';
  window.speechSynthesis.speak(utterance);
}
\`\`\`
*Phương án thay thế sau này:* Dùng Google Cloud Speech-to-Text và Text-to-Speech API để có giọng đọc tự nhiên hơn và nhận diện chính xác hơn.

### 4.4. Cách gắn Avatar 3D vào giao diện
*File: \`src/components/Avatar.tsx\`*

Sử dụng \`@react-three/fiber\` (R3F) để render 3D trong React.

1. **Tải Model 3D:** Sử dụng \`useGLTF\` để load file \`.glb\` (từ Ready Player Me).
\`\`\`typescript
const { scene } = useGLTF("https://models.readyplayer.me/YOUR_AVATAR_ID.glb");
\`\`\`

2. **Render lên Canvas:**
\`\`\`tsx
<Canvas camera={{ position: [0, 0.2, 1.2], fov: 45 }}>
  <ambientLight intensity={0.6} />
  <primitive object={scene} position={[0, -1.6, 0]} scale={1.2} />
  <OrbitControls />
</Canvas>
\`\`\`

3. **Lip-sync (Đồng bộ môi):**
Tìm các *Morph Targets* (Blendshapes) của khuôn mặt và thay đổi giá trị của chúng dựa trên trạng thái \`isSpeaking\`.
\`\`\`typescript
useFrame((state) => {
  // Tìm mesh khuôn mặt
  const headMesh = scene.getObjectByName('Wolf3D_Head');
  if (headMesh && headMesh.morphTargetInfluences) {
    const jawOpenIdx = headMesh.morphTargetDictionary['jawOpen'];
    if (isSpeaking) {
      // Tạo chuyển động nhấp nháy môi giả lập bằng hàm sin
      const talkValue = (Math.sin(state.clock.elapsedTime * 25) + 1) / 2 * 0.4;
      headMesh.morphTargetInfluences[jawOpenIdx] = talkValue;
    } else {
      headMesh.morphTargetInfluences[jawOpenIdx] = 0; // Ngậm miệng
    }
  }
});
\`\`\`
*Phương án thay thế sau này:* Sử dụng thư viện phân tích Audio (Audio Analyzer) để trích xuất tần số âm thanh thực tế và map vào độ mở của miệng, thay vì dùng hàm \`sin\` giả lập.

---

## 5. Kế hoạch mở rộng (Post-MVP)

1. **Đăng nhập (Auth):** Thêm Firebase Auth hoặc NextAuth. Thay \`'default_user'\` trong DB bằng User ID thực tế.
2. **Vector Database:** Khi lượng Memory quá lớn, thay SQLite bằng Pinecone hoặc ChromaDB để tìm kiếm ngữ nghĩa (Semantic Search) thay vì load toàn bộ memory vào prompt.
3. **Giọng nói AI:** Tích hợp ElevenLabs hoặc Google Cloud TTS để có giọng nói truyền cảm hơn.
4. **Custom Avatar:** Cho phép người dùng dán link `.glb` của riêng họ từ Ready Player Me vào phần Cài đặt.
