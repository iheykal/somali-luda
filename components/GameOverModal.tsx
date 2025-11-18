
import React from 'react';
import type { PlayerColor, Player, GameState } from '../types';
// Fix: Import from the centralized boardLayout file.
import { PLAYER_TAILWIND_COLORS } from '../lib/boardLayout';

interface GameOverModalProps {
  winners: PlayerColor[];
  players: Player[];
  onRestart: () => void;
  gameState?: GameState;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ winners, players, onRestart, gameState }) => {
  const getPlayerName = (color: PlayerColor): string => {
    const player = players.find(p => p.color === color);
    return player?.name || color;
  };

  // Get winner info if available (for multiplayer with betting)
  const winnerInfo = gameState?.winnerInfo;
  const winnerAmount = winnerInfo?.winnerAmount;
  const betAmount = winnerInfo?.betAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl text-center w-full max-w-md border-4 border-cyan-500">
        <h2 className="text-4xl font-bold mb-4 text-cyan-400">Game Over!</h2>
        <div className="space-y-4 my-6">
            {winners.map((color, index) => {
              const playerName = getPlayerName(color);
              const isWinner = index === 0;
              const showWinnings = isWinner && winnerAmount !== undefined;
              
              return (
                <div key={color} className={`flex flex-col items-center p-4 rounded-lg text-2xl font-bold ${PLAYER_TAILWIND_COLORS[color].bg.replace('500','700')}`}>
                    <div className="flex items-center justify-between w-full mb-2">
                        <span>
                            {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </span>
                        <span className={`capitalize ${PLAYER_TAILWIND_COLORS[color].text.replace('500','300')}`}>{playerName}</span>
                    </div>
                    {showWinnings && (
                      <div className="mt-3 pt-3 border-t-2 border-white border-opacity-30 w-full">
                        <div className="text-lg text-white opacity-90 mb-1">You Won!</div>
                        <div className="text-3xl font-bold text-green-300">
                          ${winnerAmount.toFixed(2)}
                        </div>
                        {betAmount && (
                          <div className="text-sm text-white opacity-75 mt-1">
                            (Bet: ${betAmount.toFixed(2)} × 2 = ${(betAmount * 2).toFixed(2)} - 10% commission)
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })}
        </div>
        <button
          onClick={onRestart}
          className="mt-4 px-10 py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-2xl rounded-lg shadow-xl transition transform hover:scale-105"
        >
          Play Again
        </button>
      </div>
    </div>
  );
};

export default GameOverModal;