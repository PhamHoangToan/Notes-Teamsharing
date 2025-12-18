#  Notes Teamsharing

Ứng dụng ghi chú cộng tác **thời gian thực** được xây dựng bằng  
**NestJS + tRPC + MongoDB + AWS S3 + SvelteKit 2 + TipTap + Yjs**

---

##  Tính năng nổi bật

- ✏️ **Trình soạn thảo TipTap** hỗ trợ định dạng văn bản phong phú, mentions, comments và đính kèm file.  
- **Cộng tác thời gian thực** với **Yjs + WebRTC Provider**.  
-  **Quản lý nhóm (Team)** và **phân quyền truy cập** linh hoạt (Owner / Editor / Viewer).  
- ☁️ **Lưu trữ file S3 (AWS)** cho avatar, hình ảnh, và tài liệu đính kèm.  
- ⚡ **NestJS + tRPC** giúp giao tiếp giữa backend và frontend hoàn toàn type-safe.  
- 🧾 **Lịch sử chỉnh sửa (NoteHistory)** và tính năng phục hồi phiên bản cũ.  
-  **Thông báo realtime** qua WebSocket / tRPC subscription.

---

##  Cấu trúc dự án

```bash
Notes-Teamsharing/
├── backend/           # NestJS + tRPC + MongoDB + AWS SDK
│   ├── src/
│   │   ├── modules/
│   │   │   ├── note/
│   │   │   ├── user/
│   │   │   ├── team/
│   │   │   ├── notification/
│   │   │   └── ...
│   │   └── main.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/          # SvelteKit 2 + TipTap + Yjs + TailwindCSS
│   ├── src/lib/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── trpc/
│   │   ├── utils/
│   │   └── app.css
│   ├── svelte.config.js
│   └── package.json
│
├── .gitignore
└── README.md
Cài đặt Backend (NestJS + tRPC + MongoDB + S3)
    cd notes-backend
    npm install
    # hoặc
    pnpm install
Tạo file .env
Tạo notes-backend/.env với nội dung:
        # App
        PORT=4000
        MONGO_URI=mongodb://localhost:27017/notes-teamsharing

        # JWT
        JWT_SECRET=my-super-secret

        # AWS S3
        AWS_ACCESS_KEY_ID=your-access-key
        AWS_SECRET_ACCESS_KEY=your-secret-key
        AWS_REGION=ap-southeast-1
        S3_BUCKET_NAME=notes-teamsharing-storage

        # FE URL (cho CORS)
        FRONTEND_URL=http://localhost:5173
Chạy NestJS
    npm run start:dev
Cài đặt Frontend (SvelteKit 2 + TipTap + Yjs)
    cd frontend
    npm install
Tạo file .env
Tạo notes-frontend/.env:
        PUBLIC_API_URL=http://localhost:4000/trpc
        PUBLIC_SOCKET_URL=ws://localhost:4000
        PUBLIC_S3_URL=https://notes-teamsharing-storage.s3.ap-southeast-1.amazonaws.com
Chạy ứng dụng SvelteKit
        npm run dev
