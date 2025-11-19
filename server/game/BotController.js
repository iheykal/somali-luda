// Bot controller for handling bot moves
export class BotController {
  constructor(game, io, calculateLegalMoves) {
    this.game = game;
    this.io = io;
    this.calculateLegalMoves = calculateLegalMoves;
  }

  // Execute bot move
  async executeMove() {
    if (this.game.botPlaying) {
      console.log(`⏭️ Bot already playing, skipping executeMove`);
      return;
    }

    if (this.game.gameEnded) {
      console.log(`⏭️ Game ended, skipping bot move`);
      return;
    }

    if (!this.game.state || this.game.state.turnState === 'GAMEOVER') {
      console.log(`⏭️ Invalid game state, skipping bot move:`, { hasState: !!this.game.state, turnState: this.game.state?.turnState });
      return;
    }

    const currentPlayer = this.game.getCurrentPlayer();
    if (!currentPlayer) {
      console.log(`⏭️ No current player, skipping bot move`);
      return;
    }

    const isBot = this.game.isCurrentPlayerBot();
    if (!isBot) {
      console.log(`⏭️ Current player is not a bot, skipping:`, currentPlayer.color);
      return;
    }

    console.log(`🤖 Bot starting move execution for ${currentPlayer.color}, turnState: ${this.game.state.turnState}`);
    this.game.botPlaying = true;

    try {
      // If bot needs to roll dice
      if (this.game.state.turnState === 'ROLLING' && this.game.state.diceValue === null) {
        await this.rollDice();
        // Reset botPlaying flag so we can continue with the move
        this.game.botPlaying = false;
        // After rolling, continue with move
        setTimeout(() => {
          this.executeMove();
        }, 1500);
        return;
      }

      // If no dice value, something is wrong
      if (!this.game.state.diceValue) {
        console.log(`⚠️ Bot has no dice value but turnState is ${this.game.state.turnState}`);
        this.game.botPlaying = false;
        return;
      }

      // Calculate legal moves
      const legalMoves = this.calculateLegalMoves(this.game.state, this.game.state.diceValue);

      if (legalMoves.length === 0) {
        // No legal moves, end turn
        await this.endTurn();
        this.game.botPlaying = false;
        return;
      }

      // Pick a random legal move (simple bot strategy)
      const chosenMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      
      console.log(`🤖 Bot (${currentPlayer.color}) executing move:`, chosenMove);

      // Execute the move
      await this.makeMove(chosenMove);
      
    } catch (error) {
      console.error(`❌ Error in bot move execution:`, error);
      this.game.botPlaying = false;
    }
  }

  // Roll dice for bot
  async rollDice() {
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    const currentPlayer = this.game.getCurrentPlayer();
    
    console.log(`🤖 Bot (${currentPlayer.color}) rolling dice: ${diceRoll}`);
    
    this.game.state.diceValue = diceRoll;
    this.game.state.turnState = 'MOVING';
    
    const legalMoves = this.calculateLegalMoves(this.game.state, diceRoll);
    this.game.state.legalMoves = legalMoves;

    console.log(`🤖 Bot rolled ${diceRoll}, legal moves: ${legalMoves.length}`);

    // Update game state through Game class method
    this.game.updateState(this.game.state);

    // Broadcast dice roll
    this.io.to(this.game.id).emit('game-action', {
      action: { type: 'ROLL_DICE', value: diceRoll },
      playerId: `bot-${currentPlayer.color}`
    });

    // Broadcast state update
    this.io.to(this.game.id).emit('game-state-update', { state: this.game.state });
  }

  // Make a move
  async makeMove(chosenMove) {
    const currentPlayer = this.game.getCurrentPlayer();
    const currentPlayerIndex = this.game.state.currentPlayerIndex;

    // Create move action
    const moveAction = {
      type: 'MOVE_TOKEN',
      move: chosenMove
    };

    // Emit the move action
    this.io.to(this.game.id).emit('game-action', {
      action: moveAction,
      playerId: `bot-${currentPlayer.color}`
    });

    // Update game state
    const tokenIndex = this.game.state.tokens.findIndex(t => t.id === chosenMove.tokenId);
    if (tokenIndex !== -1) {
      this.game.state.tokens[tokenIndex].position = chosenMove.finalPosition;
      
      // Check if token captured an opponent token
      const capturedTokenIndex = this.game.state.tokens.findIndex(t => 
        t.color !== currentPlayer.color &&
        t.position.type === 'PATH' &&
        t.position.index === (chosenMove.finalPosition.type === 'PATH' ? chosenMove.finalPosition.index : -1) &&
        t.id !== chosenMove.tokenId
      );

      if (capturedTokenIndex !== -1) {
        // Reset captured token to yard
        const capturedToken = this.game.state.tokens[capturedTokenIndex];
        const yardTokensOfColor = this.game.state.tokens.filter(t => 
          t.color === capturedToken.color && 
          t.position.type === 'YARD'
        );
        this.game.state.tokens[capturedTokenIndex].position = { type: 'YARD', index: yardTokensOfColor.length };
      }

      // Clear legal moves and proceed
      this.game.state.legalMoves = [];
      this.game.state.turnState = 'ANIMATING';

      // After animation, check for extra turn or move to next player
      setTimeout(() => {
        const grantedExtraTurn = chosenMove.finalPosition.type === 'HOME' || capturedTokenIndex !== -1;
        
        // Emit ANIMATION_COMPLETE action first
        this.io.to(this.game.id).emit('game-action', {
          action: { type: 'ANIMATION_COMPLETE' },
          playerId: `bot-${currentPlayer.color}`
        });
        
        if (grantedExtraTurn) {
          this.game.state.turnState = 'ROLLING';
          this.game.state.diceValue = null;
          this.game.state.legalMoves = [];
          this.game.state._pendingExtraTurn = undefined;
          console.log(`🤖 Bot (${currentPlayer.color}) gets extra turn`);
        } else {
          // Emit NEXT_TURN action for proper transition
          this.io.to(this.game.id).emit('game-action', {
            action: { type: 'NEXT_TURN', grantExtraTurn: false },
            playerId: `bot-${currentPlayer.color}`
          });
          
          const nextPlayerIndex = (currentPlayerIndex + 1) % this.game.state.players.length;
          this.game.state.currentPlayerIndex = nextPlayerIndex;
          this.game.state.turnState = 'ROLLING';
          this.game.state.diceValue = null;
          this.game.state.legalMoves = [];
          this.game.state._pendingExtraTurn = undefined;
        }

        // Update game state
        this.game.updateState(this.game.state);

        // Broadcast updated state
        this.io.to(this.game.id).emit('game-state-update', { state: this.game.state });

        // Check if bot should continue playing
        const nextPlayer = this.game.state.players[this.game.state.currentPlayerIndex];
        if (nextPlayer && !this.game.gameEnded) {
          const isNextBot = this.game.isCurrentPlayerBot();
          const shouldContinueBot = (isNextBot || grantedExtraTurn) && 
                                   this.game.state.turnState === 'ROLLING' && 
                                   this.game.state.diceValue === null;

          if (shouldContinueBot) {
            console.log(`🤖 Bot continuing - next player ${nextPlayer.color} ${isNextBot ? 'is bot' : 'extra turn'}`);
            this.game.botPlaying = false;
            setTimeout(() => this.executeMove(), 500);
          } else {
            this.game.botPlaying = false;
          }
        } else {
          this.game.botPlaying = false;
        }
      }, 800);
    }
  }

  // End turn (no legal moves)
  async endTurn() {
    const currentPlayerIndex = this.game.state.currentPlayerIndex;
    const nextPlayerIndex = (currentPlayerIndex + 1) % this.game.state.players.length;
    
    // Emit NEXT_TURN action to properly transition
    this.io.to(this.game.id).emit('game-action', {
      action: { type: 'NEXT_TURN', grantExtraTurn: false },
      playerId: `bot-${this.game.getCurrentPlayer().color}`
    });
    
    this.game.state.currentPlayerIndex = nextPlayerIndex;
    this.game.state.turnState = 'ROLLING';
    this.game.state.diceValue = null;
    this.game.state.legalMoves = [];
    this.game.state._pendingExtraTurn = undefined;
    
    // Update game state
    this.game.updateState(this.game.state);
    
    // Broadcast updated state
    this.io.to(this.game.id).emit('game-state-update', { state: this.game.state });
    
    // Schedule next bot move if next player is also a bot
    setTimeout(() => {
      if (!this.game.gameEnded && this.game.isCurrentPlayerBot()) {
        console.log(`🤖 Bot turn after no moves - rolling dice`);
        this.game.botPlaying = false;
        this.executeMove();
      } else {
        this.game.botPlaying = false;
      }
    }, 1000);
  }
}

