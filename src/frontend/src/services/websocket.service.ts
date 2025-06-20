import { useState, useEffect, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  payload: any;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private taskSubscriptions: Set<string> = new Set();
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.setupReconnection();
  }

  private setupReconnection() {
    // Reconnect if connection is lost
    window.addEventListener('online', () => {
      if (this.socket?.readyState !== WebSocket.OPEN) {
        this.connect();
      }
    });
  }

  public async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const token = localStorage.getItem('token');
      if (!token) {
        reject(new Error('No authentication token available'));
        this.connectionPromise = null;
        return;
      }

      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
      this.socket = new WebSocket(`${wsUrl}/ws?token=${token}`);

      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        // Resubscribe to tasks
        this.taskSubscriptions.forEach(taskId => {
          this.sendMessage({ type: 'SUBSCRIBE_TASK', taskId });
        });
        resolve();
        this.connectionPromise = null;
      };

      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
        setTimeout(() => this.connect(), 5000); // Try to reconnect after 5 seconds
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
        this.connectionPromise = null;
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, payload } = message;

          // Handle different message types
          if (this.listeners.has(type)) {
            this.listeners.get(type)?.forEach(callback => callback(payload));
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
    });

    return this.connectionPromise;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public subscribe(taskId: string): void {
    if (!taskId) return;

    this.taskSubscriptions.add(taskId);
    this.connect().then(() => {
      this.sendMessage({ type: 'SUBSCRIBE_TASK', taskId });
    });
  }

  public unsubscribe(taskId: string): void {
    if (!taskId) return;

    this.taskSubscriptions.delete(taskId);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendMessage({ type: 'UNSUBSCRIBE_TASK', taskId });
    }
  }

  public addListener(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type)?.add(callback);

    // Return a function to remove this specific listener
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  // Add a public method to check connection status
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  private sendMessage(message: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Message not sent:', message);
    }
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;

// React hook for using the WebSocket client
export function useWebSocket(taskId: string | undefined) {
  const [client, setClient] = useState<WebSocketService | null>(null);

  useEffect(() => {
    if (!taskId) return;

    // Create and connect client
    const wsClient = new WebSocketService();
    wsClient.connect();
    setClient(wsClient);

    return () => {
      wsClient.disconnect();
      setClient(null);
    };
  }, [taskId]);

  const subscribe = useCallback((type: string, handler: (payload: any) => void) => {
    if (!client) return () => {};
    return client.addListener(type, handler);
  }, [client]);

  return {
    isConnected: client ? client.isConnected() : false,
    subscribe
  };
}
