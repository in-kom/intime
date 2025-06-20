import WebSocket from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';

interface WebSocketMessage {
  type: string;
  payload: any;
}

class WebSocketService {
  private wss: WebSocket.Server;
  private clients: Map<string, Set<WebSocket>> = new Map();

  constructor(server: http.Server) {
    this.wss = new WebSocket.Server({ server });
    this.init();
  }

  private init() {
    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      // Extract token from URL query parameters
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      const taskId = url.searchParams.get('taskId');

      if (!token || !taskId) {
        ws.close(1008, 'Authentication or taskId required');
        return;
      }

      // Verify JWT token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        const userId = decoded.id;
        
        // Register client connection
        this.registerClient(taskId, ws);

        // Handle client messages
        ws.on('message', (message: string) => {
          try {
            const parsedMessage = JSON.parse(message) as WebSocketMessage;
            // Handle message based on type if needed
            console.log(`Received message from client: ${message}`);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });

        // Handle client disconnection
        ws.on('close', () => {
          this.unregisterClient(taskId, ws);
        });

      } catch (error) {
        console.error('WebSocket authentication failed:', error);
        ws.close(1008, 'Authentication failed');
      }
    });
  }

  private registerClient(taskId: string, ws: WebSocket) {
    if (!this.clients.has(taskId)) {
      this.clients.set(taskId, new Set());
    }
    this.clients.get(taskId)!.add(ws);
    console.log(`Client connected to task ${taskId}. Total clients for this task: ${this.clients.get(taskId)!.size}`);
  }

  private unregisterClient(taskId: string, ws: WebSocket) {
    if (this.clients.has(taskId)) {
      this.clients.get(taskId)!.delete(ws);
      if (this.clients.get(taskId)!.size === 0) {
        this.clients.delete(taskId);
      }
      console.log(`Client disconnected from task ${taskId}`);
    }
  }

  public broadcast(taskId: string, type: string, payload: any) {
    if (!this.clients.has(taskId)) {
      return;
    }

    const message = JSON.stringify({ type, payload });
    const clients = this.clients.get(taskId)!;

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

let instance: WebSocketService | null = null;

export const initWebSocketServer = (server: http.Server) => {
  instance = new WebSocketService(server);
  return instance;
};

export const getWebSocketServer = () => {
  if (!instance) {
    throw new Error('WebSocket server not initialized');
  }
  return instance;
};
