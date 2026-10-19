export interface ChatMessage {
  sender: string;
  text: string;
  timestamp?: string;
}

class ChatSocketService {
  private socket: WebSocket | null = null;
  private onMessageCallback: ((msg: ChatMessage) => void) | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 4;
  private reconnectTimer: any = null;

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
        this.reconnectAttempts = 0;
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
        } catch {
          // Silently ignore invalid chat JSON
        }
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.socket = null;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            if (this.onMessageCallback) {
              this.connect(this.onMessageCallback);
            }
          }, Math.min(2000 * this.reconnectAttempts, 8000));
        }
      };

      this.socket.onerror = () => {
        // Silently handle chat connection warnings
      };
    } catch {
      this.isConnecting = false;
      this.socket = null;
    }
  }

  sendMessage(sender: string, text: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: 'CHAT_MESSAGE', sender, text }));
        return;
      } catch {
        // Fall back to local broadcast below
      }
    }
    // Local broadcast fallback if socket is disconnected/reconnecting
    if (this.onMessageCallback) {
      this.onMessageCallback({
        sender,
        text,
        timestamp: new Date().toISOString(),
      });
    }
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // Ignore
      }
      this.socket = null;
    }
    this.onMessageCallback = null;
  }
}

export const chatSocket = new ChatSocketService();
