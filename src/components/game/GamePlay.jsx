// src/components/game/GamePlay.jsx
import { useState, useEffect } from 'react';
import { FiCheck, FiClock, FiUsers } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketContext } from '@/context/socket';
import { usePlayerContext } from '@/context/player';

const answerColors = [
  'bg-red-500',
  'bg-blue-500',
  'bg-yellow-500',
  'bg-green-500',
];

export default function GamePlay() {
  const { socket, connected } = useSocketContext();
  const { player } = usePlayerContext();
  const [status, setStatus] = useState('waiting'); // waiting, active, reviewing
  const [question, setQuestion] = useState(null);
  const [timer, setTimer] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [results, setResults] = useState(null);
  const [playersAnswered, setPlayersAnswered] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  
  useEffect(() => {
    if (!socket || !connected) return;
    
    // Get game status
    socket.on("game:status", (status) => {
      if (status.name === "SELECT_ANSWER") {
        setStatus('active');
        setQuestion({
          text: status.data.question,
          image: status.data.image,
          answers: status.data.answers,
          timeLimit: status.data.time
        });
        setTimer(status.data.time);
        setSelectedAnswer(null);
        setPlayersAnswered(0);
        setTotalPlayers(status.data.totalPlayer || 0);
      } 
      else if (status.name === "SHOW_RESULT") {
        setStatus('reviewing');
        setResults(status.data);
      }
    });
    
    // Get timer updates
    socket.on("game:cooldown", (seconds) => {
      setTimer(seconds);
    });
    
    // Get player answer updates
    socket.on("game:playerAnswer", (count) => {
      setPlayersAnswered(count);
    });
    
    return () => {
      socket.off("game:status");
      socket.off("game:cooldown");
      socket.off("game:playerAnswer");
    };
  }, [socket, connected]);
  
  // Handle answer selection
  const handleAnswerSelect = (index) => {
    if (status !== 'active' || selectedAnswer !== null) return;
    
    setSelectedAnswer(index);
    socket.emit("player:selectedAnswer", index);
  };
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      {status === 'active' && question && (
        <div className="flex flex-col h-full">
          {/* Timer and player count */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-1 text-white bg-primary/80 rounded-full px-3 py-1">
              <FiClock className="h-4 w-4" />
              <span className="font-bold">{timer}</span>
            </div>
            
            <div className="flex items-center space-x-1 text-white bg-gray-700/80 rounded-full px-3 py-1">
              <FiUsers className="h-4 w-4" />
              <span className="font-bold">{playersAnswered} / {totalPlayers}</span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div 
              className={`h-full rounded-full ${timer <= 5 ? 'bg-red-500' : 'bg-primary'}`}
              style={{ width: `${(timer / question.timeLimit) * 100}%`, transition: 'width 1s linear' }}
            ></div>
          </div>
          
          {/* Question */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-lg p-6 mb-6"
          >
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              {question.text}
            </h2>
            
            {question.image && (
              <div className="flex justify-center mb-4">
                <img 
                  src={question.image} 
                  alt="Question" 
                  className="max-h-56 rounded-lg object-contain"
                />
              </div>
            )}
          </motion.div>
          
          {/* Answer options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
            {question.answers.map((answer, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleAnswerSelect(index)}
                disabled={selectedAnswer !== null}
                className={`
                  ${answerColors[index]} h-full min-h-[80px] rounded-lg shadow-lg p-4
                  text-white font-bold text-lg flex items-center justify-start
                  hover:brightness-110 transition-all
                  ${selectedAnswer === index ? 'ring-4 ring-white' : ''}
                `}
              >
                <span className="mr-4">{index + 1}</span>
                <span>{answer}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}
      
      {status === 'reviewing' && results && (
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg shadow-lg p-8 text-center w-full max-w-2xl"
          >
            <div className="text-5xl mb-6">
              {results.correct ? (
                <span className="text-green-500">✓</span>
              ) : (
                <span className="text-red-500">✗</span>
              )}
            </div>
            
            <h2 className="text-2xl font-bold mb-4">
              {results.correct ? "Correct!" : "Incorrect!"}
            </h2>
            
            {results.correct && (
              <div className="text-xl font-bold text-green-500 mb-4">
                +{results.points} points
              </div>
            )}
            
            <div className="mt-4">
              <p className="text-gray-700">Total score: <span className="font-bold">{results.myPoints}</span></p>
              <p className="text-gray-700">Rank: <span className="font-bold">{results.rank}</span></p>
              
              {results.aheadOfMe && (
                <p className="text-gray-700 mt-2">
                  Next ahead: <span className="font-bold">{results.aheadOfMe}</span>
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}