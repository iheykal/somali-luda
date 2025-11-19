
import React from 'react';
import type { Player, Token, GameState } from '../types';

interface PlayerInfoProps {
  player: Player;
  tokens: Token[];
  isCurrentPlayer: boolean;
  winners: string[];
  message?: string;
  gameState?: GameState;
  isDisconnected?: boolean;
  isBotPlaying?: boolean;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, tokens, isCurrentPlayer, winners, message, gameState, isDisconnected, isBotPlaying }) => {
  // Calculate potential winner amount for multiplayer games with betting
  const getWinnerAmountPreview = () => {
    if (!gameState?.betAmount) {
      return null;
    }

    const totalBet = gameState.betAmount * 2; // 2 players
    const commission = totalBet * 0.10; // 10% commission
    const winnerAmount = totalBet - commission;

    return winnerAmount;
  };

  const winnerAmountPreview = getWinnerAmountPreview();

  return (
    <div className="p-1 sm:p-2 w-full max-w-xs mx-auto">
      {winnerAmountPreview && isCurrentPlayer && !winners.includes(player.color) && (
        <div className="text-base sm:text-lg lg:text-xl font-bold text-green-400 mb-1 text-center">
          ${winnerAmountPreview.toFixed(1)}
        </div>
      )}
      
      {winners.includes(player.color) && winnerAmountPreview && (
        <div className="text-base sm:text-lg lg:text-xl font-bold text-green-400 mb-1 text-center">
          ${winnerAmountPreview.toFixed(1)}
        </div>
      )}

      <h3 className="text-sm sm:text-base lg:text-xl font-bold capitalize text-slate-200 truncate text-center">
        {player.name || player.color} {player.isAI && '🤖'}
      </h3>

      {winners.includes(player.color) && (
        <div className="mt-1 text-xs sm:text-sm text-green-200 text-center">🏆 Winner!</div>
      )}

      {isDisconnected ? (
        <div className="mt-1 text-xs sm:text-sm text-red-400 text-center">
          {isBotPlaying ? '🤖 Player Left - Bot Playing' : '⚠️ Player Disconnected'}
        </div>
      ) : (
        <div className="mt-1 text-xs sm:text-sm text-green-400 text-center">
          🟢 Online
        </div>
      )}

      {isCurrentPlayer && message && !winnerAmountPreview && (
        <div className="mt-1 text-xs sm:text-sm text-cyan-200 break-words text-center">{message}</div>
      )}
    </div>
  );
};

export default PlayerInfo;