

import React, { useState, useEffect, useRef } from 'react';
import Board from '@/components/Board';
import Dice from '@/components/Dice';
import GameSetup from '@/components/GameSetup';
import PlayerInfo from '@/components/PlayerInfo';
import GameOverModal from '@/components/GameOverModal';
import { useGameLogic } from '@/hooks/useGameLogic';
import AdminPanel from '@/components/admin/AdminPanel';
import Login from '@/components/auth/Login';
import Register from '@/components/auth/Register';
import ResetPassword from '@/components/auth/ResetPassword';
import Wallet from '@/components/Wallet';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { socketService } from '@/services/socketService';
import { clearActiveGame } from '@/components/MultiplayerLobby';
import type { Player, PlayerColor, MultiplayerGame } from '@/types';

type View = 'setup' | 'game' | 'admin' | 'login' | 'register' | 'resetPassword' | 'wallet';

interface MultiplayerConfig {
  gameId: string;
  localPlayerColor: PlayerColor;
  sessionId: string;
}

const AppContent: React.FC = () => {
  const [multiplayerConfig, setMultiplayerConfig] = useState<MultiplayerConfig | null>(null);
  const [playerConnectionStatus, setPlayerConnectionStatus] = useState<{
    player1Connected: boolean;
    player2Connected: boolean;
    player1BotMode: boolean;
    player2BotMode: boolean;
    player1Color?: string;
    player2Color?: string;
  }>({
    player1Connected: true,
    player2Connected: true,
    player1BotMode: false,
    player2BotMode: false
  });
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  // Force fresh build - countdown timer fix
  const { state, startGame, handleRollDice, handleMoveToken, handleAnimationComplete, isMyTurn, setState, diceRollCountdown, moveCountdown } = useGameLogic(multiplayerConfig || undefined);
  const { gameStarted, players, currentPlayerIndex, turnState, winners } = state;
  const { isAuthenticated, loading: authLoading, isAdmin, isSuperAdmin, user } = useAuth();
  const [view, setView] = useState<View>('login');
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameIdRef = useRef<string | null>(null);

  // Store gameId when multiplayer config is set
  useEffect(() => {
    if (multiplayerConfig) {
      gameIdRef.current = multiplayerConfig.gameId;
    }
  }, [multiplayerConfig]);

  // Show notification helper
  const showNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 5000) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification({ message, type });
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, duration);
  };

  // Effect to listen for multiplayer game state updates via WebSocket
  useEffect(() => {
    if (!multiplayerConfig) return;

    // Game state updates are handled in useGameLogic via socketService
    // This effect is kept for any additional state synchronization if needed
  }, [multiplayerConfig, setState]);

  // Clear active game when game ends
  useEffect(() => {
    if (state.turnState === 'GAMEOVER' && multiplayerConfig) {
      // Game has ended, clear active game from storage
      clearActiveGame();
      console.log('🗑️ Cleared active game - game ended');
    }
  }, [state.turnState, multiplayerConfig]);

  // Handle disconnect/reconnect events
  useEffect(() => {
    if (!multiplayerConfig || !user?._id) return;

    // Listen for player disconnection
    const handlePlayerDisconnected = (data: any) => {
      console.log('Player disconnected:', data);
      if (data.botMode) {
        showNotification('⚠️ Opponent disconnected. 🤖 Bot is now playing for them until they return.', 'warning', 10000);
      } else {
        showNotification('⚠️ Opponent disconnected from the game', 'warning', 5000);
      }
    };

    // Listen for player reconnection
    const handlePlayerReconnected = (data: any) => {
      console.log('Player reconnected:', data);
      // Only show notification if it's the opponent who reconnected, not ourselves
      // Check if the reconnected player's color matches our local player color
      if (multiplayerConfig && data.color && data.color !== multiplayerConfig.localPlayerColor) {
        showNotification('🎉 Opponent reconnected! Human player is back in control.', 'success', 5000);
      }
    };

    // Listen for player status updates
    const handlePlayerStatus = (data: any) => {
      console.log('Player status update:', data);
      setPlayerConnectionStatus(prev => ({
        player1Connected: data.player1Connected !== undefined ? data.player1Connected : prev.player1Connected,
        player2Connected: data.player2Connected !== undefined ? data.player2Connected : prev.player2Connected,
        player1BotMode: data.player1BotMode !== undefined ? data.player1BotMode : prev.player1BotMode,
        player2BotMode: data.player2BotMode !== undefined ? data.player2BotMode : prev.player2BotMode,
        player1Color: data.player1Color || prev.player1Color,
        player2Color: data.player2Color || prev.player2Color
      }));
    };

    // Listen for rejoin errors
    const handleRejoinError = (data: any) => {
      console.error('Rejoin error:', data);
      showNotification(`Cannot rejoin game: ${data.message}`, 'error');
    };

    // Listen for connection changes
    const handleConnectionChange = (connected: boolean) => {
      setIsSocketConnected(connected);
      if (connected) {
        console.log('Socket reconnected, attempting to rejoin game...');
        showNotification('🔌 Reconnected to server! Attempting to rejoin game...', 'success', 3000);
        // Attempt to rejoin game when reconnected
        if (user._id && gameIdRef.current) {
          setTimeout(() => {
            socketService.rejoinGame(user._id, gameIdRef.current || undefined);
          }, 500);
        }
      } else {
        showNotification('❌ Connection lost. 🤖 Bot will play for you until reconnection.', 'warning', 8000);
      }
    };

    socketService.onPlayerDisconnected(handlePlayerDisconnected);
    socketService.onPlayerReconnected(handlePlayerReconnected);
    socketService.onPlayerStatus(handlePlayerStatus);
    socketService.onRejoinError(handleRejoinError);
    const cleanupConnection = socketService.onConnectionChange(handleConnectionChange);

    return () => {
      socketService.off('player-disconnected');
      socketService.off('player-reconnected');
      socketService.off('player-status');
      socketService.off('rejoin-error');
      if (cleanupConnection) cleanupConnection();
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [multiplayerConfig, user?._id]);


  const handleStartGame = (gamePlayers: Player[], mpConfig?: MultiplayerConfig, betAmount?: number) => {
    console.log('🎮 handleStartGame called:', { gamePlayers, mpConfig, betAmount });
    if (mpConfig) {
      setMultiplayerConfig(mpConfig);
      // For multiplayer, initialize the game with the players and bet amount
      // The game state will be synchronized via WebSocket
      startGame(gamePlayers, undefined, betAmount);
    } else {
      // For local games
      startGame(gamePlayers);
    }
    setView('game');
    console.log('✅ View changed to game');
  };

  const handleRestart = () => {
    // Clear active game from storage when restarting
    try {
      localStorage.removeItem('ludoActiveGame');
      console.log('🗑️ Cleared active game on restart');
    } catch (error) {
      console.error('Failed to clear active game:', error);
    }
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
  const handleSwitchToResetPassword = () => setView('resetPassword');
  const handleResetPasswordSuccess = () => setView('login');

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show login/register/reset password if not authenticated
  if (!isAuthenticated) {
    if (view === 'login') {
      return <Login onSuccess={handleLoginSuccess} onSwitchToRegister={handleSwitchToRegister} onSwitchToResetPassword={handleSwitchToResetPassword} />;
    }
    if (view === 'register') {
      return <Register onSuccess={handleRegisterSuccess} onSwitchToLogin={handleSwitchToLogin} />;
    }
    if (view === 'resetPassword') {
      return <ResetPassword onSuccess={handleResetPasswordSuccess} onSwitchToLogin={handleSwitchToLogin} />;
    }
    // Default to login if not authenticated
    return <Login onSuccess={handleLoginSuccess} onSwitchToRegister={handleSwitchToRegister} onSwitchToResetPassword={handleSwitchToResetPassword} />;
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
    const handleRejoinFromWallet = (gameId: string, playerColor: PlayerColor, betAmount: number) => {
      // Close wallet and navigate back to setup
      // The game info is saved in localStorage, so when user clicks multiplayer,
      // MultiplayerLobby will detect it and auto-rejoin
      setView('setup');
    };
    
    return <Wallet onExit={handleExitWallet} onRejoinGame={handleRejoinFromWallet} />;
  }
  
  // --- Game View ---
  if (view === 'game' && gameStarted) {
    const currentPlayer = players[currentPlayerIndex];
    const player1 = players[0];
    const player2 = players[1];

    // Determine disconnection status for each player
    const getPlayerConnectionStatus = (player: Player) => {
      if (!multiplayerConfig) return { isDisconnected: false, isBotPlaying: false };

      // Use the color information to determine which server player this is
      let isDisconnected = false;
      let isBotPlaying = false;

      if (player.color === playerConnectionStatus.player1Color) {
        // This player is server player1
        isDisconnected = !playerConnectionStatus.player1Connected;
        isBotPlaying = playerConnectionStatus.player1BotMode;
      } else if (player.color === playerConnectionStatus.player2Color) {
        // This player is server player2
        isDisconnected = !playerConnectionStatus.player2Connected;
        isBotPlaying = playerConnectionStatus.player2BotMode;
      } else {
        // Fallback: if colors don't match, assume based on local player color
        const isLocalPlayer = player.color === multiplayerConfig.localPlayerColor;
        isDisconnected = isLocalPlayer ? !playerConnectionStatus.player1Connected : !playerConnectionStatus.player2Connected;
        isBotPlaying = isLocalPlayer ? playerConnectionStatus.player1BotMode : playerConnectionStatus.player2BotMode;
      }

      return { isDisconnected, isBotPlaying };
    };

    const player1Status = getPlayerConnectionStatus(player1);
    const player2Status = getPlayerConnectionStatus(player2);

    return (
      <div className="min-h-screen bg-slate-900 p-2 sm:p-4 flex flex-col lg:grid lg:h-screen lg:grid-cols-[auto_1fr_auto] lg:grid-rows-[auto_1fr_auto] lg:gap-4 items-center justify-center">
        {/* Connection Status Indicator */}
        {multiplayerConfig && (
          <div className="fixed top-4 right-4 z-50">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg ${
              isSocketConnected ? 'bg-green-600' : 'bg-red-600'
            } text-white text-sm font-medium`}>
              <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-300' : 'bg-red-300'}`}></div>
              <span>{isSocketConnected ? '🟢 Online' : '🔴 Offline'}</span>
            </div>
          </div>
        )}

        {turnState === 'GAMEOVER' && <GameOverModal winners={winners} players={players} onRestart={handleRestart} gameState={state} />}
        
        {/* Notification banner */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-2xl transition-all duration-300 ${
            notification.type === 'error' ? 'bg-red-600' :
            notification.type === 'warning' ? 'bg-yellow-600' :
            notification.type === 'success' ? 'bg-green-600' :
            'bg-blue-600'
          } text-white font-semibold`}>
            {notification.message}
          </div>
        )}
        
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
            <div className="w-full lg:w-auto order-2 lg:order-none lg:row-start-1 lg:col-start-1 flex justify-center lg:justify-start lg:items-start px-2 sm:px-0">
              <PlayerInfo
                player={player1}
                tokens={state.tokens}
                isCurrentPlayer={currentPlayer.color === player1.color}
                winners={winners}
                message={currentPlayer.color === player1.color ? state.message : undefined}
                gameState={state}
                isDisconnected={player1Status.isDisconnected}
                isBotPlaying={player1Status.isBotPlaying}
              />
            </div>
        )}

        {player2 && (
            <div className="w-full lg:w-auto order-2 lg:order-none lg:row-start-3 lg:col-start-3 flex justify-center lg:justify-end lg:items-end px-2 sm:px-0">
              <PlayerInfo
                player={player2}
                tokens={state.tokens}
                isCurrentPlayer={currentPlayer.color === player2.color}
                winners={winners}
                message={currentPlayer.color === player2.color ? state.message : undefined}
                gameState={state}
                isDisconnected={player2Status.isDisconnected}
                isBotPlaying={player2Status.isBotPlaying}
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
