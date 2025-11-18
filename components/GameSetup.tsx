
import React, { useState, useEffect, useCallback } from 'react';
import type { Player, PlayerColor } from '../types';
import { PLAYER_TAILWIND_COLORS } from '../lib/boardLayout';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socketService';

interface GameSetupProps {
  onStartGame: (players: Player[], config?: { gameId: string, localPlayerColor: PlayerColor, sessionId: string }) => void;
  onEnterAdmin: () => void;
  onEnterWallet: () => void;
}

const ACTIVE_PLAYER_COLORS: PlayerColor[] = ['red', 'yellow'];

const getSessionId = () => {
  let id = sessionStorage.getItem('ludoSessionId');
  if (!id) {
    id = Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('ludoSessionId', id);
  }
  return id;
};

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame, onEnterAdmin, onEnterWallet }) => {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const [mode, setMode] = useState<'choice' | 'local_setup' | 'multiplayer_lobby'>('choice');
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [selectedBetAmount, setSelectedBetAmount] = useState<number | null>(null);
  const [aiPlayers, setAiPlayers] = useState<Record<PlayerColor, boolean>>({
    red: false,
    green: true,
    yellow: true,
    blue: true,
  });

  const handleStart = () => {
    const players: Player[] = ACTIVE_PLAYER_COLORS.map(color => ({
      color,
      isAI: aiPlayers[color],
    }));
    onStartGame(players);
  };

  const handleAiToggle = (color: PlayerColor) => {
    setAiPlayers(prev => ({ ...prev, [color]: !prev[color] }));
  };

  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (isSearching) {
        console.log('🧹 Cleaning up search on unmount');
        socketService.cancelSearch();
      }
      // Clean up all listeners
      socketService.off('searching');
      socketService.off('match-found');
      socketService.off('search-error');
      socketService.off('search-cancelled');
    };
  }, [isSearching]);

  const handleStartMultiplayer = () => {
    if (!user) {
      alert('Please log in to play multiplayer');
      return;
    }
    // Show bet selection screen first
    setMode('multiplayer_lobby');
    setSelectedBetAmount(null);
  };

  const handleBetSelection = (amount: number) => {
    setSelectedBetAmount(amount);
  };

  const handleStartSearch = useCallback(() => {
    if (!user) {
      alert('Please log in to play multiplayer');
      return;
    }

    if (selectedBetAmount === null) {
      alert('Please select a bet amount first');
      return;
    }

    const playerName = user.username || user.phone || 'Player';
    const sessionId = getSessionId();

    // Connect to socket first
    socketService.connect();
    setIsSearching(true);
    setSearchMessage('Connecting to server...');

    // Wait a bit for connection to be established before setting up listeners
    const setupListeners = () => {
      console.log('🔧 Setting up event listeners...');
      
      // Clean up any existing listeners first
      socketService.off('searching');
      socketService.off('match-found');
      socketService.off('search-error');
      socketService.off('search-cancelled');

      // Set up listeners
      socketService.onSearching(({ message }) => {
        console.log('🔍 Searching:', message);
        setSearchMessage(message);
      });

      socketService.onMatchFound(({ gameId, playerColor, opponentName }) => {
        console.log('✅ Match found callback triggered!', { gameId, playerColor, opponentName });
        setIsSearching(false);
        setSearchMessage('');
        
        // Clean up listeners
        socketService.off('searching');
        socketService.off('match-found');
        socketService.off('search-error');
        socketService.off('search-cancelled');
        
        // Get local player name
        const localPlayerName = playerName;
        
        // Create players array - ALWAYS in the same order (red first, then yellow)
        const players: Player[] = [
          { 
            color: 'red' as PlayerColor, 
            isAI: false,
            name: playerColor === 'red' ? localPlayerName : opponentName
          },
          { 
            color: 'yellow' as PlayerColor, 
            isAI: false,
            name: playerColor === 'yellow' ? localPlayerName : opponentName
          }
        ];
        
        console.log('👥 Players array created:', players.map(p => `${p.color}: ${p.name || 'Unknown'}`), 'My color:', playerColor);
        
        // Get socket ID
        const finalSocketId = socketService.getSocketId() || sessionId;
        console.log('🎮 Starting game with:', { gameId, playerColor, sessionId: finalSocketId });
        
        // Start the game
        try {
          onStartGame(players, {
            gameId,
            localPlayerColor: playerColor as PlayerColor,
            sessionId: finalSocketId
          });
          console.log('✅ onStartGame called successfully');
        } catch (error) {
          console.error('❌ Error calling onStartGame:', error);
        }
      });

      socketService.onSearchError(({ message }) => {
        console.error('❌ Search error:', message);
        setIsSearching(false);
        setSearchMessage('');
        alert(message);
        socketService.off('search-error');
      });

      console.log('✅ Event listeners set up');
    };

    // If already connected, set up listeners immediately
    if (socketService.isConnected()) {
      setupListeners();
      // Start searching with bet amount
      socketService.searchMatch(playerName, selectedBetAmount || 0.5, user._id);
    } else {
      // Wait for connection, then set up listeners and search
      const checkConnection = setInterval(() => {
        if (socketService.isConnected()) {
          clearInterval(checkConnection);
          setupListeners();
          // Start searching after listeners are set up
          setTimeout(() => {
            socketService.searchMatch(playerName, selectedBetAmount || 0.5, user._id);
          }, 100);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkConnection);
        if (!socketService.isConnected()) {
          alert('Failed to connect to server. Please try again.');
          setIsSearching(false);
        }
      }, 5000);
    }
  }, [user, selectedBetAmount, onStartGame]);

  const handleCancelSearch = () => {
    socketService.cancelSearch();
    setIsSearching(false);
    setSearchMessage('');
    socketService.off('searching');
    socketService.off('match-found');
    socketService.off('search-error');
    socketService.onSearchCancelled(() => {
      socketService.off('search-cancelled');
    });
    // Go back to bet selection lobby
    setMode('multiplayer_lobby');
  };
  
  if (mode === 'local_setup') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-800 p-4">
        <div className="bg-slate-700 p-8 rounded-xl shadow-2xl w-full max-w-md">
          <div className="mb-6 text-center">
            <h2 className="block text-2xl font-medium mb-2 text-slate-200">Local Game Setup</h2>
            <p className="text-slate-400">Configure a 1 vs 1 match against a human or AI opponent.</p>
          </div>
          <div className="mb-8">
            <label className="block text-lg font-medium mb-2 text-slate-300">Player Setup</label>
            <div className="space-y-3">
              {ACTIVE_PLAYER_COLORS.map(color => (
                <div key={color} className={`flex items-center justify-between p-3 rounded-lg ${PLAYER_TAILWIND_COLORS[color].bg.replace(/-[0-9]+/, '-800')}`}>
                  <span className={`font-bold text-lg capitalize ${PLAYER_TAILWIND_COLORS[color].text.replace(/-[0-9]+/, '-300')}`}>{color}</span>
                  <div className="flex items-center space-x-2">
                    <span>{aiPlayers[color] ? '🤖 AI' : '🧑 Human'}</span>
                    <button onClick={() => handleAiToggle(color)} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded-md text-sm">
                      Toggle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleStart}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold text-2xl py-4 rounded-lg shadow-xl transition transform hover:scale-105"
          >
            Start Game
          </button>
          <div className="mt-6 text-center">
            <button
              onClick={() => setMode('choice')}
              className="text-slate-400 hover:text-white"
            >
              &larr; Back to Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show multiplayer lobby with bet selection
  if (mode === 'multiplayer_lobby' && !isSearching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-800 p-4">
        <div className="bg-slate-700 p-8 rounded-xl shadow-2xl w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-white">Find an Opponent</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-slate-300 mb-3">
                Select Bet Amount *
              </label>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[0.5, 1, 2].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleBetSelection(amount);
                    }}
                    disabled={isSearching}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedBetAmount === amount
                        ? 'border-cyan-500 bg-cyan-600 text-white font-bold scale-105 shadow-lg'
                        : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-cyan-400 hover:bg-slate-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <div className="text-center p-3 bg-slate-800 rounded-lg border border-slate-600">
                <p className="text-slate-400 text-sm">Selected Bet Amount</p>
                <p className="text-cyan-400 text-2xl font-bold">
                  {selectedBetAmount !== null ? `$${selectedBetAmount.toFixed(2)}` : 'Not Selected'}
                </p>
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStartSearch();
              }}
              disabled={isSearching || selectedBetAmount === null}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold text-xl py-4 rounded-lg shadow-xl transition transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>
                {selectedBetAmount !== null 
                  ? `Find Match ($${selectedBetAmount.toFixed(2)} bet)`
                  : 'Select Bet Amount First'
                }
              </span>
            </button>

            <div className="text-center border-t border-slate-600 pt-4">
              <button
                onClick={() => {
                  setMode('choice');
                  setSelectedBetAmount(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                &larr; Back to Main Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show searching state
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-800 p-4">
        <div className="bg-slate-700 p-8 rounded-xl shadow-2xl w-full max-w-md">
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400"></div>
              <p className="text-slate-300 text-lg">{searchMessage || 'Searching for opponent...'}</p>
              <p className="text-slate-400 text-sm">Waiting for another player to join</p>
            </div>
            
            <button
              onClick={handleCancelSearch}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center space-x-2"
            >
              <span>Cancel Search</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-800 p-4">
      <h1 className="text-5xl font-bold mb-8 text-cyan-400">Gemini Ludo AI</h1>
      <div className="bg-slate-700 p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
        {user && (
          <div className="mb-6 p-4 bg-slate-600 rounded-lg">
            <div className="text-slate-200 text-sm mb-2">
              <span className="font-semibold">Logged in as:</span> {user.username || user.phone}
            </div>
            {user.balance !== undefined && (
              <div className="text-cyan-300 text-lg font-bold">
                Balance: ${user.balance.toLocaleString()}
              </div>
            )}
          </div>
        )}
        <p className="text-slate-300 mb-8 text-lg">Choose how you want to play.</p>
        <div className="space-y-4">
          <button
            onClick={handleStartMultiplayer}
            disabled={!user || isSearching}
            className="w-full flex items-center justify-center space-x-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold text-2xl py-4 rounded-lg shadow-xl transition transform hover:scale-105"
          >
            <span className="text-3xl">🧑‍🤝‍🧑</span>
            <span>Multiplayer (Online)</span>
          </button>
          <button
            onClick={() => setMode('local_setup')}
            className="w-full flex items-center justify-center space-x-3 bg-green-600 hover:bg-green-500 text-white font-bold text-2xl py-4 rounded-lg shadow-xl transition transform hover:scale-105"
          >
            <span className="text-3xl">🤖</span>
            <span>Play Local (vs AI/Human)</span>
          </button>
        </div>
        <div className="mt-8 border-t border-slate-600 pt-6 space-y-3">
          <button
            onClick={onEnterWallet}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg py-3 rounded-lg shadow-lg transition transform hover:scale-105"
          >
            💰 Wallet
          </button>
          {(isAdmin || isSuperAdmin) && (
            <button
              onClick={onEnterAdmin}
              className="w-full bg-slate-600 hover:bg-slate-500 text-cyan-300 font-bold text-lg py-3 rounded-lg shadow-lg transition transform hover:scale-105"
            >
              {isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
            </button>
          )}
          <button
            onClick={() => {
              logout();
              window.location.reload();
            }}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-lg py-3 rounded-lg shadow-lg transition transform hover:scale-105"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
