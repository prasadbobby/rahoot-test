import { useState, useEffect } from 'react';
import { FiCheck, FiClock, FiUsers } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/game';
import { useSound } from '@/hooks/useSound';

// Question timer sounds
const TIMER_TICK = '/sounds/timer-tick.mp3';
const TIMER_END = '/sounds/timer-end.mp3';
const CORRECT_ANSWER = '/sounds/correct-answer.mp3';
const WRONG_ANSWER = '/sounds/wrong-answer.mp3';

const answerColors = [
  'bg-red-500',
  'bg-blue-500',
  'bg-yellow-500',
  'bg-green-500',
];

export default function GamePlay({ isHost = false }) {
  const { 
    currentQuestion,
    timer,
    players,
    playerAnswer,
    answersReceived,
    status,
    submitAnswer,
    results,
    nextQuestion
  } = useGame();
  
  const [playTimerTick] = useSound(TIMER_TICK, { volume: 0.2 });
  const [playTimerEnd] = useSound(TIMER_END, { volume: 0.3 });
  const [playCorrectAnswer] = useSound(CORRECT_ANSWER, { volume: 0.5 });
  const [playWrongAnswer] = useSound(WRONG_ANSWER, { volume: 0.5 });
  
// src/components/game/GamePlay.jsx (continued)
  // Play timer sound when 5 seconds or less remain
  useEffect(() => {
    if (status === 'active' && timer <= 5 && timer > 0) {
      playTimerTick();
    } else if (status === 'active' && timer === 0) {
      playTimerEnd();
    }
  }, [status, timer, playTimerTick, playTimerEnd]);
  
  // Play correct/wrong sound when showing results
  useEffect(() => {
    if (status === 'reviewing' && results) {
      if (playerAnswer === currentQuestion.correctAnswer) {
        playCorrectAnswer();
      } else {
        playWrongAnswer();
      }
    }
  }, [status, results, playerAnswer, currentQuestion, playCorrectAnswer, playWrongAnswer]);
  
  const handleAnswerSelect = (answerIndex) => {
    if (status === 'active' && playerAnswer === null) {
      submitAnswer(answerIndex);
    }
  };
  
  const renderTimerBar = () => {
    const percentage = (timer / currentQuestion.timeLimit) * 100;
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
        <div 
          className={`h-full rounded-full ${percentage <= 20 ? 'bg-red-500' : 'bg-primary'}`}
          style={{ width: `${percentage}%`, transition: 'width 1s linear' }}
        ></div>
      </div>
    );
  };
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      {/* Question display */}
      {status === 'active' && currentQuestion && (
        <div className="flex flex-col h-full">
          {/* Timer and player count */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-1 text-white bg-primary/80 rounded-full px-3 py-1">
              <FiClock className="h-4 w-4" />
              <span className="font-bold">{timer}</span>
            </div>
            
            {isHost && (
              <div className="flex items-center space-x-1 text-white bg-gray-700/80 rounded-full px-3 py-1">
                <FiUsers className="h-4 w-4" />
                <span className="font-bold">{answersReceived} / {players.length}</span>
              </div>
            )}
          </div>
          
          {renderTimerBar()}
          
          {/* Question */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-lg p-6 mb-6"
          >
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              {currentQuestion.question}
            </h2>
            
            {currentQuestion.image && (
              <div className="flex justify-center mb-4">
                <img 
                  src={currentQuestion.image} 
                  alt="Question" 
                  className="max-h-56 rounded-lg object-contain"
                />
              </div>
            )}
          </motion.div>
          
          {/* Answer options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
            {currentQuestion.answers.map((answer, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleAnswerSelect(index)}
                disabled={playerAnswer !== null || isHost}
                className={`
                  ${answerColors[index]} h-full min-h-[80px] rounded-lg shadow-lg p-4
                  text-white font-bold text-lg flex items-center justify-start
                  hover:brightness-110 transition-all
                  ${playerAnswer === index ? 'ring-4 ring-white' : ''}
                  ${isHost ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                <span className="mr-4">{index + 1}</span>
                <span>{answer}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}
      
      {/* Results display */}
      {status === 'reviewing' && results && (
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="bg-white rounded-lg shadow-lg p-8 mb-8 text-center w-full max-w-2xl"
          >
            <h2 className="text-2xl font-bold mb-6">{currentQuestion.question}</h2>
            
            {currentQuestion.image && (
              <div className="flex justify-center mb-6">
                <img 
                  src={currentQuestion.image} 
                  alt="Question" 
                  className="max-h-48 rounded-lg object-contain"
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {currentQuestion.answers.map((answer, index) => (
                <div 
                  key={index}
                  className={`
                    p-4 rounded-lg relative
                    ${index === currentQuestion.correctAnswer 
                      ? 'bg-green-100 border-2 border-green-500' 
                      : (playerAnswer === index && playerAnswer !== currentQuestion.correctAnswer)
                        ? 'bg-red-100 border-2 border-red-300'
                        : 'bg-gray-100 border border-gray-200'
                    }
                  `}
                >
                  {index === currentQuestion.correctAnswer && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                      <FiCheck className="h-4 w-4" />
                    </div>
                  )}
                  <p className="font-medium">{answer}</p>
                </div>
              ))}
            </div>
            
            {!isHost && (
              <div className="flex flex-col items-center">
                <div className="text-2xl font-bold mb-2">
                  {playerAnswer === currentQuestion.correctAnswer
                    ? `Correct! +${results.pointsEarned} points`
                    : 'Incorrect!'}
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-6 mb-4">
                  <div 
                    className="h-full rounded-full bg-primary text-xs text-white flex items-center justify-center"
                    style={{ width: `${(results.responseTime / currentQuestion.timeLimit / 1000) * 100}%` }}
                  >
                    {results.responseTime / 1000}s
                  </div>
                </div>
                
                <div className="text-lg">
                  Your score: <span className="font-bold">{results.totalScore}</span>
                </div>
                <div className="text-sm text-gray-500">
                  Current rank: {results.currentRank}/{players.length}
                </div>
              </div>
            )}
            
            {isHost && (
              <div className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-green-100 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{results.correctCount}</div>
                    <div className="text-sm text-gray-600">Correct</div>
                  </div>
                  
                  <div className="bg-red-100 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{results.incorrectCount}</div>
                    <div className="text-sm text-gray-600">Incorrect</div>
                  </div>
                  
                  <div className="bg-blue-100 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{results.averageTime.toFixed(1)}s</div>
                    <div className="text-sm text-gray-600">Avg. Time</div>
                  </div>
                  
                  <div className="bg-yellow-100 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">{results.noAnswerCount}</div>
                    <div className="text-sm text-gray-600">No Answer</div>
                  </div>
                </div>
                
                <button
                  onClick={nextQuestion}
                  className="px-6 py-3 bg-primary text-white font-bold rounded-lg shadow hover:bg-primary-dark transition-colors"
                >
                  Next Question
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}