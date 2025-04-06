// src/pages/host/[pin].jsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/auth';
import { useSocketContext } from '@/context/socket';
import { toast } from 'react-hot-toast';
import { FiPlay, FiUsers, FiCopy } from 'react-icons/fi';

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
    if (!socket || !connected || !pin || !isAuthenticated || isInitialized) return;
    
    console.log('Setting up connection for host with pin:', pin);
    setIsInitialized(true);
    
    // Clear any existing listeners to prevent duplicates
    socket.off('manager:inviteCode');
    socket.off('game:errorMessage');
    socket.off('manager:newPlayer');
    socket.off('manager:removePlayer');
    socket.off('manager:playerKicked');
    socket.off('game:status');
    socket.off('game:timer');
    socket.off('game:playerAnswer');
    
    // Instead of creating a new room, we'll modify the server to support joining with a specific PIN
    const token = localStorage.getItem('rahootAuthToken');
    
    // Custom event for hosting a specific PIN
    socket.emit('manager:hostRoom', { token, pin });
    
    // Listen for confirmation that we're hosting the room
    socket.on('manager:hostingRoom', (roomPin) => {
      if (roomPin === pin) {
        toast.success(`Hosting game with PIN: ${pin}`);
        
        // Listen for game status updates
        socket.on('game:status', (status) => {
          console.log('Received game status:', status.name);
          setGameState(status.name);
          
          if (status.name === 'SHOW_QUESTION') {
            setCurrentQuestion(status.data.question);
            setCurrentQuestionIndex(status.data.currentQuestion);
            setTimer(status.data.time);
            setAnswersReceived(0);
          } else if (status.name === 'SELECT_ANSWER') {
            setAnswersReceived(0);
          } else if (status.name === 'SHOW_RESPONSES') {
            setResults(status.data);
          } else if (status.name === 'SHOW_LEADERBOARD') {
            setResults(status.data);
          } else if (status.name === 'FINISH') {
            setResults(status.data);
          }
        });
        
        // Listen for error messages
        socket.on('game:errorMessage', (message) => {
          toast.error(message);
        });
        
        // Listen for new players
        socket.on('manager:newPlayer', (player) => {
          console.log('New player joined:', player);
          setPlayers(prev => [...prev, player]);
          toast.success(`${player.username} joined the game`);
        });
        
        // Listen for player removal
        socket.on('manager:removePlayer', (playerId) => {
          setPlayers(prev => prev.filter(p => p.id !== playerId));
        });
        
        // Listen for player kicked
        socket.on('manager:playerKicked', (playerId) => {
          setPlayers(prev => prev.filter(p => p.id !== playerId));
        });
        
        // Listen for timer updates
        socket.on('game:timer', (seconds) => {
          setTimer(seconds);
        });
        
        // Listen for answer count updates
        socket.on('game:playerAnswer', (count) => {
          setAnswersReceived(count);
        });
      } else {
        console.error('PIN mismatch on hosting confirmation:', roomPin, pin);
        toast.error(`Error hosting game: PIN mismatch`);
        router.push('/dashboard');
      }
    });
    
    // Listen for errors during hosting
    socket.on('manager:hostError', (error) => {
      console.error('Error hosting room:', error);
      toast.error(`Error hosting game: ${error}`);
      router.push('/dashboard');
    });
    
    // Clean up listeners when component unmounts
    return () => {
      socket.off('manager:hostingRoom');
      socket.off('manager:hostError');
      socket.off('game:errorMessage');
      socket.off('manager:newPlayer');
      socket.off('manager:removePlayer');
      socket.off('manager:playerKicked');
      socket.off('game:status');
      socket.off('game:timer');
      socket.off('game:playerAnswer');
    };
  }, [socket, connected, pin, isAuthenticated, router, isInitialized]);
  
  // Show reconnection UI if connection is lost
  useEffect(() => {
    if (!connected && isAuthenticated && isInitialized) {
      toast.error('Connection to server lost. Attempting to reconnect...');
      if (reconnect) {
        reconnect();
      }
    }
  }, [connected, isAuthenticated, reconnect, isInitialized]);
  
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
    
    const token = localStorage.getItem('rahootAuthToken');
    socket.emit('manager:startGame', token);
  };
  
  // Go to next question
  const nextQuestion = () => {
    if (!socket || !connected) {
      toast.error('Socket connection not available');
      return;
    }
    
    const token = localStorage.getItem('rahootAuthToken');
    socket.emit('manager:nextQuestion', token);
  };
  
  // Show leaderboard
  const showLeaderboard = () => {
    if (!socket || !connected) {
      toast.error('Socket connection not available');
      return;
    }
    
    const token = localStorage.getItem('rahootAuthToken');
    socket.emit('manager:showLeaderboard', token);
  };
  
  // Kick a player
  const kickPlayer = (playerId) => {
    if (!socket || !connected) {
      toast.error('Socket connection not available');
      return;
    }
    
    const token = localStorage.getItem('rahootAuthToken');
    socket.emit('manager:kickPlayer', { token, playerId });
  };
  
  // Copy game PIN to clipboard
  const copyPin = () => {
    navigator.clipboard.writeText(pin);
    toast.success('Game PIN copied to clipboard');
  };
  
  // End the game and return to dashboard
  const endGame = () => {
    if (!socket || !connected) {
      toast.error('Socket connection not available');
      return;
    }
    
    const token = localStorage.getItem('rahootAuthToken');
    socket.emit('manager:resetGame', token);
    router.push('/dashboard');
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
          
          {/* Game content based on state */}
          <div className="bg-white rounded-lg shadow-lg p-6 min-h-[calc(100vh-200px)]">
            {gameState === 'waiting' || gameState === 'SHOW_ROOM' ? (
              <div className="h-full flex flex-col items-center justify-center">
                <h1 className="text-3xl font-bold mb-6">Waiting for players to join</h1>
                
                {players.length > 0 ? (
                  <div className="w-full max-w-3xl">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {players.map(player => (
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
            ) : gameState === 'SHOW_QUESTION' || gameState === 'SELECT_ANSWER' ? (
              <div className="h-full flex flex-col">
                <div className="mb-4 flex justify-between items-center">
                  <div className="text-xl font-bold">
                    Question {currentQuestionIndex + 1}
                  </div>
                  <div className="flex space-x-4">
                    <div className="bg-gray-100 px-3 py-1 rounded-full flex items-center">
                      <FiUsers className="mr-2 text-primary" />
                      <span>{answersReceived} / {players.length}</span>
                    </div>
                    <div className="bg-gray-100 px-3 py-1 rounded-full font-bold">
                      {timer}s
                    </div>
                  </div>
                </div>
                
                <div className="flex-grow">
                  <h2 className="text-2xl font-bold mb-4">{currentQuestion?.question}</h2>
                  
                  {currentQuestion?.image && (
                    <div className="mb-4 flex justify-center">
                      <img 
                        src={currentQuestion.image} 
                        alt="Question" 
                        className="max-h-64 rounded-lg object-contain" 
                      />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    {currentQuestion?.answers?.map((answer, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg text-white font-medium ${
                          index === 0 ? 'bg-red-500' :
                          index === 1 ? 'bg-blue-500' :
                          index === 2 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                      >
                        {answer}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : gameState === 'SHOW_RESPONSES' ? (
              <div className="h-full flex flex-col">
                <h2 className="text-2xl font-bold mb-6">Question Results</h2>
                
                <div className="mb-6">
                  <h3 className="text-xl mb-2">{results?.question}</h3>
                  
                  {results?.image && (
                    <div className="mb-4 flex justify-center">
                      <img 
                        src={results.image} 
                        alt="Question" 
                        className="max-h-48 rounded-lg object-contain" 
                      />
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {results?.answers?.map((answer, index) => {
                    const responseCount = results.responses?.[index] || 0;
                    const totalResponses = Object.values(results.responses || {}).reduce((a, b) => a + b, 0) || 1;
                    const percentage = Math.round((responseCount / totalResponses) * 100);
                    
                    return (
                      <div 
                        key={index}
                        className={`p-4 rounded-lg ${
                          index === results.correct 
                            ? 'bg-green-100 border-2 border-green-500' 
                            : 'bg-gray-100'
                        }`}
                      >
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">{answer}</span>
                          <span className="font-bold">{responseCount} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              index === results.correct ? 'bg-green-500' : 'bg-gray-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex justify-center mt-auto">
                  <button
                    onClick={showLeaderboard}
                    className="bg-primary text-white font-bold py-3 px-6 rounded-md text-lg hover:bg-primary-dark transition-colors"
                  >
                    Show Leaderboard
                  </button>
                </div>
              </div>
            ) : gameState === 'SHOW_LEADERBOARD' ? (
              <div className="h-full flex flex-col">
                <h2 className="text-2xl font-bold mb-6">Leaderboard</h2>
                
                <div className="space-y-4 mb-8">
                  {results?.leaderboard?.map((player, index) => (
                    <div 
                      key={player.id || index}
                      className="flex items-center bg-gray-100 p-4 rounded-lg"
                    >
                      <div className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-full font-bold mr-3">
                        {index + 1}
                      </div>
                      <div className="flex-grow font-medium">{player.username}</div>
                      <div className="font-bold text-xl">{Math.round(player.points)} pts</div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-center mt-auto">
                  <button
                    onClick={nextQuestion}
                    className="bg-primary text-white font-bold py-3 px-6 rounded-md text-lg hover:bg-primary-dark transition-colors"
                  >
                    Next Question
                  </button>
                </div>
              </div>
            ) : gameState === 'FINISH' ? (
              <div className="h-full flex flex-col items-center justify-center">
                <h2 className="text-3xl font-bold mb-8">Game Completed!</h2>
                
                <div className="flex flex-col items-center">
                  <h3 className="text-xl font-medium mb-6">Top Players</h3>
                  
                  <div className="flex justify-center items-end space-x-8 mb-10">
                    {results?.top?.[1] && (
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 flex items-center justify-center bg-gray-300 rounded-full mb-2">
                          <span className="text-4xl font-bold">2</span>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{results.top[1].username}</div>
                          <div className="font-bold text-gray-600">{Math.round(results.top[1].points)} pts</div>
                        </div>
                      </div>
                    )}
                    
                    {results?.top?.[0] && (
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 flex items-center justify-center bg-yellow-400 rounded-full mb-2">
                          <span className="text-5xl font-bold">1</span>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{results.top[0].username}</div>
                          <div className="font-bold text-gray-600">{Math.round(results.top[0].points)} pts</div>
                        </div>
                      </div>
                    )}
                    
                    {results?.top?.[2] && (
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 flex items-center justify-center bg-amber-700 rounded-full mb-2 text-white">
                          <span className="text-4xl font-bold">3</span>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{results.top[2].username}</div>
                          <div className="font-bold text-gray-600">{Math.round(results.top[2].points)} pts</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={endGame}
                    className="bg-primary text-white font-bold py-3 px-6 rounded-md text-lg hover:bg-primary-dark transition-colors"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}