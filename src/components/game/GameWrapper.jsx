// src/components/game/GameWrapper.jsx
import Image from "next/image"
import Button from "@/components/Button"
import background from "@/assets/background.webp"
import { usePlayerContext } from "@/context/player"
import { useSocketContext } from "@/context/socket"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { motion } from "framer-motion"
import clsx from "clsx"

export default function GameWrapper({ children, textNext, onNext, manager }) {
  const { socket } = useSocketContext()
  const { player, dispatch } = usePlayerContext()
  const router = useRouter()

  const [questionState, setQuestionState] = useState()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    socket.on("game:kick", () => {
      dispatch({
        type: "LOGOUT",
      })

      router.replace("/")
    })

    socket.on("game:updateQuestion", ({ current, total }) => {
      setQuestionState({
        current,
        total,
      })
    })

    return () => {
      socket.off("game:kick")
      socket.off("game:updateQuestion")
    }
  }, [dispatch, router, socket])

  const handleNextClick = () => {
    setIsLoading(true)
    onNext()
    setTimeout(() => setIsLoading(false), 1000)
  }

  return (
    <section className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden">
      <div className="fixed left-0 top-0 -z-10 h-full w-full bg-orange-600 opacity-70">
        <Image
          className="pointer-events-none h-full w-full object-cover opacity-60"
          src={background}
          alt="background"
          priority
        />
      </div>

      <div className="flex w-full justify-between p-4">
        {questionState && (
          <motion.div 
            className="shadow-inset flex items-center rounded-md bg-white p-2 px-4 text-lg font-bold text-black"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {`${questionState.current} / ${questionState.total}`}
          </motion.div>
        )}

        {manager && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button
              className={clsx(
                "self-end bg-white px-4 !text-black transition-all",
                isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"
              )}
              onClick={handleNextClick}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : textNext}
            </Button>
          </motion.div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center">
        {children}
      </div>

      {!manager && player && (
        <motion.div 
          className="z-50 flex items-center justify-between bg-white px-4 py-2 text-lg font-bold text-white"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-gray-800">{player.username}</p>
          <div className="rounded-sm bg-primary px-3 py-1 text-lg">
            {player.points || 0}
          </div>
        </motion.div>
      )}
    </section>
  )
}