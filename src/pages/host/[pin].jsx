// src/pages/host/[pin].jsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/auth';
import { useSocketContext } from '@/context/socket';
import { toast } from 'react-hot-toast';
import { FiPlay, FiUsers, FiCopy, FiUserPlus } from 'react-icons/fi';

export default function HostGame() {
  const router = useRouter();
  const { pin } = router.query;
  const { user, isAuthenticated, loading, isAdmin } = useAuth();
  const { socket, connected, reconnect } = useSocketContext();
  
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState('waiting'); // waiting, starting, active, reviewing, finished
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [results, setResults] = useState(null);
  const [timer, setTimer] = useState(0);
  const [answersReceived, setAnswersReceived] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (!loading && !isAdmin) {
      toast.error('Admin privileges required to host games');
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, isAdmin, router]);
  
  // Set up socket connection
  useEffect(() => {
    // Only run this once when the component mounts and all dependencies are ready
    if (!socket || !connected || !pin || isInitialized) return;
    
    console.log('Setting up connection for host with pin:', pin);
    setIsInitialized(true);
    
    // Handle new player joining
    const handleNewPlayer = (player) => {
      console.log("New player joined:", player);
      
      // Update player list without duplicates
      setPlayers(prevPlayers => {
        // Check if player already exists
        if (prevPlayers.some(p => p.id === player.id)) {
          return prevPlayers;
        }
        return [...prevPlayers, player];
      });
      
      toast.success(`${player.username} joined the game!`);
    };
    
    // Handle player removal
    const handlePlayerRemoved = (playerId) => {
      console.log("Player removed:", playerId);
      setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== playerId));
    };
    
    // Clear any existing listeners to prevent duplicates
    socket.off('manager:newPlayer');
    socket.off('manager:removePlayer');
    socket.off('manager:playerKicked');
    
    // Set up listeners for player events
    socket.on('manager:newPlayer', handleNewPlayer);
    socket.on('manager:removePlayer', handlePlayerRemoved);
    socket.on('manager:playerKicked', handlePlayerRemoved);
    
    // Establish connection as host
    socket.emit('manager:hostRoom', { token: localStorage.getItem('rahootAuthToken'), pin });
    
    // Request current player list - add this event to server.js
    setTimeout(() => {
      socket.emit('manager:getPlayers');
    }, 1000);
    
    return () => {
      socket.off('manager:newPlayer', handleNewPlayer);
      socket.off('manager:removePlayer', handlePlayerRemoved);
      socket.off('manager:playerKicked', handlePlayerRemoved);
    };
  }, [socket, connected, pin, isInitialized]);
  
  // Show reconnection UI if not connected
  if (!connected && isInitialized) {
    return (
      <Layout title="Connection Lost" showHeader={false} showFooter={false}>
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-primary-dark to-primary p-6">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-center mb-4">Connection Lost</h2>
            <p className="text-gray-600 mb-6 text-center">
              Lost connection to the game server. Your game session may be affected.
            </p>
            <div className="flex flex-col space-y-4">
              <button
                onClick={reconnect}
                className="w-full py-3 px-4 bg-primary text-white font-bold rounded-md hover:bg-primary-dark"
              >
                Reconnect
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 px-4 bg-gray-200 text-gray-800 font-bold rounded-md hover:bg-gray-300"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Start the game
  const startGame = () => {
    if (!socket || !connected) {
      toast.error('Socket connection not available');
      return;
    }
    
    if (players.length === 0) {
      toast.error('Cannot start game with no players');
      return;
    }
    
    socket.emit('manager:startGame');
  };
  
  // Copy game PIN to clipboard
  const copyPin = () => {
    if (!pin) return;
    
    navigator.clipboard.writeText(pin).then(() => {
      toast.success('Game PIN copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy PIN:', err);
      toast.error('Failed to copy PIN');
    });
  };
  
  // Kick a player
  const kickPlayer = (playerId) => {
    if (!socket || !connected) return;
    socket.emit('manager:kickPlayer', playerId);
  };
  
  if (loading || !isAuthenticated || !isAdmin) {
    return (
      <Layout title="Hosting Game">
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title={`Hosting Game: ${pin}`} showHeader={false} showFooter={false}>
      <div className="min-h-screen bg-gradient-to-b from-primary-dark to-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-white text-primary font-medium rounded-md py-2 px-4 flex items-center hover:bg-gray-100 transition-colors"
              >
                <span>Exit</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-md py-2 px-4 flex items-center space-x-3">
                <span className="font-bold text-xl text-primary">{pin}</span>
                <button onClick={copyPin} className="text-gray-500 hover:text-gray-700">
                  <FiCopy className="h-5 w-5" />
                </button>
              </div>
              <div className="bg-white rounded-md py-2 px-4 flex items-center space-x-2">
                <FiUsers className="h-5 w-5 text-primary" />
                <span className="font-bold">{players.length}</span>
              </div>
            </div>
          </div>
          
          {/* Waiting Room */}
          <div className="bg-white rounded-lg shadow-lg p-6 min-h-[calc(100vh-200px)]">
            <div className="h-full flex flex-col items-center justify-center">
              <h1 className="text-3xl font-bold mb-6">Waiting for players to join</h1>
              
              {players.length > 0 ? (
                <div className="w-full max-w-3xl">
                  <div className="mb-4 flex items-center">
                    <FiUserPlus className="mr-2 h-5 w-5 text-primary" />
                    <h3 className="text-xl font-medium text-gray-800">
                      Players: {players.length}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className="bg-gray-100 p-3 rounded-md flex items-center justify-between"
                        title="Click to kick player"
                      >
                        <span className="font-medium truncate">{player.username}</span>
                        <button 
                          onClick={() => kickPlayer(player.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={startGame}
                      className="bg-primary text-white font-bold py-3 px-6 rounded-md text-lg flex items-center hover:bg-primary-dark transition-colors"
                    >
                      <FiPlay className="mr-2" />
                      Start Game
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    Share the PIN with your players to let them join
                  </p>
                  <div className="flex justify-center items-center space-x-4">
                    <div className="text-5xl font-bold tracking-wider text-primary">{pin}</div>
                    <button 
                      onClick={copyPin}
                      className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <FiCopy className="h-6 w-6 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}