/**
 * WebSocket Server for Real-Time Price & Trade Updates
 * Broadcasts live price feeds and trading activity to connected clients
 */

import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { getBinancePrices, getCoinGeckoPrices } from './exchange-integration';
// Auth verification would be handled by middleware before WebSocket connection

interface SubscribedClient {
  ws: WebSocket;
  userId: string;
  subscriptions: Set<string>;
  authenticated: boolean;
}

class TradingWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, SubscribedClient> = new Map();
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private tokens: Set<string> = new Set(['BTC', 'ETH', 'USDT', 'BNB', 'SOL']);
  private lastPrices: Map<string, number> = new Map();

  constructor(httpServer: Server) {
    this.wss = new WebSocketServer({ 
      server: httpServer,
      path: '/ws/trading'
    });

    this.setupConnectionHandler();
    this.startPriceUpdates();
  }

  private setupConnectionHandler(): void {
    this.wss.on('connection', async (ws: WebSocket, req) => {
      const clientId = `${Date.now()}_${Math.random()}`;
      const client: SubscribedClient = {
        ws,
        userId: '',
        subscriptions: new Set(),
        authenticated: false
      };

      this.clients.set(clientId, client);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(clientId, client, message);
        } catch (error) {
          ws.send(JSON.stringify({ 
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Trading WS Server',
        clientId
      }));
    });
  }

  private async handleMessage(
    clientId: string,
    client: SubscribedClient,
    message: any
  ): Promise<void> {
    switch (message.type) {
      case 'auth':
        await this.handleAuth(clientId, client, message);
        break;

      case 'subscribe':
        this.handleSubscribe(client, message);
        break;

      case 'unsubscribe':
        this.handleUnsubscribe(client, message);
        break;

      case 'get-prices':
        await this.sendCurrentPrices(client, message.tokens);
        break;

      default:
        client.ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${message.type}`
        }));
    }
  }

  private async handleAuth(
    clientId: string,
    client: SubscribedClient,
    message: any
  ): Promise<void> {
    try {
      const token = message.token;
      // Verify token using your auth system
      // This is a placeholder - implement with your actual auth
      if (token && token.length > 20) {
        client.authenticated = true;
        client.userId = message.userId || 'anonymous';
        
        client.ws.send(JSON.stringify({
          type: 'authenticated',
          userId: client.userId
        }));
      } else {
        client.ws.send(JSON.stringify({
          type: 'auth-failed',
          message: 'Invalid credentials'
        }));
      }
    } catch (error) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication error'
      }));
    }
  }

  private handleSubscribe(client: SubscribedClient, message: any): void {
    const channels = Array.isArray(message.channels) 
      ? message.channels 
      : [message.channels];

    for (const channel of channels) {
      client.subscriptions.add(channel);
      
      if (channel.startsWith('price:')) {
        const token = channel.split(':')[1];
        this.tokens.add(token);
      }
    }

    client.ws.send(JSON.stringify({
      type: 'subscribed',
      channels
    }));
  }

  private handleUnsubscribe(client: SubscribedClient, message: any): void {
    const channels = Array.isArray(message.channels)
      ? message.channels
      : [message.channels];

    for (const channel of channels) {
      client.subscriptions.delete(channel);
    }

    client.ws.send(JSON.stringify({
      type: 'unsubscribed',
      channels
    }));
  }

  private async sendCurrentPrices(
    client: SubscribedClient,
    tokens?: string[]
  ): Promise<void> {
    const tokensToFetch = tokens || Array.from(this.tokens);
    const prices = await getBinancePrices(tokensToFetch);

    const priceData: Record<string, number> = {};
    for (const [token, price] of prices) {
      priceData[token] = price;
    }

    client.ws.send(JSON.stringify({
      type: 'prices',
      data: priceData,
      timestamp: new Date()
    }));
  }

  private startPriceUpdates(): void {
    // Update prices every 2 seconds
    this.priceUpdateInterval = setInterval(async () => {
      try {
        const prices = await getBinancePrices(Array.from(this.tokens));
        const priceData: Record<string, any> = {};

        for (const [token, price] of prices) {
          const lastPrice = this.lastPrices.get(token) || price;
          const change = ((price - lastPrice) / lastPrice) * 100;

          priceData[token] = {
            price,
            change,
            changePercent: change.toFixed(2),
            timestamp: new Date()
          };

          this.lastPrices.set(token, price);
        }

        // Broadcast to all subscribed clients
        this.broadcast({
          type: 'price-update',
          data: priceData
        });
      } catch (error) {
        console.error('Price update error:', error);
      }
    }, 2000);
  }

  private broadcast(message: any): void {
    const payload = JSON.stringify(message);

    for (const [_, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Check if client subscribed to this channel
        if (message.type === 'price-update') {
          const hasSubscription = Array.from(client.subscriptions).some(
            sub => sub === 'prices' || sub.startsWith('price:')
          );

          if (hasSubscription || client.subscriptions.size === 0) {
            client.ws.send(payload);
          }
        } else {
          client.ws.send(payload);
        }
      }
    }
  }

  public broadcastTradeUpdate(userId: string, trade: any): void {
    this.broadcast({
      type: 'trade-update',
      userId,
      trade,
      timestamp: new Date()
    });
  }

  public broadcastLeaderboardUpdate(leaderboard: any): void {
    this.broadcast({
      type: 'leaderboard-update',
      data: leaderboard,
      timestamp: new Date()
    });
  }

  public getConnectionCount(): number {
    return this.clients.size;
  }

  public shutdown(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }
    this.wss.close();
  }
}

export { TradingWebSocketServer, SubscribedClient };
