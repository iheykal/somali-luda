import { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, Player, PlayerColor, Token, LegalMove, TokenPosition, MultiplayerMessage } from '../types';
import { PLAYER_COLORS, START_POSITIONS, HOME_ENTRANCES, HOME_PATH_LENGTH, SAFE_SQUARES } from '../lib/boardLayout';
import { getAIMove } from '../services/geminiService';
import { socketService } from '../services/socketService';
import { audioService } from '../services/audioService.ts';

// --- Multiplayer Service (WebSocket communication) ---
const multiplayerService = {
  init: (gameId: string, onMessage: (message: MultiplayerMessage) => void) => {
    socketService.connect();
    
    // Handle game actions from other players
    socketService.onGameAction(({ action, playerId }) => {
      onMessage({
        type: 'GAME_ACTION',
        payload: { action, sessionId: playerId }
      });
    });

    // Handle game state updates from server
    socketService.onGameStateUpdate(({ state }) => {
      console.log('📥 Received game state update from server');
      onMessage({
        type: 'GAME_STATE_UPDATE',
        payload: { state, sessionId: 'server' }
      });
    });
  },
  broadcast: (gameId: string, message: MultiplayerMessage, playerId: string) => {
    if (message.type === 'GAME_ACTION') {
      socketService.sendGameAction(
        message.payload.action,
        playerId
      );
    } else if (message.type === 'GAME_STATE_UPDATE') {
      socketService.sendGameStateUpdate(message.payload.state);
    }
  },
  close: () => {
    socketService.disconnect();
  },
};

// --- Game Logic ---
export type Action =
    | { type: 'START_GAME'; players: Player[]; initialState?: GameState; betAmount?: number }
    | { type: 'ROLL_DICE'; value: number }
    | { type: 'SET_LEGAL_MOVES_AND_PROCEED'; moves: LegalMove[] }
    | { type: 'MOVE_TOKEN'; move: LegalMove }
    | { type: 'NEXT_TURN'; grantExtraTurn: boolean }
    | { type: 'ANIMATION_COMPLETE' }
    | { type: 'AI_THINKING' }
    | { type: 'SET_STATE'; state: GameState };

const initialState: GameState = {
    players: [],
    tokens: [],
    currentPlayerIndex: 0,
    diceValue: null,
    turnState: 'ROLLING',
    message: 'Welcome to Ludo!',
    gameStarted: false,
    winners: [],
    legalMoves: [],
};

const reducer = (state: GameState, action: Action): GameState => {
    switch (action.type) {
        case 'START_GAME': {
            if (action.initialState) {
                // If initialState is provided, ensure betAmount is included
                const stateWithBetAmount = action.betAmount !== undefined
                    ? { ...action.initialState, betAmount: action.betAmount }
                    : action.initialState;
                return stateWithBetAmount;
            }
            // Ensure players are always in the same order (red, yellow)
            const sortedPlayers = [...action.players].sort((a, b) => {
                const order: PlayerColor[] = ['red', 'yellow', 'green', 'blue'];
                return order.indexOf(a.color) - order.indexOf(b.color);
            });
            
            const tokens: Token[] = sortedPlayers.flatMap(p =>
                Array.from({ length: 4 }, (_, i) => ({
                    id: `${p.color}-${i}`,
                    color: p.color,
                    position: { type: 'YARD', index: i },
                }))
            );
            
            console.log('🎮 START_GAME - Players order:', sortedPlayers.map(p => `${p.color}: ${p.name || 'Unknown'}`));
            
            return {
                ...initialState,
                gameStarted: true,
                players: sortedPlayers,
                tokens,
                currentPlayerIndex: 0,
                turnState: 'ROLLING',
                message: '',
                betAmount: action.betAmount,
            };
        }
        
        case 'SET_STATE':
            // Preserve betAmount if new state doesn't have it but current state does
            if (!action.state.betAmount && state.betAmount) {
                return {
                    ...action.state,
                    betAmount: state.betAmount
                };
            }
            return action.state;

        case 'ROLL_DICE': {
            // Clear _pendingExtraTurn at the start of a new turn (dice roll)
            // This ensures we don't use stale values from previous turns
            return {
                ...state,
                diceValue: action.value,
                turnState: 'MOVING',
                message: `${state.players[state.currentPlayerIndex].color} rolled a ${action.value}. Select a token to move.`,
                _pendingExtraTurn: undefined,
            };
        }
        
        case 'SET_LEGAL_MOVES_AND_PROCEED': {
             if (action.moves.length === 0) {
                 // No legal moves - transition to a waiting state before NEXT_TURN
                 // This prevents player from rolling again during the transition
                 return {
                    ...state,
                    legalMoves: [],
                    turnState: 'ANIMATING', // Transition to ANIMATING to prevent immediate rolling
                    message: '', // Clear message instead of showing "No legal moves"
                 }
            }
            return { ...state, legalMoves: action.moves };
        }
        
        case 'MOVE_TOKEN': {
            const { move } = action;
            const diceValue = state.diceValue!;
            const currentPlayerColor = state.players[state.currentPlayerIndex].color;
            let captured = false;

            let newTokens = state.tokens.map(t =>
                t.id === move.tokenId ? { ...t, position: move.finalPosition } : { ...t }
            );
            
            if (move.finalPosition.type === 'PATH' && !SAFE_SQUARES.includes(move.finalPosition.index)) {
                const targetPos = move.finalPosition.index;
                const opponentTokensAtTarget = newTokens.filter(t =>
                    t.color !== currentPlayerColor &&
                    t.position.type === 'PATH' &&
                    t.position.index === targetPos
                );
                
                const isBlockade = opponentTokensAtTarget.length > 1 &&
                    opponentTokensAtTarget.every(t => t.color === opponentTokensAtTarget[0].color);

                if (!isBlockade && opponentTokensAtTarget.length > 0) {
                    newTokens = newTokens.map(t => {
                        if (opponentTokensAtTarget.some(ot => ot.id === t.id)) {
                            captured = true;
                            return { ...t, position: { type: 'YARD', index: parseInt(t.id.split('-')[1]) } };
                        }
                        return t;
                    });
                    // Play kill sound when a pawn is captured
                    if (captured) {
                        audioService.play('kill');
                    }
                }
            }
            
            // Play move sound for regular moves (if not captured)
            if (!captured) {
                if (move.finalPosition.type === 'HOME') {
                    // Play special sound when token enters home
                    audioService.play('inHome');
                } else {
                    audioService.play('move');
                }
            }

            // Player gets another turn ONLY if:
            // 1. They rolled a 6, OR
            // 2. They captured/killed an opponent's pawn, OR
            // 3. They entered home (reached the final HOME position)
            const grantExtraTurn = diceValue === 6 || captured || move.finalPosition.type === 'HOME';
            console.log('🎯 MOVE_TOKEN - Extra turn calculation:', {
                diceValue,
                captured,
                enteredHome: move.finalPosition.type === 'HOME',
                grantExtraTurn,
                currentPlayerColor
            });

            const winners = [...state.winners];
            const playerTokens = newTokens.filter(t => t.color === currentPlayerColor);
            let winMessage = state.message;
            if (playerTokens.every(t => t.position.type === 'HOME')) {
                if (!winners.includes(currentPlayerColor)) {
                    winners.push(currentPlayerColor);
                    // Display player name when they complete their last pawn
                    const winningPlayer = state.players.find(p => p.color === currentPlayerColor);
                    const winningPlayerName = winningPlayer?.name || currentPlayerColor;
                    winMessage = `${winningPlayerName} has won! All pawns are home! 🏆`;
                    // Play win sound
                    audioService.play('win');
                }
            }

            const isGameOver = state.players.length - winners.length <= 1;

            if (isGameOver) {
                const remainingPlayer = state.players.find(p => !winners.includes(p.color));
                if (remainingPlayer) winners.push(remainingPlayer.color);

                // Get winner's name if available
                const winnerPlayer = state.players.find(p => p.color === winners[0]);
                const winnerName = winnerPlayer?.name || winners[0];

                return {
                    ...state,
                    tokens: newTokens,
                    winners,
                    turnState: 'GAMEOVER',
                    message: `${winnerName} is the winner!`,
                };
            }

            return {
                ...state,
                tokens: newTokens,
                winners,
                turnState: 'ANIMATING',
                message: winMessage || `${currentPlayerColor} is moving...`,
                legalMoves: [],
                _pendingExtraTurn: grantExtraTurn,
            };
        }

        case 'ANIMATION_COMPLETE': {
            // Guard: Only process if we're actually in ANIMATING state
            // This prevents duplicate processing or processing at wrong times
            if (state.turnState !== 'ANIMATING') {
                console.warn('⚠️ ANIMATION_COMPLETE received but state is not ANIMATING:', state.turnState);
                return state;
            }
            
            // Only use _pendingExtraTurn if it's explicitly set (not undefined)
            // This prevents using stale values from previous turns
            const shouldGrantExtraTurn = state._pendingExtraTurn === true;
            const nextState = getNextTurnState(state, shouldGrantExtraTurn);
            
            // If extra turn is granted, ensure we're back to ROLLING state
            const finalState = {
                ...state,
                ...nextState,
                _pendingExtraTurn: undefined, // Always clear after use
            };
            
            // Double-check: if extra turn was granted, we should be back to ROLLING with same player
            if (shouldGrantExtraTurn && finalState.turnState !== 'ROLLING') {
                console.warn('⚠️ Extra turn granted but state not ROLLING, fixing...');
                finalState.turnState = 'ROLLING';
                finalState.diceValue = null;
                finalState.legalMoves = [];
            }
            
            return finalState;
        }

        case 'NEXT_TURN': {
            const nextState = getNextTurnState(state, action.grantExtraTurn);
            return { 
                ...state, 
                ...nextState,
                _pendingExtraTurn: undefined, // Always clear when transitioning turns
            };
        }
        
        case 'AI_THINKING': {
            return { ...state, message: `${state.players[state.currentPlayerIndex].color} (AI) is thinking...` };
        }

        default:
            return state;
    }
};

const getNextTurnState = (state: GameState, grantExtraTurn: boolean): Partial<GameState> => {
    if (!state.players || state.players.length === 0) {
        console.error('❌ getNextTurnState: No players in state');
        return {};
    }
    
    let nextPlayerIndex = grantExtraTurn ? state.currentPlayerIndex : (state.currentPlayerIndex + 1) % state.players.length;
    
    // Skip players who have already won
    let attempts = 0;
    while (state.winners.includes(state.players[nextPlayerIndex]?.color) && attempts < state.players.length) {
        nextPlayerIndex = (nextPlayerIndex + 1) % state.players.length;
        attempts++;
    }
    
    const nextPlayer = state.players[nextPlayerIndex];
    
    return {
        currentPlayerIndex: nextPlayerIndex,
        diceValue: null,
        turnState: 'ROLLING',
        message: '',
        legalMoves: [],
    };
};

interface MultiplayerConfig {
  gameId: string;
  localPlayerColor: PlayerColor;
  sessionId: string;
}

export const useGameLogic = (multiplayerConfig?: MultiplayerConfig) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const isMultiplayer = !!multiplayerConfig;
    const isMyTurn = isMultiplayer
        ? state.players[state.currentPlayerIndex]?.color === multiplayerConfig.localPlayerColor
        : true;
    
    // Removed excessive turn state logging for performance
    
    // Clear rolling flag when we're ready to roll again (ROLLING state with null dice)
    // This ensures the flag is cleared after getting an extra turn (e.g., from rolling a 6)
    // Also clear it when state changes away from rolling or when dice is rolled
    useEffect(() => {
        // Always clear the flag - it should only be true during the brief moment of processing a roll
        // The key fix: clear it when we're back to ROLLING with null dice (ready for next roll)
        if (state.turnState === 'ROLLING' && state.diceValue === null) {
            isRollingRef.current = false;
        }
        // Also clear when not in rolling state or when dice has been rolled
        if (state.turnState !== 'ROLLING' || state.diceValue !== null) {
            isRollingRef.current = false;
        }
    }, [state.turnState, state.diceValue]);
    
    const localDispatchRef = useRef(dispatch);
    localDispatchRef.current = dispatch;
    
    // Refs to store latest functions to avoid timer resets
    const handleRollDiceRef = useRef<(() => Promise<void>) | null>(null);
    const broadcastActionRef = useRef<((action: Action) => void) | null>(null);
    const dispatchRef = useRef<((action: Action) => void) | null>(null);
    dispatchRef.current = dispatch;
    
    // Keep a ref to the current state for use in callbacks
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Refs for timeout management
    const diceRollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const botPlayingRef = useRef<boolean>(false);
    const isConnectedRef = useRef<boolean>(true);
    const isRollingRef = useRef<boolean>(false); // Prevent multiple simultaneous rolls
    
    // Countdown timer state
    const [diceRollCountdown, setDiceRollCountdown] = useState<number | null>(null);
    const [moveCountdown, setMoveCountdown] = useState<number | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const diceRollCountdownRef = useRef<number | null>(null);
    const moveCountdownRef = useRef<number | null>(null);

    // Track socket connection status
    useEffect(() => {
        if (!isMultiplayer) {
            isConnectedRef.current = true;
            return;
        }
        
        // Check initial connection status
        isConnectedRef.current = socketService.isConnected();
        
        // Set up connection status listener
        const cleanup = socketService.onConnectionChange((connected) => {
            if (connected) {
                console.log('✅ Socket connected');
                isConnectedRef.current = true;
                // If bot was playing for us, stop it when we reconnect
                if (botPlayingRef.current) {
                    botPlayingRef.current = false;
                    // Clear any pending bot timeouts
                    if (diceRollTimeoutRef.current) {
                        clearTimeout(diceRollTimeoutRef.current);
                        diceRollTimeoutRef.current = null;
                    }
                    if (moveTimeoutRef.current) {
                        clearTimeout(moveTimeoutRef.current);
                        moveTimeoutRef.current = null;
                    }
                    console.log('🛑 Stopped bot - player reconnected and is back in control');
                }
            } else {
                console.log('❌ Socket disconnected - bot will play on timeout');
                isConnectedRef.current = false;
            }
        });
        
        return cleanup;
    }, [isMultiplayer]);

    // Clear all timeouts on unmount
    useEffect(() => {
        return () => {
            if (diceRollTimeoutRef.current) {
                clearTimeout(diceRollTimeoutRef.current);
                diceRollTimeoutRef.current = null;
            }
            if (moveTimeoutRef.current) {
                clearTimeout(moveTimeoutRef.current);
                moveTimeoutRef.current = null;
            }
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
        };
    }, []);

    // Sync refs with state values
    useEffect(() => {
        diceRollCountdownRef.current = diceRollCountdown;
    }, [diceRollCountdown]);
    
    useEffect(() => {
        moveCountdownRef.current = moveCountdown;
    }, [moveCountdown]);

    // Countdown timer effect - updates every second
    // Only start/stop interval when countdowns become active/inactive, not on every value change
    useEffect(() => {
        const hasActiveCountdown = diceRollCountdown !== null || moveCountdown !== null;
        
        // Only manage interval when countdown state changes from active to inactive or vice versa
        if (hasActiveCountdown && !countdownIntervalRef.current) {
            // Start interval when countdown becomes active
            countdownIntervalRef.current = setInterval(() => {
                // Use refs to get current values without causing re-renders
                const currentDiceRoll = diceRollCountdownRef.current;
                const currentMove = moveCountdownRef.current;
                
                if (currentDiceRoll !== null && currentDiceRoll > 0) {
                    const newValue = currentDiceRoll - 1;
                    if (newValue <= 0) {
                        setDiceRollCountdown(null);
                    } else {
                        setDiceRollCountdown(newValue);
                    }
                }
                
                if (currentMove !== null && currentMove > 0) {
                    const newValue = currentMove - 1;
                    if (newValue <= 0) {
                        setMoveCountdown(null);
                    } else {
                        setMoveCountdown(newValue);
                    }
                }
            }, 1000);
        } else if (!hasActiveCountdown && countdownIntervalRef.current) {
            // Stop interval when all countdowns become inactive
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        return () => {
            // Cleanup on unmount or when countdowns become inactive
            if (countdownIntervalRef.current && !hasActiveCountdown) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
        };
    }, [diceRollCountdown !== null, moveCountdown !== null]);

    // --- Multiplayer Communication Effect ---
    useEffect(() => {
        if (!isMultiplayer) return;

        const handleMessage = (message: MultiplayerMessage) => {
            if (message.type === 'GAME_ACTION') {
                // Only process actions from other players (not our own)
                if (message.payload.sessionId !== multiplayerConfig.sessionId) {
                    // Received an action from the other player
                    const action = message.payload.action;
                    console.log('📨 Received action from other player:', {
                        actionType: action.type,
                        fromPlayer: message.payload.sessionId,
                        mySessionId: multiplayerConfig.sessionId
                    });
                    
                    // Dispatch the action - this will update the state
                    localDispatchRef.current(action);
                    
                    console.log('✅ Action dispatched, state will update on next render');
                } else {
                    // This is our own action - we already processed it locally, ignore
                    console.log('⏭️ Ignoring own action:', message.payload.action.type);
                }
            } else if (message.type === 'GAME_STATE_UPDATE') {
                // Received full state update from server (for sync/recovery)
                console.log('🔄 Received full state update from server, syncing...');
                const syncedState = message.payload.state;

                // Apply the state update - but don't interrupt if we're animating
                const currentState = stateRef.current;
                if (currentState.turnState === 'ANIMATING' && syncedState.turnState !== 'ANIMATING') {
                    console.log('⚠️ Ignoring state update during animation', {
                        currentTurnState: currentState.turnState,
                        newTurnState: syncedState.turnState
                    });
                    // Don't apply the state update if it would interrupt animation
                    return;
                }

                localDispatchRef.current({ type: 'SET_STATE', state: syncedState });
                
                // Clear rolling flag when state is synced to ensure player can roll if it's their turn
                // This is especially important after reconnection
                if (syncedState.turnState === 'ROLLING' && syncedState.diceValue === null) {
                    setTimeout(() => {
                        isRollingRef.current = false;
                    }, 100);
                }
            }
        };

        multiplayerService.init(multiplayerConfig.gameId, handleMessage);

        return () => multiplayerService.close();
    }, [isMultiplayer, multiplayerConfig?.gameId, multiplayerConfig?.sessionId]);

    const broadcastAction = useCallback((action: Action) => {
        if (!isMultiplayer) return;
        console.log('📡 Broadcasting action:', action.type, 'from player:', multiplayerConfig.sessionId);
        try {
            multiplayerService.broadcast(multiplayerConfig.gameId, {
                type: 'GAME_ACTION',
                payload: { action, sessionId: multiplayerConfig.sessionId }
            }, multiplayerConfig.sessionId);
        } catch (error) {
            console.error('❌ Error broadcasting action:', error);
        }
    }, [isMultiplayer, multiplayerConfig]);
    
    // Initialize broadcastAction ref immediately
    broadcastActionRef.current = broadcastAction;

    const calculateLegalMoves = useCallback((currentState: GameState, diceValue: number): LegalMove[] => {
        const { tokens, currentPlayerIndex, players } = currentState;
        if (!players[currentPlayerIndex]) return [];
        const currentPlayer = players[currentPlayerIndex];
        const moves: LegalMove[] = [];

        for (const token of tokens.filter(t => t.color === currentPlayer.color)) {
            const currentPos = token.position;

            if (currentPos.type === 'YARD') {
                if (diceValue === 6) {
                    const startPos = START_POSITIONS[currentPlayer.color];
                    const tokensOnStart = tokens.filter(t => t.position.type === 'PATH' && t.position.index === startPos && t.color === currentPlayer.color);
                    if (tokensOnStart.length < 2) {
                        moves.push({ tokenId: token.id, finalPosition: { type: 'PATH', index: startPos } });
                    }
                }
            } else if (currentPos.type === 'PATH') {
                const homeEntrance = HOME_ENTRANCES[currentPlayer.color];
                const newPathIndex = currentPos.index + diceValue;
                
                const distanceToHomeEntrance = (homeEntrance - currentPos.index + 52) % 52;
                
                if (diceValue > distanceToHomeEntrance) {
                    const stepsIntoHome = diceValue - distanceToHomeEntrance - 1;
                    if (stepsIntoHome < HOME_PATH_LENGTH) {
                        moves.push({ tokenId: token.id, finalPosition: { type: 'HOME_PATH', index: stepsIntoHome } });
                    } else if (stepsIntoHome === HOME_PATH_LENGTH) {
                        moves.push({ tokenId: token.id, finalPosition: { type: 'HOME' } });
                    }
                } else {
                    const finalIndex = (currentPos.index + diceValue) % 52;
                    const tokensAtDest = tokens.filter(t => t.position.type === 'PATH' && t.position.index === finalIndex && t.color === currentPlayer.color);
                    if (tokensAtDest.length < 2) {
                        moves.push({ tokenId: token.id, finalPosition: { type: 'PATH', index: finalIndex } });
                    }
                }
            } else if (currentPos.type === 'HOME_PATH') {
                const newHomeIndex = currentPos.index + diceValue;
                if (newHomeIndex < HOME_PATH_LENGTH) {
                    moves.push({ tokenId: token.id, finalPosition: { type: 'HOME_PATH', index: newHomeIndex } });
                } else if (newHomeIndex === HOME_PATH_LENGTH) {
                    moves.push({ tokenId: token.id, finalPosition: { type: 'HOME' } });
                }
            }
        }
        return moves;
    }, []);

    const handleRollDice = useCallback(async () => {
        // Use latest state to prevent race conditions
        const latestState = stateRef.current;
        
        // Prevent multiple simultaneous rolls
        if (isRollingRef.current) {
            console.log('❌ Roll already in progress, ignoring duplicate roll request');
            return;
        }
        
        // Clear dice roll timeout when user manually rolls
        if (diceRollTimeoutRef.current) {
            clearTimeout(diceRollTimeoutRef.current);
            diceRollTimeoutRef.current = null;
        }
        
        // Reset countdown
        setDiceRollCountdown(null);
        
        // If bot was playing, stop it when user manually acts
        if (botPlayingRef.current) {
            botPlayingRef.current = false;
            console.log('🛑 User manually rolled - stopping bot');
        }
        
        // Validate turn state with latest state to prevent race conditions
        const currentPlayer = latestState.players[latestState.currentPlayerIndex];
        const calculatedIsMyTurn = isMultiplayer
            ? currentPlayer?.color === multiplayerConfig?.localPlayerColor
            : (!currentPlayer?.isAI);
        
        // Strict validation: Must be in ROLLING state, must be player's turn, and dice must be null
        if (latestState.turnState !== 'ROLLING' || !calculatedIsMyTurn || latestState.diceValue !== null) {
            return;
        }
        
        // Mark as rolling to prevent duplicate rolls
        isRollingRef.current = true;

        const roll = Math.floor(Math.random() * 6) + 1;
        const rollAction: Action = { type: 'ROLL_DICE', value: roll };
        dispatch(rollAction);
        broadcastAction(rollAction);
        // Play dice roll sound after dispatch (user has already interacted by clicking)
        setTimeout(() => {
          audioService.play('diceRoll');
        }, 50);

        // Use stateRef to get the latest state - this ensures we have the most up-to-date token positions
        // Critical when rolling multiple 6s in a row, as state might have changed from previous turns
        // latestState already declared above, just use it
        
        // Debug logging to help identify the issue
        const tokensInYard = latestState.tokens.filter(t => 
            t.color === currentPlayer?.color && 
            t.position.type === 'YARD'
        );
        const startPos = START_POSITIONS[currentPlayer?.color || 'red'];
        const tokensOnStart = latestState.tokens.filter(t => 
            t.color === currentPlayer?.color &&
            t.position.type === 'PATH' &&
            t.position.index === startPos
        );
        
        console.log('🔍 Calculating moves with latest state:', {
            currentPlayerColor: currentPlayer?.color,
            diceValue: roll,
            tokensInYard: tokensInYard.length,
            tokensInYardIds: tokensInYard.map(t => t.id),
            tokensOnStart: tokensOnStart.length,
            tokensOnStartIds: tokensOnStart.map(t => t.id),
            startPos
        });
        
        // Construct state after ROLL_DICE for accurate move calculation
        const stateAfterRoll = {
            ...latestState,
            diceValue: roll,
            turnState: 'MOVING' as const
        };
        
        const moves = calculateLegalMoves(stateAfterRoll, roll);
        const movesAction: Action = { type: 'SET_LEGAL_MOVES_AND_PROCEED', moves };
        dispatch(movesAction);
        broadcastAction(movesAction);

        if (moves.length === 0) {
            // If no legal moves available, player gets another turn ONLY if they rolled a 6
            // Use ANIMATION_COMPLETE to properly transition through ANIMATING state
            // This ensures state consistency and prevents multiple rolls
            setTimeout(() => {
                // Check if we're still in the correct state before transitioning
                const currentState = stateRef.current;
                if (currentState.turnState === 'ANIMATING' && currentState.diceValue === roll) {
                    // Process as animation complete, which will handle extra turn logic
                    const nextTurnAction: Action = { 
                        type: 'NEXT_TURN', 
                        grantExtraTurn: roll === 6 
                    };
                    dispatch(nextTurnAction);
                    broadcastAction(nextTurnAction);
                }
            }, 1200);
        } else if (moves.length === 1 && !currentPlayer.isAI) {
            // Auto-move when only one legal move is available (for human players)
            // Wait for dice animation to complete (1000ms) + small delay to see the outcome
            console.log('🤖 Auto-moving: only one legal move available (waiting for dice animation)');
            const autoMove = moves[0];
            setTimeout(() => {
                const currentState = stateRef.current;
                // Double-check we're still in the correct state
                if (currentState.turnState === 'MOVING' && currentState.legalMoves.length === 1) {
                    const moveAction: Action = { type: 'MOVE_TOKEN', move: autoMove };
                    dispatch(moveAction);
                    broadcastAction(moveAction);
                }
            }, 1200); // Wait for dice animation (1000ms) + 200ms to see the outcome
        } else {
            if (currentPlayer.isAI && !isMultiplayer) { // AI only runs in single player
                dispatch({ type: 'AI_THINKING' });
                const currentStateForAI = { ...stateAfterRoll, legalMoves: moves };
                const aiMove = await getAIMove(currentStateForAI);
                if (aiMove) {
                    setTimeout(() => dispatch({ type: 'MOVE_TOKEN', move: aiMove }), 1000);
                } else {
                    setTimeout(() => dispatch({ type: 'NEXT_TURN', grantExtraTurn: false }), 1000);
                }
            }
        }
    }, [state, calculateLegalMoves, isMyTurn, isMultiplayer, broadcastAction, multiplayerConfig]);
    
    // Initialize handleRollDice ref immediately
    handleRollDiceRef.current = handleRollDice;
    
    // Update refs whenever functions change (must be after function definitions)
    useEffect(() => {
        broadcastActionRef.current = broadcastAction;
    }, [broadcastAction]);
    
    useEffect(() => {
        handleRollDiceRef.current = handleRollDice;
    }, [handleRollDice]);

    // Track when dice was rolled to wait for animation
    const diceRollTimeRef = useRef<number | null>(null);
    
    // Update dice roll time when dice value changes
    useEffect(() => {
        if (state.diceValue !== null && state.turnState === 'MOVING') {
            diceRollTimeRef.current = Date.now();
        }
    }, [state.diceValue, state.turnState]);

    // Auto-move when only one legal move is available
    useEffect(() => {
        if (
            state.gameStarted &&
            state.turnState === 'MOVING' &&
            state.legalMoves.length === 1 &&
            isMyTurn &&
            !state.players[state.currentPlayerIndex]?.isAI &&
            state.diceValue !== null
        ) {
            console.log('🤖 Auto-moving: only one legal move available (waiting for dice animation)');
            const autoMove = state.legalMoves[0];
            
            // Calculate delay: wait for dice animation (1000ms) + small delay to see outcome
            const diceAnimationTime = 1000;
            const outcomeDelay = 200;
            const totalDelay = diceAnimationTime + outcomeDelay;
            
            // If dice was just rolled, use full delay; otherwise use shorter delay
            const timeSinceRoll = diceRollTimeRef.current ? Date.now() - diceRollTimeRef.current : totalDelay;
            const delay = Math.max(0, totalDelay - timeSinceRoll);
            
            const timer = setTimeout(() => {
                const currentState = stateRef.current;
                // Double-check we're still in the correct state
                if (
                    currentState.turnState === 'MOVING' &&
                    currentState.legalMoves.length === 1 &&
                    currentState.legalMoves[0].tokenId === autoMove.tokenId
                ) {
                    const moveAction: Action = { type: 'MOVE_TOKEN', move: autoMove };
                    dispatch(moveAction);
                    broadcastAction(moveAction);
                }
            }, delay);
            
            return () => clearTimeout(timer);
        }
    }, [state.turnState, state.legalMoves, state.gameStarted, state.diceValue, isMyTurn, state.currentPlayerIndex, state.players, broadcastAction, dispatch]);

    const handleMoveToken = useCallback((tokenId: string) => {
        // Clear move timeout when user manually moves
        if (moveTimeoutRef.current) {
            clearTimeout(moveTimeoutRef.current);
            moveTimeoutRef.current = null;
        }
        
        // Reset countdown
        setMoveCountdown(null);
        
        // If bot was playing, stop it when user manually acts
        if (botPlayingRef.current) {
            botPlayingRef.current = false;
            console.log('🛑 User manually moved - stopping bot');
        }
        
        if (state.turnState !== 'MOVING' || !isMyTurn) {
            console.log('❌ Cannot move token:', { turnState: state.turnState, isMyTurn });
            return;
        }
        const move = state.legalMoves.find(m => m.tokenId === tokenId);
        if (move) {
            console.log('🎯 Moving token:', tokenId, 'to:', move.finalPosition);
            const moveAction: Action = { type: 'MOVE_TOKEN', move };
            dispatch(moveAction);
            broadcastAction(moveAction);
        } else {
            console.warn("Illegal move attempted for token:", tokenId);
        }
    }, [state.turnState, state.legalMoves, isMyTurn, broadcastAction]);
    
    const startGame = (players: Player[], initialState?: GameState, betAmount?: number) => dispatch({ type: 'START_GAME', players, initialState, betAmount });

    const setState = (newState: GameState) => dispatch({ type: 'SET_STATE', state: newState });

    const handleAnimationComplete = useCallback(() => {
        // Use stateRef to get the latest state to avoid stale closures
        const currentState = stateRef.current;
        
        // Guard: Only process if we're actually in ANIMATING state
        if (currentState.turnState !== 'ANIMATING') {
            console.warn('⚠️ handleAnimationComplete called but state is not ANIMATING:', currentState.turnState);
            return;
        }
        
        // In multiplayer, only the player who made the move should trigger ANIMATION_COMPLETE
        // The other player will receive it via WebSocket
        const currentPlayer = currentState.players[currentState.currentPlayerIndex];
        const calculatedIsMyTurn = currentPlayer?.color === multiplayerConfig?.localPlayerColor;
        
        if (isMultiplayer && !calculatedIsMyTurn) {
            // Don't process locally if it's not our turn - wait for the broadcast
            console.log('⏸️ Skipping local ANIMATION_COMPLETE - waiting for broadcast from other player', {
                currentPlayerColor: currentPlayer?.color,
                myColor: multiplayerConfig?.localPlayerColor
            });
            return;
        }
        
        // Process locally and broadcast if multiplayer
        const nextTurnAction: Action = { type: 'ANIMATION_COMPLETE' };
        const hasExtraTurn = currentState._pendingExtraTurn === true;
        console.log('✅ Processing ANIMATION_COMPLETE', { 
            isMyTurn: calculatedIsMyTurn, 
            isMultiplayer,
            currentPlayerColor: currentPlayer?.color,
            _pendingExtraTurn: currentState._pendingExtraTurn,
            hasExtraTurn,
            willGrantExtraTurn: hasExtraTurn
        });
        dispatch(nextTurnAction);
        
        // If extra turn is granted, clear the rolling flag immediately so player can roll again
        if (hasExtraTurn) {
            // Clear the flag after a brief delay to ensure state has updated
            setTimeout(() => {
                isRollingRef.current = false;
            }, 100);
        }
        
        // Broadcast in multiplayer so the other player receives it
        if (isMultiplayer) {
            broadcastAction(nextTurnAction);
            // Also send full state update after turn transition to ensure sync
            setTimeout(() => {
                // Use stateRef to get the latest state after the reducer has updated it
                const updatedState = stateRef.current;
                // Clear legalMoves when broadcasting to other players to prevent wrong movable indicators
                const stateForBroadcast = {
                    ...updatedState,
                    legalMoves: [] // Don't broadcast legal moves to other players
                };
                console.log('📤 Sending state sync after ANIMATION_COMPLETE', {
                    turnState: stateForBroadcast.turnState,
                    currentPlayerIndex: stateForBroadcast.currentPlayerIndex,
                    diceValue: stateForBroadcast.diceValue,
                    hasExtraTurn: hasExtraTurn
                });
                multiplayerService.broadcast(multiplayerConfig.gameId, {
                    type: 'GAME_STATE_UPDATE',
                    payload: { state: stateForBroadcast, sessionId: multiplayerConfig.sessionId }
                }, multiplayerConfig.sessionId);
            }, 500);
        }
    }, [isMultiplayer, broadcastAction, multiplayerConfig, dispatch]);

    // Auto-roll dice after 20 seconds if player doesn't roll
    useEffect(() => {
        // Clear any existing timeout
        if (diceRollTimeoutRef.current) {
            clearTimeout(diceRollTimeoutRef.current);
            diceRollTimeoutRef.current = null;
        }

        // Only set timeout if:
        // 1. Game is started
        // 2. Turn state is ROLLING
        // 3. It's a player's turn (not AI in single player mode)
        // 4. Bot is not already actively playing for this player
        const currentPlayer = state.players[state.currentPlayerIndex];
        const isPlayerTurn = isMultiplayer 
            ? (currentPlayer?.color === multiplayerConfig?.localPlayerColor)
            : (!currentPlayer?.isAI);
        
        if (
            state.gameStarted &&
            state.turnState === 'ROLLING' &&
            currentPlayer &&
            isPlayerTurn &&
            !botPlayingRef.current
        ) {
            console.log('⏰ Starting 8s timeout for dice roll', {
                gameStarted: state.gameStarted,
                turnState: state.turnState,
                currentPlayer: currentPlayer?.color,
                isPlayerTurn,
                botPlaying: botPlayingRef.current,
                isMultiplayer
            });
            setDiceRollCountdown(8); // Start countdown at 8 seconds
            console.log('⏰ Set diceRollCountdown to 8');
            
            diceRollTimeoutRef.current = setTimeout(() => {
                setDiceRollCountdown(null); // Clear countdown when timeout expires
            }, 8000); // 8 seconds timeout
                const latestState = stateRef.current;
                const latestPlayer = latestState.players[latestState.currentPlayerIndex];
                
                // Double-check conditions before auto-rolling
                // Auto-roll in both single-player and multiplayer modes
                if (
                    latestState.turnState === 'ROLLING' &&
                    latestState.gameStarted &&
                    latestPlayer &&
                    !botPlayingRef.current
                ) {
                    const isStillPlayerTurn = isMultiplayer
                        ? (latestPlayer.color === multiplayerConfig?.localPlayerColor)
                        : (!latestPlayer.isAI);
                    
                    if (isStillPlayerTurn) {
                        console.log('⏰ Auto-rolling dice after 8s timeout');
                        const wasDisconnected = !isConnectedRef.current;
                        
                        // Mark bot as playing if player is disconnected
                        if (wasDisconnected) {
                            botPlayingRef.current = true;
                            console.log('🤖 Bot playing for disconnected player');
                        }
                        
                        handleRollDiceRef.current?.();
                    }
                }
            }, 15000); // Always wait 15 seconds
        }

        return () => {
            const latestState = stateRef.current;
            if (diceRollTimeoutRef.current) {
                clearTimeout(diceRollTimeoutRef.current);
                diceRollTimeoutRef.current = null;
            }
            // Only clear countdown if we're no longer in ROLLING state or it's not our turn
            // This prevents clearing the countdown when the effect re-runs due to other state changes
            const currentPlayer = latestState.players[latestState.currentPlayerIndex];
            const isStillPlayerTurn = currentPlayer && (isMultiplayer 
                ? currentPlayer.color === multiplayerConfig?.localPlayerColor
                : !currentPlayer.isAI);
            const shouldClear = latestState.turnState !== 'ROLLING' || 
                              !latestState.gameStarted ||
                              !isStillPlayerTurn;
            if (shouldClear) {
                setDiceRollCountdown(null);
            }
        };
    }, [state.turnState, state.currentPlayerIndex, state.gameStarted, isMultiplayer, multiplayerConfig?.localPlayerColor]);

    // Auto-move after 25 seconds if player doesn't move
    useEffect(() => {
        // Clear any existing timeout
        if (moveTimeoutRef.current) {
            clearTimeout(moveTimeoutRef.current);
            moveTimeoutRef.current = null;
        }

        // Only set timeout if:
        // 1. Game is started
        // 2. Turn state is MOVING
        // 3. There are legal moves available
        // 4. It's a player's turn (not AI in single player mode)
        // 5. Bot is not already actively playing for this player
        const currentPlayer = state.players[state.currentPlayerIndex];
        const isPlayerTurn = isMultiplayer
            ? (currentPlayer?.color === multiplayerConfig?.localPlayerColor)
            : (!currentPlayer?.isAI);
        
        if (
            state.gameStarted &&
            state.turnState === 'MOVING' &&
            state.legalMoves.length > 0 &&
            currentPlayer &&
            isPlayerTurn &&
            !botPlayingRef.current
        ) {
            setMoveCountdown(12); // Start countdown at 12 seconds
            
            moveTimeoutRef.current = setTimeout(() => {
                setMoveCountdown(null); // Clear countdown when timeout expires
            }, 12000); // 12 seconds timeout
                const latestState = stateRef.current;
                const latestPlayer = latestState.players[latestState.currentPlayerIndex];
                
                // Double-check conditions before auto-moving
                if (
                    latestState.turnState === 'MOVING' &&
                    latestState.gameStarted &&
                    latestState.legalMoves.length > 0 &&
                    latestPlayer &&
                    !botPlayingRef.current
                ) {
                    const isStillPlayerTurn = isMultiplayer
                        ? (latestPlayer.color === multiplayerConfig?.localPlayerColor)
                        : (!latestPlayer.isAI);
                    
                    if (isStillPlayerTurn) {
                        const wasDisconnected = !isConnectedRef.current;
                        
                        // Mark bot as playing if player is disconnected
                        if (wasDisconnected) {
                            botPlayingRef.current = true;
                            console.log('🤖 Bot playing for disconnected player');
                        }
                        
                        // Pick a random move from available legal moves
                        const randomMove = latestState.legalMoves[Math.floor(Math.random() * latestState.legalMoves.length)];
                        if (randomMove) {
                            const moveAction: Action = { type: 'MOVE_TOKEN', move: randomMove };
                            dispatchRef.current?.(moveAction);
                            broadcastActionRef.current?.(moveAction);
                        } else {
                            // No move available, pass turn
                            const nextTurnAction: Action = { type: 'NEXT_TURN', grantExtraTurn: false };
                            dispatchRef.current?.(nextTurnAction);
                            broadcastActionRef.current?.(nextTurnAction);
                        }
                    }
                }
            }, 25000); // Always wait 25 seconds
        }

        return () => {
            const latestState = stateRef.current;
            const currentPlayer = latestState.players[latestState.currentPlayerIndex];
            const isStillPlayerTurn = currentPlayer && (isMultiplayer
                ? currentPlayer.color === multiplayerConfig?.localPlayerColor
                : !currentPlayer.isAI);
            const shouldClear = latestState.turnState !== 'MOVING' || 
                              !latestState.gameStarted ||
                              latestState.legalMoves.length === 0 ||
                              !isStillPlayerTurn;
            if (moveTimeoutRef.current) {
                clearTimeout(moveTimeoutRef.current);
                moveTimeoutRef.current = null;
            }
            if (shouldClear) {
                setMoveCountdown(null);
            }
        };
    }, [state.turnState, state.legalMoves, state.currentPlayerIndex, state.gameStarted, isMultiplayer, multiplayerConfig?.localPlayerColor]);

    useEffect(() => {
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (state.turnState === 'ROLLING' && currentPlayer?.isAI && state.gameStarted && !isMultiplayer) {
            const timer = setTimeout(() => {
                // AI player rolls dice directly without going through handleRollDice validation
                const latestState = stateRef.current;
                const latestPlayer = latestState.players[latestState.currentPlayerIndex];
                
                // Double-check it's still the AI's turn
                if (latestState.turnState === 'ROLLING' && latestPlayer?.isAI && latestState.diceValue === null) {
                    console.log('🤖 AI rolling dice');
                    const roll = Math.floor(Math.random() * 6) + 1;
                    const rollAction: Action = { type: 'ROLL_DICE', value: roll };
                    console.log('🎲 AI rolled:', roll);
                    dispatch(rollAction);
                    
                    // Calculate legal moves after roll
                    const stateAfterRoll = {
                        ...latestState,
                        diceValue: roll,
                        turnState: 'MOVING' as const
                    };
                    
                    const moves = calculateLegalMoves(stateAfterRoll, roll);
                    const movesAction: Action = { type: 'SET_LEGAL_MOVES_AND_PROCEED', moves };
                    console.log('📋 Legal moves calculated for AI:', moves.length);
                    dispatch(movesAction);
                    
                    // Play dice roll sound
                    setTimeout(() => {
                        audioService.play('diceRoll');
                    }, 100);
                    
                    // Handle moves
                    if (moves.length === 0) {
                        setTimeout(() => {
                            const currentState = stateRef.current;
                            if (currentState.turnState === 'ANIMATING' && currentState.diceValue === roll) {
                                const nextTurnAction: Action = { 
                                    type: 'NEXT_TURN', 
                                    grantExtraTurn: roll === 6 
                                };
                                dispatch(nextTurnAction);
                            }
                        }, 1200);
                    } else {
                        // AI will make a move
                        dispatch({ type: 'AI_THINKING' });
                        const currentStateForAI = { ...stateAfterRoll, legalMoves: moves };
                        getAIMove(currentStateForAI).then(aiMove => {
                            if (aiMove) {
                                setTimeout(() => dispatch({ type: 'MOVE_TOKEN', move: aiMove }), 1000);
                            } else {
                                setTimeout(() => dispatch({ type: 'NEXT_TURN', grantExtraTurn: false }), 1000);
                            }
                        });
                    }
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [state.turnState, state.currentPlayerIndex, state.players, state.gameStarted, isMultiplayer, calculateLegalMoves, dispatch]);

    // Periodic state synchronization check for multiplayer
    useEffect(() => {
        if (!isMultiplayer || !state.gameStarted) return;

        // Every 10 seconds, check if we're still in sync and request sync if needed
        const syncInterval = setInterval(() => {
            const currentPlayer = state.players[state.currentPlayerIndex];
            const expectedIsMyTurn = currentPlayer?.color === multiplayerConfig.localPlayerColor;
            
            if (state.turnState === 'ROLLING' && expectedIsMyTurn !== isMyTurn) {
                console.warn('⚠️ State desync detected! Expected isMyTurn:', expectedIsMyTurn, 'Actual:', isMyTurn);
                console.warn('Current state:', {
                    currentPlayerIndex: state.currentPlayerIndex,
                    currentPlayerColor: currentPlayer?.color,
                    myColor: multiplayerConfig.localPlayerColor,
                    turnState: state.turnState
                });
                // Request state sync from server
                socketService.requestStateSync(multiplayerConfig.gameId);
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(syncInterval);
    }, [isMultiplayer, state.gameStarted, state.currentPlayerIndex, state.players, state.turnState, isMyTurn, multiplayerConfig?.localPlayerColor, multiplayerConfig?.gameId]);

    return { 
        state, 
        startGame, 
        handleRollDice, 
        handleMoveToken, 
        handleAnimationComplete, 
        setState, 
        isMyTurn,
        diceRollCountdown,
        moveCountdown
    };
};
