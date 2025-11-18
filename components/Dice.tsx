import React, { useState, useEffect, useMemo } from 'react';
import type { PlayerColor } from '../types';
import { PLAYER_TAILWIND_COLORS } from '../lib/boardLayout';
import { audioService } from '../services/audioService';

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
      // Lock the color when pawn movement animation starts
      let currentColor: PlayerColor;
      if (localPlayerColor) {
        currentColor = playerColor === localPlayerColor ? 'blue' : 'red';
      } else {
        currentColor = isMyTurn ? 'blue' : 'red';
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
  
  // Determine display color: blue for local player, red for opponent
  // Use locked color during dice rolling or pawn movement animation
  const displayColor = useMemo((): PlayerColor => {
    // If we have a locked color (during dice roll or pawn movement), use it
    if (lockedColor) {
      console.log('🎲 [DISPLAY COLOR] Using locked color:', lockedColor);
      return lockedColor;
    }
    
    // Calculate new color based on current state
    let calculatedColor: PlayerColor;
    if (localPlayerColor) {
      // Multiplayer: blue for local player, red for opponent
      calculatedColor = playerColor === localPlayerColor ? 'blue' : 'red';
    } else {
      // Local game: blue when it's the player's turn, red for opponent/AI
      calculatedColor = isMyTurn ? 'blue' : 'red';
    }
    console.log('🎲 [DISPLAY COLOR] Calculated color:', calculatedColor, {
      playerColor,
      localPlayerColor,
      isMyTurn,
      lockedColor
    });
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

  useEffect(() => {
    console.log('🎲 [PROPS CHANGE] isMyTurn changed:', isMyTurn);
  }, [isMyTurn]);
  
  useEffect(() => {
    console.log('🎲 [PROPS CHANGE] playerColor changed:', playerColor);
  }, [playerColor]);
  
  useEffect(() => {
    console.log('🎲 [PROPS CHANGE] value prop changed:', value);
  }, [value]);
  
  useEffect(() => {
    console.log('🎲 [STATE CHANGE] cubeClass changed:', cubeClass);
  }, [cubeClass]);
  
  useEffect(() => {
    console.log('🎲 [STATE CHANGE] isAnimating changed:', isAnimating);
  }, [isAnimating]);
  
  useEffect(() => {
    console.log('🎲 [STATE CHANGE] lockedColor changed:', lockedColor);
  }, [lockedColor]);

  // Capture isMyTurn at the moment value changes to lock the color
  const isMyTurnRef = React.useRef(isMyTurn);
  
  // Update ref when isMyTurn changes, but don't trigger effects
  useEffect(() => {
    isMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

  useEffect(() => {
    console.log('🎲 [DICE VALUE EFFECT] value changed:', {
      value,
      currentCubeClass: cubeClass,
      isAnimating,
      lockedColor,
      playerColor,
      localPlayerColor,
      isMyTurn,
      isMyTurnRefValue: isMyTurnRef.current
    });
    
    if (value !== null) {
      // Lock the color immediately when dice starts rolling
      // Use the isMyTurn value at the moment value changed (from ref)
      let currentColor: PlayerColor;
      if (localPlayerColor) {
        currentColor = playerColor === localPlayerColor ? 'blue' : 'red';
      } else {
        // Use the captured value of isMyTurn when the roll started
        currentColor = isMyTurnRef.current ? 'blue' : 'red';
      }
      console.log('🎲 [DICE VALUE EFFECT] Setting locked color:', currentColor, 'based on isMyTurn:', isMyTurnRef.current);
      setLockedColor(currentColor);
      
      console.log('🎲 [DICE VALUE EFFECT] Setting isAnimating to true');
      setIsAnimating(true);
      
      // Play dice roll sound after a small delay to ensure user interaction is registered
      const soundTimer = setTimeout(() => {
        audioService.play('diceRoll');
      }, 100);
      
      // Set the target face immediately so the dice knows where to end up
      const newCubeClass = `show-${value}`;
      console.log('🎲 [DICE VALUE EFFECT] Setting cubeClass to:', newCubeClass);
      setCubeClass(newCubeClass);
      
      // After animation completes, ensure the dice stays on the correct face
      const timer = setTimeout(() => {
        console.log('🎲 [DICE VALUE EFFECT] Animation complete, setting isAnimating to false');
        setIsAnimating(false);
        // Keep the show-{value} class to maintain the position
        console.log('🎲 [DICE VALUE EFFECT] Keeping cubeClass as:', newCubeClass);
        setCubeClass(newCubeClass);
      }, 1000); // must match animation duration in index.html
      
      return () => {
        console.log('🎲 [DICE VALUE EFFECT] Cleanup - clearing timers');
        clearTimeout(timer);
        clearTimeout(soundTimer);
      };
    } else {
      // When value is null, don't reset cubeClass - keep showing the last rolled value
      // Only reset isAnimating and lockedColor
      console.log('🎲 [DICE VALUE EFFECT] Value is null, keeping cubeClass as:', cubeClass, '- only resetting animation state');
      setIsAnimating(false);
      // Don't reset cubeClass - keep the last value visible
      // setCubeClass('show-1'); // REMOVED - keep last value
      // Don't reset lockedColor immediately - let it unlock when animations complete
      // setLockedColor(null); // REMOVED - let unlock effect handle this
    }
  }, [value, localPlayerColor, playerColor]);

  const handleClick = () => {
    console.log('🎲 Dice clicked, isMyTurn:', isMyTurn);
    if (isMyTurn) {
        // Play click sound first to unlock audio if needed
        audioService.play('click');
        onRoll();
    } else {
        console.log('❌ Cannot roll - not my turn');
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
  
  // Debug log for animation rotation
  if (value !== null) {
    console.log('🎲 [ANIMATION ROTATION]', {
      value,
      animationEndRotation,
      cubeClass,
      actualCubeClass,
      isAnimating
    });
  }
  
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
