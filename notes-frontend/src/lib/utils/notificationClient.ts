// src/lib/utils/notificationClient.ts
import { io } from "socket.io-client";

let socket: any = null;

export function connectNotificationSocket() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!user?.id) {
    console.warn(" Không tìm thấy user.id trong localStorage → bỏ qua socket");
    return;
  }

  // Nếu đã kết nối rồi thì không tạo lại
  if (socket) return socket;

  socket = io("http://localhost:4000/notification", {
    query: { userId: user.id },
  });

  socket.on("connect", () => {
    console.log(" [Socket] Connected:", socket.id);
  });

  socket.on("notification:connected", (data) => {
    console.log(" [Socket] Server xác nhận:", data);
  });

  socket.on("notification:new", (notif) => {
    console.log(" [Socket] New notification:", notif);
    console.log(" [Socket] Nhận thông báo mới từ server:", notif);
    // Bạn có thể hiển thị thông báo bằng alert hoặc store
    showToast(` ${notif.message}`);
  });

  socket.on("disconnect", () => {
    console.log(" [Socket] Disconnected");
  });

  return socket;
}

// Hàm hiển thị toast đơn giản
function showToast(message: string) {
  const el = document.createElement("div");
  el.innerText = message;
  el.className =
    "fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow z-[9999]";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
