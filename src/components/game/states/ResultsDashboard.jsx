// src/components/game/states/ResultsDashboard.jsx
import { useEffect, useState } from "react"
import { usePlayerContext } from "@/context/player"
import confetti from "canvas-confetti"
import clsx from "clsx"
import { motion } from "framer-motion"
import { SFX_RESULTS_SOUND } from "@/constants"
import useSound from "use-sound"

export default function ResultsDashboard({ data }) {
  const { player } = usePlayerContext()
  const [showConfetti, setShowConfetti] = useState(false)
  
  const { leaderboard, totalQuestions, subject } = data
  const playerResult = leaderboard.find(p => p.username === player?.username)
  const playerRank = leaderboard.findIndex(p => p.username === player?.username) + 1
  const isTopThree = playerRank <= 3
  
  const [sfxResults] = useSound(SFX_RESULTS_SOUND, { volume: 0.3 })
  
  useEffect(() => {
    sfxResults()
    
    if (isTopThree) {
      setShowConfetti(true)
      
      // Client-side only code for confetti
      try {
        const duration = 3 * 1000
        const end = Date.now() + duration
        
        const frame = () => {
          confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#ff9900', '#ffffff', '#000000'],
          })
          
          confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#ff9900', '#ffffff', '#000000'],
          })
          
          if (Date.now() < end) {
            requestAnimationFrame(frame)
          }
        }
        
        frame()
      } catch (error) {
        console.error("Error with confetti:", error)
      }
    }
  }, [isTopThree, sfxResults])

  const calculatePercentage = (points) => {
    const maxPossiblePoints = totalQuestions * 1000
    return Math.round((points / maxPossiblePoints) * 100)
  }
  
  return (
    <section className="relative flex flex-col items-center justify-center w-full max-w-7xl mx-auto px-4 py-8">
      <motion.h1 
        className="text-4xl md:text-5xl font-bold text-white text-center drop-shadow-lg mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {subject} - Final Results
      </motion.h1>
      
      {playerResult && (
        <motion.div 
          className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden mb-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="bg-gradient-to-r from-primary to-amber-500 p-4 text-white">
            <h2 className="text-xl font-bold text-center">Your Performance</h2>
          </div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{playerResult.username}</h3>
                <p className="text-gray-600">Rank: {playerRank} of {leaderboard.length}</p>
              </div>
              <div className="bg-primary rounded-full w-20 h-20 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {calculatePercentage(playerResult.points)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 mb-1">Total Score</p>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary" 
                    initial={{ width: 0 }}
                    animate={{ width: `${calculatePercentage(playerResult.points)}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  ></motion.div>
                </div>
                <p className="text-right mt-1 font-bold">{playerResult.points} pts</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      <motion.div 
        className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="bg-gradient-to-r from-primary to-amber-500 p-4 text-white">
          <h2 className="text-xl font-bold text-center">Leaderboard</h2>
        </div>
        
        <div className="divide-y">
          {leaderboard.slice(0, 10).map((entry, index) => {
            const isCurrentPlayer = entry.username === player?.username
            
            return (
              <motion.div 
                key={index}
                className={clsx(
                  "flex items-center p-4", 
                  isCurrentPlayer ? "bg-amber-50" : ""
                )}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + (index * 0.1) }}
              >
                <div className={clsx(
                  "flex items-center justify-center w-10 h-10 rounded-full mr-4 font-bold",
                  index === 0 ? "bg-amber-400 text-white" : 
                  index === 1 ? "bg-gray-300 text-gray-800" : 
                  index === 2 ? "bg-amber-700 text-white" :
                  "bg-gray-100 text-gray-800"
                )}>
                  {index + 1}
                </div>
                
                <div className="flex-1">
                  <h3 className={clsx("font-bold", isCurrentPlayer ? "text-primary" : "text-gray-800")}>
                    {entry.username}
                  </h3>
                </div>
                
                <div className="text-xl font-bold text-gray-800">
                  {entry.points} pts
                </div>
              </motion.div>
            )
          })}
          
          {leaderboard.length > 10 && (
            <div className="p-4 text-center text-gray-500">
              + {leaderboard.length - 10} more players
            </div>
          )}
        </div>
      </motion.div>
      
<motion.div 
  className="flex gap-4 mt-8"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5, delay: 1 }}
>
  <button 
    onClick={() => window.location.href = "/"}
    className="btn-shadow px-6 py-3 bg-white font-bold rounded-md text-gray-800"
  >
    <span>Play Again</span>
  </button>
</motion.div>
    </section>
  )
}