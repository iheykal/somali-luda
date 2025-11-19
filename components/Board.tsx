import React, { useState, useEffect, useRef } from 'react';
import type { GameState, PlayerColor, Token, LegalMove } from '../types';
import {
  PLAYER_TAILWIND_COLORS,
  PLAYER_COLORS,
  mainPathCoords,
  homePathCoords,
  yardCoords,
  SAFE_SQUARES,
  START_POSITIONS,
  getTokenPositionCoords,
  getAnimationPath,
} from '../lib/boardLayout';

interface BoardProps {
  gameState: GameState;
  onMoveToken: (tokenId: string) => void;
  onAnimationComplete: () => void;
  isMyTurn: boolean;
  localPlayerColor?: PlayerColor;
}

// Helper hook to get the previous value of a prop or state
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}


const Board: React.FC<BoardProps> = ({ gameState, onMoveToken, onAnimationComplete, isMyTurn, localPlayerColor }) => {
  const { tokens, legalMoves, diceValue, turnState, currentPlayerIndex, players } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const isCurrentPlayerTurn = currentPlayer?.color && isMyTurn;
  const size = 800; // SVG canvas size
  const cellSize = size / 15;
  const [animation, setAnimation] = useState<{ tokenId: string, tokenColor: PlayerColor, path: {x: number, y: number}[], step: number, displayColor: PlayerColor } | null>(null);
  const [pendingAnimations, setPendingAnimations] = useState<Set<string>>(new Set());
  const capturedTokensRef = useRef<number>(0);
  const prevTokens = usePrevious(tokens);

  // Helper function to get display color: each player sees themselves as bottom-left (red) and opponent as top-right (yellow)
  const getDisplayColor = (tokenColor: PlayerColor): PlayerColor => {
    if (localPlayerColor) {
      // Multiplayer: local player always appears as red (bottom-left)
      if (tokenColor === localPlayerColor) {
        return 'red';
      }

      // Find the opponent (assuming 2-player game for now)
      const opponent = players.find(p => p.color !== localPlayerColor);
      if (opponent && tokenColor === opponent.color) {
        return 'yellow'; // opponent appears as top-right
      }

      // For games with more than 2 players, map other players to their original colors
      return tokenColor;
    } else {
      // Local game: first player = red (bottom-left), second player = yellow (top-right)
      if (tokenColor === players[0]?.color) {
        return 'red';
      }
      if (tokenColor === players[1]?.color) {
        return 'yellow';
      }

      // Other players keep their original colors
      return tokenColor;
    }
  };

  // Helper function to get display color for board elements (home areas, paths, etc.)
  const getBoardElementColor = (originalColor: PlayerColor): PlayerColor => {
    return getDisplayColor(originalColor);
  };

  useEffect(() => {
    if (turnState !== 'ANIMATING' || !prevTokens || !diceValue) return;

    // Find all tokens that moved (including captured pawns)
    const movedTokens = tokens.filter(token => {
      const prev = prevTokens.find(p => p.id === token.id);
      return prev && JSON.stringify(prev.position) !== JSON.stringify(token.position);
    });

    if (movedTokens.length > 0) {
      // Find the main moving token (the one that was moved by the player)
      const mainToken = movedTokens.find(t => {
        const prev = prevTokens.find(p => p.id === t.id);
        return prev && prev.position.type !== 'YARD' && t.position.type !== 'YARD';
      }) || movedTokens[0];

      // Find captured tokens (moved from PATH to YARD)
      const capturedTokens = movedTokens.filter(t => {
        const prev = prevTokens.find(p => p.id === t.id);
        return prev && prev.position.type === 'PATH' && t.position.type === 'YARD';
      });

      // Start with the main token animation
      if (mainToken) {
        const prevToken = prevTokens.find(pt => pt.id === mainToken.id);
        if (prevToken) {
          const path = getAnimationPath(prevToken.position, diceValue, mainToken.color);
          if (path.length > 0) {
            console.log('🎬 Starting animation for token:', mainToken.id, 'isMyTurn:', isMyTurn, 'currentPlayer:', currentPlayer?.color);
            
            // Track all tokens that need animation
            const allAnimatingTokens = new Set([mainToken.id, ...capturedTokens.map(t => t.id)]);
            setPendingAnimations(allAnimatingTokens);
            
            setAnimation({
              tokenId: mainToken.id,
              tokenColor: mainToken.color,
              path,
              step: 0,
              displayColor: getDisplayColor(mainToken.color),
            });
          } else {
            console.log('⚡ No animation path, completing immediately');
            // Only call onAnimationComplete if it's the current player's turn
            // The other player will receive ANIMATION_COMPLETE via WebSocket
            if (isCurrentPlayerTurn) {
              onAnimationComplete();
            }
          }
        }
      }

      // Handle captured tokens - they need to animate back to yard
      // Track how many were captured so we can add delay
      if (capturedTokens.length > 0) {
        console.log('💀 Captured tokens detected:', capturedTokens.map(t => t.id));
        capturedTokensRef.current = capturedTokens.length;
      } else {
        capturedTokensRef.current = 0;
      }
    }
  }, [turnState, tokens, prevTokens, diceValue, onAnimationComplete, isMyTurn, isCurrentPlayerTurn, currentPlayer, localPlayerColor, players]);

  useEffect(() => {
    if (!animation) return;

    if (animation.step >= animation.path.length - 1) {
      const endTimer = setTimeout(() => {
        console.log('✅ Animation complete for token:', animation.tokenId);
        
        // Remove this token from pending animations
        setPendingAnimations(prev => {
          const next = new Set(prev);
          next.delete(animation.tokenId);
          
          // If all animations are complete, call onAnimationComplete
          if (next.size === 0) {
            console.log('✅ All animations complete', { 
              isMyTurn, 
              isCurrentPlayerTurn, 
              currentPlayer: currentPlayer?.color,
              turnState: gameState.turnState
            });
            setAnimation(null);
            // Only call onAnimationComplete if it's the current player's turn
            // The other player will receive ANIMATION_COMPLETE via WebSocket
            if (isCurrentPlayerTurn) {
              console.log('📤 Calling onAnimationComplete (it\'s my turn)');
              // If there were captured tokens, add extra delay for their animation to complete
              const delay = capturedTokensRef.current > 0 ? 800 : 0;
              setTimeout(() => {
                capturedTokensRef.current = 0; // Reset after delay
                // In multiplayer, state updates from other players can change turnState before local animation completes
                // We need to call onAnimationComplete regardless of turnState to prevent getting stuck
                console.log('🎬 Animation sequence complete - calling onAnimationComplete', {
                  turnState: gameState.turnState,
                  isCurrentPlayerTurn,
                  pendingAnimationsCount: 0
                });
                onAnimationComplete();
              }, delay);
            } else {
              console.log('⏸️ Skipping onAnimationComplete (waiting for broadcast from other player)');
            }
          } else {
            console.log('⏳ Waiting for more animations:', Array.from(next));
          }
          
          return next;
        });
      }, 150);
      return () => clearTimeout(endTimer);
    }
    
    const stepTimer = setTimeout(() => {
      setAnimation(prev => prev ? ({ ...prev, step: prev.step + 1 }) : null);
    }, 120);

    return () => clearTimeout(stepTimer);
  }, [animation, onAnimationComplete, isMyTurn, isCurrentPlayerTurn, currentPlayer]);


  const toPx = (norm: number) => norm * size;

  const renderGridAndPaths = () => {
    const STAR_COLORS: Record<number, PlayerColor> = { 8: 'green', 21: 'yellow', 34: 'blue', 47: 'red' };
    
    // Map original colors to display colors for board elements
    const getDisplayColorForBoard = (originalColor: PlayerColor): PlayerColor => {
      return getBoardElementColor(originalColor);
    };

    // Get fill color for SVG elements
    const getFillColor = (originalColor: PlayerColor): string => {
      const displayColor = getDisplayColorForBoard(originalColor);
      return PLAYER_TAILWIND_COLORS[displayColor].hex;
    };

    return (
      <>
        {/* Home areas - map original colors to display colors */}
        <rect x={0} y={0} width={cellSize * 6} height={cellSize * 6} fill={getFillColor('green')} />
        <rect x={cellSize * 9} y={0} width={cellSize * 6} height={cellSize * 6} fill={getFillColor('yellow')} />
        <rect x={0} y={cellSize * 9} width={cellSize * 6} height={cellSize * 6} fill={getFillColor('red')} />
        <rect x={cellSize * 9} y={cellSize * 9} width={cellSize * 6} height={cellSize * 6} fill={getFillColor('blue')} />
        
        <rect x={cellSize * 0.5} y={cellSize * 0.5} width={cellSize * 5} height={cellSize * 5} fill="white" stroke="#d1d5db" strokeWidth="2" rx="8"/>
        <rect x={cellSize * 9.5} y={cellSize * 0.5} width={cellSize * 5} height={cellSize * 5} fill="white" stroke="#d1d5db" strokeWidth="2" rx="8"/>
        <rect x={cellSize * 0.5} y={cellSize * 9.5} width={cellSize * 5} height={cellSize * 5} fill="white" stroke="#d1d5db" strokeWidth="2" rx="8"/>
        <rect x={cellSize * 9.5} y={cellSize * 9.5} width={cellSize * 5} height={cellSize * 5} fill="white" stroke="#d1d5db" strokeWidth="2" rx="8"/>

        {/* Triangular paths - map original colors to display colors */}
        <path d={`M ${size/2},${size/2} L ${cellSize*6},${cellSize*6} L ${cellSize*6},${cellSize*9} Z`} fill={getFillColor('green')} />
        <path d={`M ${size/2},${size/2} L ${cellSize*6},${cellSize*6} L ${cellSize*9},${cellSize*6} Z`} fill={getFillColor('yellow')} />
        <path d={`M ${size/2},${size/2} L ${cellSize*9},${cellSize*9} L ${cellSize*6},${cellSize*9} Z`} fill={getFillColor('red')} />
        <path d={`M ${size/2},${size/2} L ${cellSize*9},${cellSize*9} L ${cellSize*9},${cellSize*6} Z`} fill={getFillColor('blue')} />

        {mainPathCoords.map((c) => {
          const isStar = SAFE_SQUARES.includes(c.index);
          const isStart = Object.values(START_POSITIONS).includes(c.index);
          let cellFill: string | undefined = undefined;
          let cellClassName = 'ludo-cell';
          let starFill: string | undefined = undefined;
          
          if (isStart) {
            const originalColor = PLAYER_COLORS.find(pc => START_POSITIONS[pc] === c.index)!;
            const displayColor = getDisplayColorForBoard(originalColor);
            cellFill = PLAYER_TAILWIND_COLORS[displayColor].hexHighlight;
            cellClassName = 'ludo-home-path';
          }
           if (isStar && !isStart) {
            const originalStarColor = STAR_COLORS[c.index];
            if (originalStarColor) {
              const displayStarColor = getDisplayColorForBoard(originalStarColor);
              starFill = PLAYER_TAILWIND_COLORS[displayStarColor].hexHighlight;
            }
          }

          return (
            <g key={`cell-${c.index}`} transform={`translate(${toPx(c.x)}, ${toPx(c.y)})`}>
              <rect 
                x={-cellSize/2} 
                y={-cellSize/2} 
                width={cellSize} 
                height={cellSize} 
                className={cellClassName}
                fill={cellFill}
              />
              {starFill && (
                <text dy=".3em" textAnchor="middle" fill={starFill} fontSize={cellSize * 0.6}>★</text>
              )}
            </g>
          );
        })}
        {homePathCoords.map((c) => {
          const displayColor = getDisplayColorForBoard(c.color);
          const fillColor = PLAYER_TAILWIND_COLORS[displayColor].hexHighlight;
          return (
           <g key={`home-${c.color}-${c.index}`} transform={`translate(${toPx(c.x)}, ${toPx(c.y)})`}>
              <rect 
                x={-cellSize/2} 
                y={-cellSize/2} 
                width={cellSize} 
                height={cellSize} 
                className="ludo-home-path"
                fill={fillColor}
              />
            </g>
          );
        })}
         {yardCoords.map((c) => (
           <g key={`yard-spot-${c.color}-${c.index}`} transform={`translate(${toPx(c.x)}, ${toPx(c.y)})`}>
             <circle r={cellSize * 0.45} className="yard-spot" />
           </g>
        ))}
      </>
    );
  };
  
  const renderTokens = () => {
    const tokensByPosition: Record<string, Token[]> = tokens.reduce((acc, token) => {
        const posKey = JSON.stringify(token.position);
        if (!acc[posKey]) acc[posKey] = [];
        acc[posKey].push(token);
        return acc;
    }, {} as Record<string, Token[]>);

    const tokensToRender = Object.values(tokensByPosition).flat().filter(token => {
        return !animation || token.id !== animation.tokenId;
    });

    return tokensToRender.map((token) => {
        const coords = getTokenPositionCoords(token);
        if (!coords) return null;

        const isMovable = legalMoves.some(m => m.tokenId === token.id);
        const group = tokensByPosition[JSON.stringify(token.position)];
        const stackIndex = group.findIndex(t => t.id === token.id);
        const stackOffset = cellSize * 0.15;
        const xOffset = stackIndex > 0 ? (stackIndex % 2 === 1 ? -stackOffset : stackOffset) : 0;
        const yOffset = stackIndex > 1 ? (stackIndex < 3 ? -stackOffset : stackOffset) : 0;
        const canClick = isMovable && isMyTurn;
        const displayColor = getDisplayColor(token.color);

        return (
            <g 
                key={token.id} 
                transform={`translate(${toPx(coords.x) + xOffset}, ${toPx(coords.y) + yOffset})`}
                onClick={() => canClick && onMoveToken(token.id)}
                style={{ cursor: canClick ? 'pointer' : 'default', transition: 'transform 0.2s ease-in-out' }}
            >
                <circle r={cellSize * 0.45} fill={`url(#grad-${displayColor})`} className="token" />
            </g>
        );
    });
  };

  const renderMovableIndicators = () => {
    if (turnState !== 'MOVING' || !isMyTurn) {
      return null;
    }

    const tokensByPosition: Record<string, Token[]> = tokens.reduce((acc, token) => {
        const posKey = JSON.stringify(token.position);
        if (!acc[posKey]) acc[posKey] = [];
        acc[posKey].push(token);
        return acc;
    }, {} as Record<string, Token[]>);

    return legalMoves.map((move) => {
      const token = tokens.find((t) => t.id === move.tokenId);
      if (!token) return null;

      const coords = getTokenPositionCoords(token);
      if (!coords) return null;

      const group = tokensByPosition[JSON.stringify(token.position)];
      const stackIndex = group.findIndex(t => t.id === token.id);
      const stackOffset = cellSize * 0.15;
      const xOffset = stackIndex > 0 ? (stackIndex % 2 === 1 ? -stackOffset : stackOffset) : 0;
      const yOffset = stackIndex > 1 ? (stackIndex < 3 ? -stackOffset : stackOffset) : 0;
      
      return (
        <g 
            key={`indicator-${move.tokenId}`} 
            transform={`translate(${toPx(coords.x) + xOffset}, ${toPx(coords.y) + yOffset})`}
            style={{ pointerEvents: 'none' }}
        >
          <circle className="movable-indicator" r={cellSize * 0.45} />
        </g>
      );
    });
  };
  
  const renderAnimatedToken = () => {
      if (!animation) return null;
      const coords = animation.path[animation.step];
      const { displayColor } = animation;

      if (!coords) return null;

      return (
         <g 
            transform={`translate(${toPx(coords.x)}, ${toPx(coords.y)})`}
            style={{ transition: 'transform 0.1s linear', pointerEvents: 'none' }}
        >
            <circle r={cellSize * 0.45} fill={`url(#grad-${displayColor})`} className="token" />
        </g>
      )
  }

  return (
    <div className="aspect-square w-full lg:w-auto lg:h-full max-w-full bg-gray-200 p-2 rounded-2xl shadow-2xl overflow-hidden">
        <svg viewBox={`0 0 ${size} ${size}`}>
            <defs>
              {PLAYER_COLORS.map(color => {
                const colors = PLAYER_TAILWIND_COLORS[color];
                return (
                  <radialGradient key={`grad-${color}`} id={`grad-${color}`} cx="30%" cy="30%" r="70%">
                    <stop offset="0%" style={{ stopColor: colors.hexHighlight, stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: colors.hex, stopOpacity: 1 }} />
                  </radialGradient>
                )
              })}
            </defs>
            {renderGridAndPaths()}
            {renderTokens()}
            {renderMovableIndicators()}
            {renderAnimatedToken()}
        </svg>
    </div>
  );
};

export default Board;
