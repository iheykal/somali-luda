
import React, { useState, useEffect, useCallback } from 'react';
import type { Player, PlayerColor } from '../types';
import { socketService } from '../services/socketService';
import { useAuth } from '../context/AuthContext';

interface MultiplayerLobbyProps {
  onStartGame: (players: Player[], config: { gameId: string, localPlayerColor: PlayerColor, sessionId: string }) => void;
  onExit: () => void;
}

const getSessionId = () => {
    let id = sessionStorage.getItem('ludoSessionId');
    if (!id) {
        id = Math.random().toString(36).substring(2, 10);
        sessionStorage.setItem('ludoSessionId', id);
    }
    return id;
};

const getPlayerName = () => {
    let name = localStorage.getItem('ludoPlayerName');
    if (!name) {
        name = `Player ${Math.random().toString(36).substring(2, 6)}`;
        localStorage.setItem('ludoPlayerName', name);
    }
    return name;
};

const SearchIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const StopIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
);

const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onStartGame, onExit }) => {
    const { user } = useAuth();
    const [playerName, setPlayerName] = useState(getPlayerName());
    const [isSearching, setIsSearching] = useState(false);
    const [searchMessage, setSearchMessage] = useState('');
    const [selectedBetAmount, setSelectedBetAmount] = useState<number | null>(null);
    const sessionId = getSessionId();

    // Handle bet amount selection
    const handleBetSelection = (amount: number) => {
        if (!isSearching) {
            setSelectedBetAmount(amount);
        }
    };

    // Check if user is logged in
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-800 p-4">
                <div className="bg-slate-700 p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
                    <h2 className="text-2xl font-bold mb-4 text-white">Login Required</h2>
                    <p className="text-slate-300 mb-6">You need to be logged in to play multiplayer matches with betting.</p>
                    <button
                        onClick={onExit}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition"
                    >
                        Back to Main Menu
                    </button>
                </div>
            </div>
        );
    }

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

    const handleStartSearch = useCallback(() => {
        if (!playerName.trim()) {
            alert('Please enter your name');
            return;
        }

        if (selectedBetAmount === null) {
            alert('Please select a bet amount first');
            return;
        }

        // Save player name
        localStorage.setItem('ludoPlayerName', playerName.trim());

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
                const localPlayerName = playerName.trim();
                
                // Create players array - ALWAYS in the same order (red first, then yellow)
                // This ensures both players have the same array order for currentPlayerIndex to work correctly
                // Assign names based on colors
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
            // Start searching
            socketService.searchMatch(playerName.trim(), selectedBetAmount || 0.5, user?._id);
        } else {
            // Wait for connection, then set up listeners and search
            const checkConnection = setInterval(() => {
                if (socketService.isConnected()) {
                    clearInterval(checkConnection);
                    setupListeners();
                    // Start searching after listeners are set up
                    setTimeout(() => {
                        socketService.searchMatch(playerName.trim(), selectedBetAmount || 0.5, user?._id);
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
    }, [playerName, selectedBetAmount, user?._id, sessionId, onStartGame]);

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
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-800 p-4">
            <div className="bg-slate-700 p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h2 className="text-2xl font-bold text-center mb-6 text-white">Find an Opponent</h2>
                
                {!isSearching ? (
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="player-name" className="block text-lg font-medium text-slate-300 mb-2">
                                Your Name
                            </label>
                            <input
                                id="player-name"
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter your name"
                                maxLength={20}
                                disabled={isSearching}
                                className="w-full p-4 bg-slate-900 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                            />
                        </div>
                        
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
                            disabled={!playerName.trim() || isSearching || selectedBetAmount === null}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold text-xl py-4 rounded-lg shadow-xl transition transform hover:scale-105 flex items-center justify-center space-x-2"
                        >
                            <SearchIcon />
                            <span>
                                {selectedBetAmount !== null 
                                    ? `Find Match ($${selectedBetAmount.toFixed(2)} bet)`
                                    : 'Select Bet Amount First'
                                }
                            </span>
                        </button>
                    </div>
                ) : (
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
                            <StopIcon />
                            <span>Cancel Search</span>
                        </button>
                    </div>
                )}

                <div className="mt-8 text-center border-t border-slate-600 pt-6">
                    <button
                        onClick={onExit}
                        disabled={isSearching}
                        className="text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        &larr; Back to Main Menu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MultiplayerLobby;
