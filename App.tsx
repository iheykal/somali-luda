

import React, { useState, useEffect } from 'react';
import Board from '@/components/Board';
import Dice from '@/components/Dice';
import GameSetup from '@/components/GameSetup';
import PlayerInfo from '@/components/PlayerInfo';
import GameOverModal from '@/components/GameOverModal';
import { useGameLogic } from '@/hooks/useGameLogic';
import AdminPanel from '@/components/admin/AdminPanel';
import Login from '@/components/auth/Login';
import Register from '@/components/auth/Register';
import Wallet from '@/components/Wallet';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import type { Player, PlayerColor, MultiplayerGame } from '@/types';

type View = 'setup' | 'game' | 'admin' | 'login' | 'register' | 'wallet';

interface MultiplayerConfig {
  gameId: string;
  localPlayerColor: PlayerColor;
  sessionId: string;
}

const AppContent: React.FC = () => {
  const [multiplayerConfig, setMultiplayerConfig] = useState<MultiplayerConfig | null>(null);
  // Force fresh build - countdown timer fix
  const { state, startGame, handleRollDice, handleMoveToken, handleAnimationComplete, isMyTurn, setState, diceRollCountdown, moveCountdown } = useGameLogic(multiplayerConfig || undefined);
  const { gameStarted, players, currentPlayerIndex, turnState, winners } = state;
  const { isAuthenticated, loading: authLoading, isAdmin, isSuperAdmin } = useAuth();
  const [view, setView] = useState<View>('login');

  // Effect to listen for multiplayer game state updates via WebSocket
  useEffect(() => {
    if (!multiplayerConfig) return;

    // Game state updates are handled in useGameLogic via socketService
    // This effect is kept for any additional state synchronization if needed
  }, [multiplayerConfig, setState]);


  const handleStartGame = (gamePlayers: Player[], mpConfig?: MultiplayerConfig) => {
    console.log('🎮 handleStartGame called:', { gamePlayers, mpConfig });
    if (mpConfig) {
      setMultiplayerConfig(mpConfig);
      // For multiplayer, initialize the game with the players
      // The game state will be synchronized via WebSocket
      startGame(gamePlayers);
    } else {
      // For local games
      startGame(gamePlayers);
    }
    setView('game');
    console.log('✅ View changed to game');
  };

  const handleRestart = () => {
    window.location.reload();
  };
  
  const handleEnterAdmin = () => setView('admin');
  const handleExitAdmin = () => setView('setup');
  const handleEnterWallet = () => setView('wallet');
  const handleExitWallet = () => setView('setup');
  const handleLoginSuccess = () => setView('setup');
  const handleRegisterSuccess = () => setView('setup');
  const handleSwitchToRegister = () => setView('register');
  const handleSwitchToLogin = () => setView('login');

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show login/register if not authenticated
  if (!isAuthenticated) {
    if (view === 'login') {
      return <Login onSuccess={handleLoginSuccess} onSwitchToRegister={handleSwitchToRegister} />;
    }
    if (view === 'register') {
      return <Register onSuccess={handleRegisterSuccess} onSwitchToLogin={handleSwitchToLogin} />;
    }
    // Default to login if not authenticated
    return <Login onSuccess={handleLoginSuccess} onSwitchToRegister={handleSwitchToRegister} />;
  }

  // Authenticated views
  if (view === 'setup') {
    return <GameSetup onStartGame={handleStartGame} onEnterAdmin={handleEnterAdmin} onEnterWallet={handleEnterWallet} />;
  }

  if (view === 'admin') {
    // Check if user has admin access
    if (!isAdmin && !isSuperAdmin) {
      // Redirect to setup if not admin
      return <GameSetup onStartGame={handleStartGame} onEnterAdmin={handleEnterAdmin} onEnterWallet={handleEnterWallet} />;
    }
    return <AdminPanel onExit={handleExitAdmin} />;
  }

  if (view === 'wallet') {
    return <Wallet onExit={handleExitWallet} />;
  }
  
  // --- Game View ---
  if (view === 'game' && gameStarted) {
    const currentPlayer = players[currentPlayerIndex];
    const player1 = players[0];
    const player2 = players[1];

    return (
      <div className="min-h-screen bg-slate-900 p-2 sm:p-4 flex flex-col lg:grid lg:h-screen lg:grid-cols-[auto_1fr_auto] lg:grid-rows-[auto_1fr_auto] lg:gap-4 items-center justify-center">
        {turnState === 'GAMEOVER' && <GameOverModal winners={winners} players={players} onRestart={handleRestart} gameState={state} />}
        
        <div className="w-full lg:h-full max-w-full my-4 lg:my-0 order-1 lg:order-none lg:row-start-2 lg:col-start-2 flex items-center justify-center">
          <Board 
            gameState={state} 
            onMoveToken={handleMoveToken} 
            onAnimationComplete={handleAnimationComplete}
            isMyTurn={isMyTurn}
            localPlayerColor={multiplayerConfig?.localPlayerColor}
          />
        </div>

        {player1 && (
            <div className="w-full lg:w-auto order-2 lg:order-none lg:row-start-1 lg:col-start-1 flex justify-center lg:justify-start lg:items-start">
              <PlayerInfo
                player={player1}
                tokens={state.tokens}
                isCurrentPlayer={currentPlayer.color === player1.color}
                winners={winners}
                message={currentPlayer.color === player1.color ? state.message : undefined}
              />
            </div>
        )}
        
        {player2 && (
            <div className="w-full lg:w-auto order-2 lg:order-none lg:row-start-3 lg:col-start-3 flex justify-center lg:justify-end lg:items-end">
              <PlayerInfo
                player={player2}
                tokens={state.tokens}
                isCurrentPlayer={currentPlayer.color === player2.color}
                winners={winners}
                message={currentPlayer.color === player2.color ? state.message : undefined}
              />
            </div>
        )}

        <div className="my-4 lg:my-0 order-3 lg:order-none lg:row-start-1 lg:col-start-3 flex justify-center lg:justify-end lg:items-start">
          <Dice 
            value={state.diceValue} 
            onRoll={handleRollDice} 
            isMyTurn={isMyTurn && turnState === 'ROLLING'}
            playerColor={currentPlayer.color}
            localPlayerColor={multiplayerConfig?.localPlayerColor}
            countdown={turnState === 'ROLLING' ? diceRollCountdown : null}
            turnState={turnState}
          />
        </div>
        
        {/* Move countdown timer display */}
        {isMyTurn && turnState === 'MOVING' && moveCountdown !== null && moveCountdown > 0 && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-slate-800 border-2 border-amber-500 rounded-lg px-6 py-3 shadow-2xl">
            <p className="text-amber-400 text-2xl font-bold">
              {moveCountdown}s
            </p>
          </div>
        )}
      </div>
    );
  }

  // Fallback
  return <GameSetup onStartGame={handleStartGame} onEnterAdmin={handleEnterAdmin} onEnterWallet={handleEnterWallet} />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
