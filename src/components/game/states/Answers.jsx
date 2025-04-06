// src/components/game/states/Answers.jsx
import AnswerButton from "../../AnswerButton"
import { useSocketContext } from "@/context/socket"
import { useEffect, useState } from "react"
import clsx from "clsx"
import {
  ANSWERS_COLORS,
  ANSWERS_ICONS,
  SFX_ANSWERS_MUSIC,
  SFX_ANSWERS_SOUND,
  SFX_RESULTS_SOUND,
} from "@/constants"
import useSound from "use-sound"
import { usePlayerContext } from "@/context/player"
import { motion } from "framer-motion"

const calculatePercentages = (objectResponses) => {
  const keys = Object.keys(objectResponses)
  const values = Object.values(objectResponses)

  if (!values.length) {
    return []
  }

  const totalSum = values.reduce(
    (accumulator, currentValue) => accumulator + currentValue,
    0,
  )

  let result = {}

  keys.map((key) => {
    result[key] = ((objectResponses[key] / totalSum) * 100).toFixed() + "%"
  })

  return result
}

export default function Answers({
  data: { question, answers, image, time, responses, correct, totalPlayer },
}) {
  const { socket } = useSocketContext()
  const { player } = usePlayerContext()

  const [percentages, setPercentages] = useState([])
  const [cooldown, setCooldown] = useState(time)
  const [totalAnswer, setTotalAnswer] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)

  const [sfxPop] = useSound(SFX_ANSWERS_SOUND, {
    volume: 0.1,
  })

  const [sfxResults] = useSound(SFX_RESULTS_SOUND, {
    volume: 0.2,
  })

  const [playMusic, { stop: stopMusic, isPlaying }] = useSound(
    SFX_ANSWERS_MUSIC,
    {
      volume: 0.2,
    },
  )

  const handleAnswer = (answer) => {
    if (!player || selectedAnswer !== null) {
      return
    }

    setSelectedAnswer(answer)
    socket.emit("player:selectedAnswer", answer)
    sfxPop()
  }

  useEffect(() => {
    if (!responses) {
      playMusic()
      return
    }

    stopMusic()
    sfxResults()

    setPercentages(calculatePercentages(responses))
  }, [responses, playMusic, stopMusic, sfxResults])

  useEffect(() => {
    if (!isPlaying) {
      playMusic()
    }
  }, [isPlaying, playMusic])

  useEffect(() => {
    return () => {
      stopMusic()
    }
  }, [playMusic, stopMusic])

  useEffect(() => {
    socket.on("game:cooldown", (sec) => {
      setCooldown(sec)
    })

    socket.on("game:playerAnswer", (count) => {
      setTotalAnswer(count)
      sfxPop()
    })

    return () => {
      socket.off("game:cooldown")
      socket.off("game:playerAnswer")
    }
  }, [sfxPop, socket])

  return (
    <div className="flex h-full flex-1 flex-col justify-between w-full max-w-7xl mx-auto px-3">
      <motion.div 
        className="flex-1 flex flex-col items-center justify-center gap-5"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-center text-2xl font-bold text-white drop-shadow-lg md:text-4xl lg:text-5xl">
          {question}
        </h2>

        {!!image && !responses && (
          <motion.img 
            src={image} 
            className="h-48 max-h-60 w-auto rounded-md shadow-xl object-cover"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
        )}

        {responses && (
          <motion.div
            className={`grid w-full gap-4 grid-cols-${answers.length} mt-8 h-40 max-w-3xl px-2`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {answers.map((answer, key) => (
              <div
                key={key}
                className="flex flex-col items-center"
              >
                <motion.div
                  className={clsx(
                    "flex flex-col justify-end self-end overflow-hidden rounded-md w-full",
                    ANSWERS_COLORS[key],
                    {
                      "opacity-65 border-4 border-white": correct === key,
                    }
                  )}
                  style={{ height: percentages[key] || "0%" }}
                  initial={{ height: "0%" }}
                  animate={{ height: percentages[key] || "0%" }}
                  transition={{ duration: 1, delay: 0.2 }}
                >
                  <span className="w-full bg-black/10 text-center text-lg font-bold text-white drop-shadow-md">
                    {responses[key] || 0}
                  </span>
                </motion.div>
                <p className="mt-2 text-white text-center text-sm">{answer}</p>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <div>
        {!responses && (
          <motion.div 
            className="mx-auto mb-4 flex w-full max-w-7xl justify-between gap-1 px-2 text-lg font-bold text-white md:text-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col items-center rounded-full bg-black/40 px-4 text-lg font-bold">
              <span className="translate-y-1 text-sm">Time</span>
              <span>{cooldown}</span>
            </div>
            <div className="flex flex-col items-center rounded-full bg-black/40 px-4 text-lg font-bold">
              <span className="translate-y-1 text-sm">Answers</span>
              <span>{totalAnswer}/{totalPlayer || '?'}</span>
            </div>
          </motion.div>
        )}

        <div className="mx-auto mb-4 grid w-full max-w-7xl grid-cols-2 gap-2 px-2 text-lg font-bold text-white md:text-xl">
          {answers.map((answer, key) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: key * 0.1 }}
            >
              <AnswerButton
                className={clsx(
                  ANSWERS_COLORS[key], 
                  {
                    "opacity-65": responses && correct !== key,
                    "opacity-50 cursor-not-allowed": selectedAnswer !== null && selectedAnswer !== key,
                    "ring-4 ring-white": selectedAnswer === key,
                    "hover:brightness-110 transition-all": selectedAnswer === null
                  }
                )}
                icon={ANSWERS_ICONS[key]}
                onClick={() => handleAnswer(key)}
              >
                {answer}
              </AnswerButton>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}