
import React from 'react';
import type { Player, Token } from '../types';

interface PlayerInfoProps {
  player: Player;
  tokens: Token[];
  isCurrentPlayer: boolean;
  winners: string[];
  message?: string;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, tokens, isCurrentPlayer, winners, message }) => {
  return (
    <div className="p-2">
      <h3 className="text-xl font-bold capitalize text-slate-200">
        {player.name || player.color} {player.isAI && '🤖'}
      </h3>
    </div>
  );
};

export default PlayerInfo;