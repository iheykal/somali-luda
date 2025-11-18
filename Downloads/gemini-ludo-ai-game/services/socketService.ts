import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private gameId: string | null = null;

  private getDefaultSocketUrl(): string {
    // First, check if environment variable is explicitly set (highest priority)
    const envUrl = import.meta.env.VITE_SOCKET_URL;
    if (envUrl && envUrl.trim() !== '' && envUrl !== 'http://localhost:3001') {
      return envUrl.trim();
    }
    
    // If we're in the browser, detect the hostname dynamically
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol; // 'http:' or 'https:'
      const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
      
      // In production (deployed), use same origin if backend is on same domain
      // This works when frontend and backend are deployed together
      if (isProduction) {
        // Use same origin - works when frontend and backend are on same domain
        // Socket.io will automatically use the current window location
        return window.location.origin;
      }
      
      // Development: use localhost with port 3001
      return 'http://localhost:3001';
    }
    
    // Default fallback for development
    return 'http://localhost:3001';
  }

  connect(serverUrl: string = import.meta.env.VITE_SOCKET_URL || this.getDefaultSocketUrl()) {
    if (this.socket?.connected) {
      console.log('Already connected to server');
      return;
    }
    
    console.log('🔌 Connecting to socket server:', serverUrl);
    console.log('🔌 Current hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A');
    
    this.socket = io(serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to server:', this.socket?.id, 'at', serverUrl);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      // If we were in a game, we might need to handle reconnection
      if (this.gameId) {
        console.warn('⚠️ Disconnected during game:', this.gameId);
        // Attempt to reconnect
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          this.socket.connect();
        }
      }
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to server after', attemptNumber, 'attempts');
      if (this.gameId) {
        console.log('✅ Reconnected during game:', this.gameId);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    // Listen for all events to debug
    this.socket.onAny((eventName, ...args) => {
      console.log('📨 Socket event received:', eventName, args);
    });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  searchMatch(playerName: string, betAmount: number = 0.5, userId?: string) {
    // Ensure we're connected first
    if (!this.socket || !this.socket.connected) {
      this.connect();
      // Wait for connection before emitting
      this.socket?.once('connect', () => {
        // Small delay to ensure connection is fully established
        setTimeout(() => {
          if (this.socket?.connected) {
            this.socket.emit('search-match', { playerName, betAmount, userId });
          }
        }, 100);
      });
    } else {
      // If already connected, emit immediately
      this.socket.emit('search-match', { playerName, betAmount, userId });
    }
  }

  cancelSearch() {
    this.socket?.emit('cancel-search');
  }

  sendGameAction(action: any, playerId: string) {
    if (!this.socket || !this.gameId) {
      console.warn('Cannot send game action: socket or gameId not available', {
        hasSocket: !!this.socket,
        isConnected: this.socket?.connected,
        gameId: this.gameId
      });
      return;
    }
    if (!this.socket.connected) {
      console.error('❌ Cannot send game action: socket not connected');
      // Try to reconnect
      this.socket.connect();
      return;
    }
    console.log('📤 Sending game action:', action.type, 'to game:', this.gameId);
    this.socket.emit('game-action', { gameId: this.gameId, action, playerId });
  }

  sendGameStateUpdate(state: any) {
    if (!this.socket || !this.gameId) {
      console.warn('Cannot send game state: socket or gameId not available');
      return;
    }
    this.socket.emit('game-state-update', { gameId: this.gameId, state });
  }

  onSearching(callback: (data: any) => void) {
    this.socket?.on('searching', callback);
  }

  onMatchFound(callback: (data: { gameId: string; playerColor: string; opponentName: string }) => void) {
    console.log('📡 Setting up match-found listener');
    if (!this.socket) {
      console.error('❌ Cannot set up match-found listener: socket is null');
      return;
    }
    // Remove any existing listener first to avoid duplicates
    this.socket.off('match-found');
    // Set up the listener
    this.socket.on('match-found', (data) => {
      console.log('📨 Received match-found event in callback:', data);
      this.gameId = data.gameId;
      try {
        callback(data);
        console.log('✅ Match-found callback executed successfully');
      } catch (error) {
        console.error('❌ Error in match-found callback:', error);
      }
    });
    console.log('✅ Match-found listener registered');
  }

  onSearchError(callback: (data: { message: string }) => void) {
    this.socket?.on('search-error', callback);
  }

  onSearchCancelled(callback: () => void) {
    this.socket?.on('search-cancelled', callback);
  }

  onGameAction(callback: (data: any) => void) {
    this.socket?.on('game-action', callback);
  }

  onGameStateUpdate(callback: (data: any) => void) {
    this.socket?.on('game-state-update', callback);
  }

  onJoinError(callback: (data: any) => void) {
    this.socket?.on('join-error', callback);
  }

  onPlayerDisconnected(callback: (data: any) => void) {
    this.socket?.on('player-disconnected', callback);
  }

  requestStateSync(gameId: string) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot request state sync: socket not connected');
      return;
    }
    console.log('🔄 Requesting state sync for game:', gameId);
    this.socket.emit('request-state-sync', { gameId });
  }

  off(event: string) {
    this.socket?.off(event);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.gameId = null;
      console.log('Disconnected from server');
    }
  }
}

export const socketService = new SocketService();

