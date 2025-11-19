// Game class to manage individual game state and logic
export class Game {
  constructor(gameId, player1, player2, betAmount) {
    this.id = gameId;
    this.player1Id = player1.socketId;
    this.player1UserId = player1.userId;
    this.player1Color = player1.color;
    this.player1Socket = player1.socket;
    this.player1Connected = true;
    this.player1BotMode = false;
    
    this.player2Id = player2.socketId;
    this.player2UserId = player2.userId;
    this.player2Color = player2.color;
    this.player2Socket = player2.socket;
    this.player2Connected = true;
    this.player2BotMode = false;
    
    this.betAmount = betAmount;
    this.state = null;
    this.revenueRecorded = false;
    this.betsDeducted = false;
    this.botPlaying = false;
    this.botMoveTimer = null;
    this.lastActivity = Date.now();
    
    // Track if game has ended (only when all 4 pawns are home)
    this.gameEnded = false;
  }

  // Handle player disconnection
  handleDisconnect(socketId) {
    if (this.gameEnded) return;
    
    if (socketId === this.player1Id) {
      this.player1Connected = false;
      this.player1BotMode = true;
      this.player1Socket = null;
      console.log(`🔴 Player 1 (${this.player1UserId}) disconnected in game ${this.id}, bot activated`);
    } else if (socketId === this.player2Id) {
      this.player2Connected = false;
      this.player2BotMode = true;
      this.player2Socket = null;
      console.log(`🔴 Player 2 (${this.player2UserId}) disconnected in game ${this.id}, bot activated`);
    }
    
    // Notify other players
    this.broadcast('player-disconnected', {
      playerId: socketId === this.player1Id ? this.player1UserId : this.player2UserId,
      color: socketId === this.player1Id ? this.player1Color : this.player2Color
    });
  }

  // Handle player reconnection
  handleReconnect(userId, socket) {
    if (this.gameEnded) {
      console.log(`⚠️ Cannot reconnect to ended game ${this.id}`);
      return;
    }

    const userIdStr = String(userId);
    const isPlayer1 = String(this.player1UserId) === userIdStr;
    const isPlayer2 = String(this.player2UserId) === userIdStr;

    if (!isPlayer1 && !isPlayer2) {
      console.log(`⚠️ User ${userIdStr} is not a player in game ${this.id}`);
      return;
    }

    // Cancel any bot operations when player reconnects
    if (this.botPlaying) {
      console.log(`🤖 Cancelling bot operations for game ${this.id} - player reconnected`);
      this.botPlaying = false;
    }

    // Clear any pending bot move timer
    if (this.botMoveTimer) {
      clearTimeout(this.botMoveTimer);
      this.botMoveTimer = null;
      console.log(`⏰ Cleared bot move timer for game ${this.id} - player reconnected`);
    }

    if (isPlayer1) {
      this.player1Id = socket.id;
      this.player1Socket = socket;
      this.player1Connected = true;
      this.player1BotMode = false;
      socket.join(this.id);
      console.log(`🟢 Player 1 (${this.player1UserId}) reconnected in game ${this.id}`);
    } else if (isPlayer2) {
      this.player2Id = socket.id;
      this.player2Socket = socket;
      this.player2Connected = true;
      this.player2BotMode = false;
      socket.join(this.id);
      console.log(`🟢 Player 2 (${this.player2UserId}) reconnected in game ${this.id}`);
    }

    // Notify other players (server.js will also send player-status update)
    this.broadcast('player-reconnected', {
      playerId: userId,
      color: isPlayer1 ? this.player1Color : this.player2Color
    });

    // Send current game state to reconnected player
    if (this.state) {
      const stateWithBetAmount = {
        ...this.state,
        betAmount: this.betAmount
      };
      socket.emit('game-state-update', { state: stateWithBetAmount });
    }
  }

  // Check if current player is a bot
  isCurrentPlayerBot() {
    if (!this.state || !this.state.gameStarted || this.state.turnState === 'GAMEOVER') {
      return false;
    }
    
    const currentPlayerIndex = this.state.currentPlayerIndex;
    const currentPlayer = this.state.players[currentPlayerIndex];
    
    if (!currentPlayer) return false;
    
    const isPlayer1Turn = currentPlayer.color === this.player1Color;
    const isPlayer2Turn = currentPlayer.color === this.player2Color;
    
    return (isPlayer1Turn && this.player1BotMode && !this.player1Connected) ||
           (isPlayer2Turn && this.player2BotMode && !this.player2Connected);
  }

  // Get current player info
  getCurrentPlayer() {
    if (!this.state || !this.state.players) return null;
    const currentPlayerIndex = this.state.currentPlayerIndex;
    return this.state.players[currentPlayerIndex] || null;
  }

  // Broadcast to all connected players
  broadcast(event, data) {
    if (this.player1Socket && this.player1Connected) {
      this.player1Socket.emit(event, data);
    }
    if (this.player2Socket && this.player2Connected) {
      this.player2Socket.emit(event, data);
    }
  }

  // Check if game should end (all 4 pawns home)
  checkGameEnd() {
    if (!this.state || !this.state.tokens || !this.state.players) {
      return { ended: false };
    }

    // Check each player to see if all 4 tokens are home
    for (const player of this.state.players) {
      const playerTokens = this.state.tokens.filter(t => t.color === player.color);
      const tokensHome = playerTokens.filter(t => t.position.type === 'HOME');

      console.log(`🏁 Game ${this.id} - Player ${player.color}: ${tokensHome.length}/4 tokens home`);

      if (tokensHome.length === 4) {
        // All 4 tokens are home - game ends
        console.log(`🎉 Game ${this.id} ENDED! Winner: ${player.color} (User: ${player.color === this.player1Color ? this.player1UserId : this.player2UserId})`);
        return {
          ended: true,
          winnerColor: player.color,
          winnerUserId: player.color === this.player1Color ? this.player1UserId : this.player2UserId
        };
      }
    }

    return { ended: false };
  }

  // Update game state
  updateState(newState) {
    this.state = newState;
    this.lastActivity = Date.now();
    
    // Check if game should end
    const endCheck = this.checkGameEnd();
    if (endCheck.ended && !this.gameEnded) {
      this.gameEnded = true;
      if (newState.turnState !== 'GAMEOVER') {
        newState.turnState = 'GAMEOVER';
        if (!newState.winners) {
          newState.winners = [];
        }
        if (!newState.winners.includes(endCheck.winnerColor)) {
          newState.winners.push(endCheck.winnerColor);
        }
      }
    }
  }

  // Get player info for rejoin
  getPlayerInfo(userId) {
    const userIdStr = String(userId);
    const isPlayer1 = String(this.player1UserId) === userIdStr;
    const isPlayer2 = String(this.player2UserId) === userIdStr;
    
    if (isPlayer1) {
      return {
        isPlayer1: true,
        color: this.player1Color,
        connected: this.player1Connected,
        botMode: this.player1BotMode
      };
    } else if (isPlayer2) {
      return {
        isPlayer1: false,
        color: this.player2Color,
        connected: this.player2Connected,
        botMode: this.player2BotMode
      };
    }
    return null;
  }
}

