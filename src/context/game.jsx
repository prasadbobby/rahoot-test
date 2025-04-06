// src/context/game.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSocketContext } from './socket';

// Create context
const GameContext = createContext();

// Initial state
const initialState = {
  activeGame: null,
  gameInstance: null,
  players: [],
  currentQuestion: null,
  currentQuestionIndex: -1,
  results: null,
  loading: false,
  status: 'idle', // idle, waiting, starting, active, reviewing, finished
  timer: 0,
  playerAnswer: null,
  hostView: false,
  answersReceived: 0,
  gamePin: null
};

// Reducer
function gameReducer(state, action) {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true };
    
    case 'LOAD_GAME':
      return {
        ...state,
        activeGame: action.payload,
        loading: false
      };
    
    case 'CREATE_GAME_INSTANCE':
      return {
        ...state,
        gameInstance: action.payload,
        gamePin: action.payload.pinCode,
        status: 'waiting',
        hostView: true,
        loading: false
      };
    
    case 'JOIN_GAME':
      return {
        ...state,
        gameInstance: action.payload,
        gamePin: action.payload.pinCode,
        status: 'waiting',
        hostView: false,
        loading: false
      };
    
    case 'UPDATE_PLAYERS':
      return {
        ...state,
        players: action.payload
      };
    
    case 'START_GAME':
      return {
        ...state,
        status: 'starting'
      };
    
    case 'SHOW_QUESTION':
      return {
        ...state,
        currentQuestion: action.payload.question,
        currentQuestionIndex: action.payload.index,
        status: 'active',
        timer: action.payload.question.timeLimit,
        playerAnswer: null,
        answersReceived: 0
      };
    
    case 'UPDATE_TIMER':
      return {
        ...state,
        timer: action.payload
      };
    
    case 'SUBMIT_ANSWER':
      return {
        ...state,
        playerAnswer: action.payload
      };
    
    case 'ANSWERS_RECEIVED':
      return {
        ...state,
        answersReceived: action.payload
      };
    
    case 'SHOW_QUESTION_RESULTS':
      return {
        ...state,
        status: 'reviewing',
        results: action.payload
      };
    
    case 'FINISH_GAME':
      return {
        ...state,
        status: 'finished',
        results: action.payload
      };
    
    case 'RESET_GAME':
      return initialState;
    
    default:
      return state;
  }
}

// Provider
export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { socket, connected } = useSocketContext();
  
  // Handle socket events
  useEffect(() => {
    if (!socket) return;
    
    // Game events
    socket.on('game:players', (players) => {
      dispatch({ type: 'UPDATE_PLAYERS', payload: players });
    });
    
    socket.on('game:start', () => {
      dispatch({ type: 'START_GAME' });
    });
    
    socket.on('game:question', (data) => {
      dispatch({ 
        type: 'SHOW_QUESTION', 
        payload: {
          question: data.question,
          index: data.currentQuestionIndex
        }
      });
    });
    
    socket.on('game:timer', (seconds) => {
      dispatch({ type: 'UPDATE_TIMER', payload: seconds });
    });
    
    socket.on('game:answer-received', (count) => {
      dispatch({ type: 'ANSWERS_RECEIVED', payload: count });
    });
    
    socket.on('game:question-results', (results) => {
      dispatch({ type: 'SHOW_QUESTION_RESULTS', payload: results });
    });
    
    socket.on('game:end', (finalResults) => {
      dispatch({ type: 'FINISH_GAME', payload: finalResults });
    });
    
    socket.on('game:error', (message) => {
      toast.error(message);
    });
    
    // Connection events
    socket.on('reconnect', () => {
      toast.success('Reconnected to game');
    });
    
    // Clean up
    return () => {
      socket.off('game:players');
      socket.off('game:start');
      socket.off('game:question');
      socket.off('game:timer');
      socket.off('game:answer-received');
      socket.off('game:question-results');
      socket.off('game:end');
      socket.off('game:error');
      socket.off('reconnect');
    };
  }, [socket]);
  
  // Join a game
  const joinGame = async (gamePin, username) => {
    try {
      if (!socket || !connected) {
        toast.error('Socket connection is not available');
        return false;
      }
      
      dispatch({ type: 'LOADING' });
      
      return new Promise((resolve) => {
        // Set up response handler
        socket.once('player:join-response', (response) => {
          if (response.success) {
            dispatch({ type: 'JOIN_GAME', payload: response.gameInstance });
            toast.success(`Joined game as ${username}`);
            resolve(true);
          } else {
            toast.error(response.message || 'Failed to join game');
            dispatch({ type: 'RESET_GAME' });
            resolve(false);
          }
        });
        
        // Send join request
        socket.emit('player:join', { gamePin, username });
        
        // Set timeout for response
        setTimeout(() => {
          socket.off('player:join-response');
          toast.error('Join request timed out');
          dispatch({ type: 'RESET_GAME' });
          resolve(false);
        }, 10000); // Increased timeout
      });
    } catch (error) {
      console.error('Error joining game:', error);
      toast.error('Failed to join game');
      dispatch({ type: 'RESET_GAME' });
      return false;
    }
  };
  
  // Start game (host)
  const startGame = () => {
    if (!socket || !connected || !state.gameInstance || !state.hostView) {
      toast.error('Cannot start game');
      return false;
    }
    
    socket.emit('host:start-game', { instanceId: state.gameInstance.id });
    return true;
  };
  
  // Submit answer (player)
  const submitAnswer = (answerId) => {
    if (!socket || !connected || !state.gameInstance || state.status !== 'active') {
      return false;
    }
    
    const responseTime = (state.currentQuestion.timeLimit - state.timer) * 1000;
    
    socket.emit('player:answer', {
      instanceId: state.gameInstance.id,
      questionIndex: state.currentQuestionIndex,
      answer: answerId,
      responseTime
    });
    
    dispatch({ type: 'SUBMIT_ANSWER', payload: answerId });
    return true;
  };
  
  // Next question (host)
  const nextQuestion = () => {
    if (!socket || !connected || !state.gameInstance || !state.hostView) {
      return false;
    }
    
    socket.emit('host:next-question', { instanceId: state.gameInstance.id });
    return true;
  };
  
  // End game (host)
  const endGame = () => {
    if (!socket || !connected || !state.gameInstance || !state.hostView) {
      return false;
    }
    
    socket.emit('host:end-game', { instanceId: state.gameInstance.id });
    return true;
  };
  
  // Reset game state
  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };
  
  // Create game from admin panel
  const createGame = async (gameData) => {
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rahootAuthToken')}`
        },
        body: JSON.stringify(gameData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create game');
      }
      
      const game = await response.json();
      return game;
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Failed to create game');
      return null;
    }
  };
  
  // Create game instance for hosting
  const createGameInstance = async (gameId) => {
    try {
      if (!socket || !connected) {
        toast.error('Socket connection is not available');
        return false;
      }
      
      dispatch({ type: 'LOADING' });
      
      return new Promise((resolve) => {
        // Set up response handler
        socket.once('host:create-game-response', (response) => {
          if (response.success) {
            dispatch({ type: 'CREATE_GAME_INSTANCE', payload: response.gameInstance });
            toast.success(`Game created with PIN: ${response.gameInstance.pinCode}`);
            resolve(true);
          } else {
            toast.error(response.message || 'Failed to create game');
            dispatch({ type: 'RESET_GAME' });
            resolve(false);
          }
        });
        
        // Send create request
        socket.emit('host:create-game', { gameId });
        
        // Set timeout for response
        setTimeout(() => {
          socket.off('host:create-game-response');
          toast.error('Create game request timed out');
          dispatch({ type: 'RESET_GAME' });
          resolve(false);
        }, 10000); // Increased from 5000
      });
    } catch (error) {
      console.error('Error creating game instance:', error);
      toast.error('Failed to create game instance');
      dispatch({ type: 'RESET_GAME' });
      return false;
    }
  };
  
  // Context value
  const value = {
    ...state,
    joinGame,
    createGame,
    createGameInstance,
    startGame,
    submitAnswer,
    nextQuestion,
    endGame,
    resetGame
  };
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

// Hook
export function useGame() {
  const context = useContext(GameContext);
  
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  
  return context;
}