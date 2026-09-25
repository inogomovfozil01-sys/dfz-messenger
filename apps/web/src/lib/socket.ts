import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;

  getSocket(): Socket {
    if (!this.socket) {
      this.socket = io(WS_URL, {
        withCredentials: true,
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ['websocket', 'polling'],
      });
    }
    return this.socket;
  }

  connect() {
    const s = this.getSocket();
    if (!s.connected && !this.isConnecting) {
      this.isConnecting = true;
      s.connect();
      s.on('connect', () => {
        this.isConnecting = false;
      });
      s.on('connect_error', () => {
        this.isConnecting = false;
      });
    }
    return s;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
  }
}

export const socketService = new SocketService();
