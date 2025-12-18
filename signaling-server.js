// signaling-server.js
import { WebSocketServer } from 'ws';
import http from 'http';

const PORT = 4444;

// Tạo HTTP server (để có thể upgrade lên WebSocket)
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('🛰️ Yjs Signaling Server đang chạy');
});

// Tạo WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  

  ws.on('message', (message) => {
    // Gửi message đến tất cả client khác
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => console.log(' Client ngắt kết nối'));
});

server.listen(PORT, () => {
  console.log(` Signaling server đang chạy tại ws://localhost:${PORT}`);
});
