// src/pages/game.jsx
import GameWrapper from "@/components/game/GameWrapper"
import { GAME_STATES, GAME_STATE_COMPONENTS } from "@/constants"
import { usePlayerContext } from "@/context/player"
import { useSocketContext } from "@/context/socket"
import { useRouter } from "next/router"
import { createElement, useEffect, useState } from "react"
import toast from "react-hot-toast"

export default function Game() {
  const router = useRouter()
  const { socket, connected } = useSocketContext()
  const { player, dispatch } = usePlayerContext()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!player) {
      router.replace("/")
      return
    }
    
    // Add a small delay to ensure the socket is ready
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [player, router])

  const [state, setState] = useState(GAME_STATES)

  useEffect(() => {
    if (!socket || !connected) return;
    
    socket.on("game:status", (status) => {
      setState({
        ...state,
        status: status,
        question: {
          ...state.question,
          current: status.question,
        },
      })
      
      // If the game is finished, reset the room (but keep username)
      if (status.name === "SHOW_FINAL_RESULTS") {
        dispatch({ type: "RESET_ROOM" })
      }
    })

    socket.on("game:reset", () => {
      router.replace("/")
      dispatch({ type: "RESET_ROOM" })
      setState(GAME_STATES)
      toast.info("The game has been reset by the host")
    })

    return () => {
      socket.off("game:status")
      socket.off("game:reset")
    }
  }, [state, dispatch, router, socket, connected])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Connecting to game...</h2>
        </div>
      </div>
    );
  }

  return (
    <GameWrapper>
      {GAME_STATE_COMPONENTS[state.status.name] &&
        createElement(GAME_STATE_COMPONENTS[state.status.name], {
          data: state.status.data,
        })}
    </GameWrapper>
  )
}