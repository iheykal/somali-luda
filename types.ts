

export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type TurnState = 'ROLLING' | 'MOVING' | 'ANIMATING' | 'GAMEOVER';

export type TokenPosition =
  | { type: 'YARD'; index: number } // 0-3 in the yard
  | { type: 'PATH'; index: number } // 0-51 on the main path
  | { type: 'HOME_PATH'; index: number } // 0-4 in the home path
  | { type: 'HOME' }; // Finished

export interface Token {
  id: string; // e.g., 'red-0'
  color: PlayerColor;
  position: TokenPosition;
}

export interface Player {
  color: PlayerColor;
  isAI: boolean;
  name?: string;
}

export interface LegalMove {
  tokenId: string;
  finalPosition: TokenPosition;
}

export interface GameState {
  players: Player[];
  tokens: Token[];
  currentPlayerIndex: number;
  diceValue: number | null;
  turnState: TurnState;
  message: string;
  gameStarted: boolean;
  winners: PlayerColor[];
  legalMoves: LegalMove[];
  _pendingExtraTurn?: boolean;
  betAmount?: number; // Bet amount for multiplayer games
  winnerInfo?: {
    winnerColor: PlayerColor;
    winnerAmount: number;
    betAmount: number;
  };
}

// New type for simulating a multiplayer game session
export interface MultiplayerGame {
  id: string;
  hostSessionId: string;
  guestSessionId: string | null;
  state: GameState;
  lastUpdate: number; // Used to trigger storage events reliably
}

export type MultiplayerMessage =
  | { type: 'PLAYER_JOINED'; payload: { sessionId: string } }
  | { type: 'GAME_ACTION'; payload: { action: any; sessionId: string } }
  | { type: 'GAME_STATE_UPDATE'; payload: { state: GameState; sessionId: string } };
