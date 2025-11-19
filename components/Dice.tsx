import React, { useState, useEffect, useMemo } from 'react';
import type { PlayerColor } from '../types';
import { PLAYER_TAILWIND_COLORS } from '../lib/boardLayout';
import { audioService } from '../services/audioService.ts';

interface DiceProps {
  value: number | null;
  onRoll: () => void;
  isMyTurn: boolean;
  playerColor?: PlayerColor;
  localPlayerColor?: PlayerColor;
  countdown?: number | null;
  turnState?: string;
}

const DiceFace: React.FC<{ value: number; textColor?: string }> = ({ value, textColor = '#ffffff' }) => {
    return (
        <span className="dice-number" style={{ color: textColor }}>{value}</span>
    );
};

const Dice: React.FC<DiceProps> = ({ value, onRoll, isMyTurn, playerColor = 'red', localPlayerColor, countdown = null, turnState }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [cubeClass, setCubeClass] = useState('show-1');
  const [lockedColor, setLockedColor] = useState<PlayerColor | null>(null);
  
  // Lock color when pawn movement starts (if not already locked)
  useEffect(() => {
    if (turnState === 'ANIMATING' && !lockedColor) {
      // Lock the color when pawn movement animation starts - match pawn colors
      let currentColor: PlayerColor;
      if (localPlayerColor) {
        currentColor = playerColor === localPlayerColor ? 'red' : 'yellow';
      } else {
        currentColor = isMyTurn ? 'red' : 'yellow';
      }
      setLockedColor(currentColor);
    }
  }, [turnState, lockedColor, localPlayerColor, playerColor, isMyTurn]);
  
  // Unlock color when both dice roll and pawn movement animations complete
  useEffect(() => {
    if (!isAnimating && turnState !== 'ANIMATING' && lockedColor) {
      // Both animations are complete, unlock the color
      setLockedColor(null);
    }
  }, [isAnimating, turnState, lockedColor]);
  
  // Determine display color: match pawn colors (red for local player, yellow for opponent)
  // Use locked color during dice rolling or pawn movement animation
  const displayColor = useMemo((): PlayerColor => {
    // If we have a locked color (during dice roll or pawn movement), use it
    if (lockedColor) {
      return lockedColor;
    }

    // Calculate new color based on current state - match the perspective shift logic
    let calculatedColor: PlayerColor;
    if (localPlayerColor) {
      // Multiplayer: red for local player (matches their red pawns), yellow for opponent
      calculatedColor = playerColor === localPlayerColor ? 'red' : 'yellow';
    } else {
      // Local game: red when it's the player's turn, yellow for opponent/AI
      calculatedColor = isMyTurn ? 'red' : 'yellow';
    }
    return calculatedColor;
  }, [lockedColor, localPlayerColor, playerColor, isMyTurn]);
  const colorConfig = PLAYER_TAILWIND_COLORS[displayColor];
  // Convert hex to rgba for drop-shadow filter
  const hexToRgba = (hex: string, alpha: number = 0.7) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const glowColor = hexToRgba(colorConfig.hex);
  // Use white text for both blue and red dice
  const textColor = '#ffffff';

  // Removed excessive debug logging useEffects for performance

  // Capture isMyTurn at the moment value changes to lock the color
  const isMyTurnRef = React.useRef(isMyTurn);
  
  // Update ref when isMyTurn changes, but don't trigger effects
  useEffect(() => {
    isMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

  useEffect(() => {
    if (value !== null) {
      // Lock the color immediately when dice starts rolling
      // Use the isMyTurn value at the moment value changed (from ref)
      let currentColor: PlayerColor;
      if (localPlayerColor) {
        currentColor = playerColor === localPlayerColor ? 'red' : 'yellow';
      } else {
        // Use the captured value of isMyTurn when the roll started
        currentColor = isMyTurnRef.current ? 'red' : 'yellow';
      }
      setLockedColor(currentColor);
      setIsAnimating(true);
      
      // Play dice roll sound after a small delay to ensure user interaction is registered
      const soundTimer = setTimeout(() => {
        audioService.play('diceRoll');
      }, 100);
      
      // Set the target face immediately so the dice knows where to end up
      const newCubeClass = `show-${value}`;
      setCubeClass(newCubeClass);
      
      // After animation completes, ensure the dice stays on the correct face
      const timer = setTimeout(() => {
        setIsAnimating(false);
        // Keep the show-{value} class to maintain the position
        setCubeClass(newCubeClass);
      }, 1000); // must match animation duration in index.html
      
      return () => {
        clearTimeout(timer);
        clearTimeout(soundTimer);
      };
    } else {
      // When value is null, don't reset cubeClass - keep showing the last rolled value
      // Only reset isAnimating and lockedColor
      setIsAnimating(false);
      // Don't reset cubeClass - keep the last value visible
      // setCubeClass('show-1'); // REMOVED - keep last value
      // Don't reset lockedColor immediately - let it unlock when animations complete
      // setLockedColor(null); // REMOVED - let unlock effect handle this
    }
  }, [value, localPlayerColor, playerColor]);

  const handleClick = () => {
    if (isMyTurn) {
        // Play click sound first to unlock audio if needed
        audioService.play('click');
        onRoll();
    }
  }

  // Calculate the animation end rotation to match the target face
  // The animation starts at rotateX(0) rotateY(0) and ends at rotateX(720) rotateY(1080)
  // We need to adjust the end rotation so it lands on the target face
  const getAnimationEndRotation = (val: number): { x: number; y: number } => {
    switch (val) {
      case 1: return { x: 720, y: 1080 }; // Ends at 0deg, 0deg (mod 360)
      case 2: return { x: 720, y: 900 };  // Ends at 0deg, -180deg (mod 360)
      case 3: return { x: 810, y: 1080 }; // Ends at 90deg, 0deg (mod 360)
      case 4: return { x: 630, y: 1080 }; // Ends at -90deg, 0deg (mod 360)
      case 5: return { x: 720, y: 1170 }; // Ends at 0deg, 90deg (mod 360)
      case 6: return { x: 720, y: 990 };   // Ends at 0deg, -90deg (mod 360)
      default: return { x: 720, y: 1080 };
    }
  };

  const clickableClass = isMyTurn ? 'dice-clickable' : '';
  
  // Determine the actual cube class to use - prefer value if available, otherwise use cubeClass
  const actualCubeClass = value !== null ? `show-${value}` : cubeClass;
  
  const animationEndRotation = value !== null ? getAnimationEndRotation(value) : { x: 720, y: 1080 };
  
  const diceStyle = {
    '--dice-bg-color': colorConfig.hex,
    '--dice-border-color': colorConfig.hex,
    '--dice-glow-color': glowColor,
    '--target-rotate-x': `${animationEndRotation.x}deg`,
    '--target-rotate-y': `${animationEndRotation.y}deg`,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col items-center space-y-2">
        <div 
            className={`scene ${clickableClass}`}
            onClick={handleClick}
            role="button"
            aria-label="Roll dice"
            aria-disabled={!isMyTurn}
            style={diceStyle}
        >
            <div 
              className={`cube ${isAnimating ? 'is-rolling' : ''} ${actualCubeClass}`}
              style={isAnimating ? {
                '--target-rotate-x': `${animationEndRotation.x}deg`,
                '--target-rotate-y': `${animationEndRotation.y}deg`,
              } as React.CSSProperties : undefined}
            >
                <div className="face face-1" style={{ background: colorConfig.hex, borderColor: colorConfig.hex }}><DiceFace value={1} textColor={textColor} /></div>
                <div className="face face-2" style={{ background: colorConfig.hex, borderColor: colorConfig.hex }}><DiceFace value={2} textColor={textColor} /></div>
                <div className="face face-3" style={{ background: colorConfig.hex, borderColor: colorConfig.hex }}><DiceFace value={3} textColor={textColor} /></div>
                <div className="face face-4" style={{ background: colorConfig.hex, borderColor: colorConfig.hex }}><DiceFace value={4} textColor={textColor} /></div>
                <div className="face face-5" style={{ background: colorConfig.hex, borderColor: colorConfig.hex }}><DiceFace value={5} textColor={textColor} /></div>
                <div className="face face-6" style={{ background: colorConfig.hex, borderColor: colorConfig.hex }}><DiceFace value={6} textColor={textColor} /></div>
            </div>
        </div>
      <div className="text-center h-12 flex flex-col items-center justify-center">
          {isMyTurn && countdown !== null && countdown > 0 ? (
              <p className="text-amber-400 text-lg font-bold">
                  {countdown}s
              </p>
          ) : isMyTurn ? (
              <p className="text-slate-400 text-center font-semibold">
                  Click the dice to roll
              </p>
          ) : null}
      </div>
    </div>
  );
};

export default Dice;
