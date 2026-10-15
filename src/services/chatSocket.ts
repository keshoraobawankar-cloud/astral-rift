export interface ChatMessage {
  sender: string;
  text: string;
  timestamp?: string;
}

class ChatSocketService {
  private socket: WebSocket | null = null;
  private onMessageCallback: ((msg: ChatMessage) => void) | null = null;
  private isConnecting: boolean = false;

  connect(onMessage: (msg: ChatMessage) => void) {
    this.onMessageCallback = onMessage;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        console.log('[WebSocket] Chat connected successfully');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'CHAT_MESSAGE' && this.onMessageCallback) {
            this.onMessageCallback({
              sender: data.sender,
              text: data.text,
              timestamp: data.timestamp,
            });
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.socket = null;
        console.log('Chat socket closed. Reconnecting in 3s...');
        setTimeout(() => {
          if (this.onMessageCallback) {
            this.connect(this.onMessageCallback);
          }
        }, 3000);
      };

      this.socket.onerror = (err) => {
        console.warn('Chat WebSocket warning:', err);
      };
    } catch (err) {
      this.isConnecting = false;
      console.warn('Failed to initialize WebSocket client:', err);
    }
  }

  sendMessage(sender: string, text: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'CHAT_MESSAGE', sender, text }));
    } else {
      // Local broadcast fallback if socket is reconnecting
      if (this.onMessageCallback) {
        this.onMessageCallback({
          sender,
          text,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.onMessageCallback = null;
  }
}

export const chatSocket = new ChatSocketService();
