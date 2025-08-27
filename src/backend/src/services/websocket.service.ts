import WebSocket from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';

interface WebSocketMessage {
  type: string;
  payload: any;
}

class WebSocketService {
  private wss: WebSocket.Server;
  // Map taskId -> Set of clients
  private taskClients: Map<string, Set<WebSocket>> = new Map();
  // Map client -> Set of subscribed taskIds
  private clientTasks: Map<WebSocket, Set<string>> = new Map();

  constructor(server: http.Server) {
    this.wss = new WebSocket.Server({ server });
    this.init();
  }

  private init() {
    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      // Extract token from URL query parameters
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify JWT token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        const userId = decoded.id;

        // Initialize subscriptions for this client
        this.clientTasks.set(ws, new Set());

        ws.on('message', (message: string) => {
          try {
            const parsedMessage = JSON.parse(message) as { type: string; taskId?: string; payload?: any };
            // Handle subscription messages
            if (parsedMessage.type === 'SUBSCRIBE_TASK' && parsedMessage.taskId) {
              this.subscribeClientToTask(ws, parsedMessage.taskId);
            } else if (parsedMessage.type === 'UNSUBSCRIBE_TASK' && parsedMessage.taskId) {
              this.unsubscribeClientFromTask(ws, parsedMessage.taskId);
            }
            // ...handle other message types if needed...
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });

        ws.on('close', () => {
          this.cleanupClient(ws);
        });

      } catch (error) {
        console.error('WebSocket authentication failed:', error);
        ws.close(1008, 'Authentication failed');
      }
    });
  }

  private subscribeClientToTask(ws: WebSocket, taskId: string) {
    // Add client to task's set
    if (!this.taskClients.has(taskId)) {
      this.taskClients.set(taskId, new Set());
    }
    this.taskClients.get(taskId)!.add(ws);

    // Add task to client's set
    if (!this.clientTasks.has(ws)) {
      this.clientTasks.set(ws, new Set());
    }
    this.clientTasks.get(ws)!.add(taskId);

    // Optionally log
    // console.log(`Client subscribed to task ${taskId}`);
  }

  private unsubscribeClientFromTask(ws: WebSocket, taskId: string) {
    // Remove client from task's set
    if (this.taskClients.has(taskId)) {
      this.taskClients.get(taskId)!.delete(ws);
      if (this.taskClients.get(taskId)!.size === 0) {
        this.taskClients.delete(taskId);
      }
    }
    // Remove task from client's set
    if (this.clientTasks.has(ws)) {
      this.clientTasks.get(ws)!.delete(taskId);
    }
    // Optionally log
    // console.log(`Client unsubscribed from task ${taskId}`);
  }

  private cleanupClient(ws: WebSocket) {
    // Remove client from all task subscriptions
    const tasks = this.clientTasks.get(ws);
    if (tasks) {
      for (const taskId of tasks) {
        if (this.taskClients.has(taskId)) {
          this.taskClients.get(taskId)!.delete(ws);
          if (this.taskClients.get(taskId)!.size === 0) {
            this.taskClients.delete(taskId);
          }
        }
      }
    }
    this.clientTasks.delete(ws);
    // Optionally log
    // console.log('Client disconnected and cleaned up');
  }

  public broadcast(taskId: string, type: string, payload: any) {
    if (!this.taskClients.has(taskId)) {
      return;
    }
    const message = JSON.stringify({ type, payload });
    const clients = this.taskClients.get(taskId)!;
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
