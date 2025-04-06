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

  const { socket } = useSocketContext()
  const { player, dispatch } = usePlayerContext()

  useEffect(() => {
    if (!player) {
      router.replace("/")
    }
  }, [player, router])

  const [state, setState] = useState(GAME_STATES)

  useEffect(() => {
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

      dispatch({ type: "LOGOUT" })
      setState(GAME_STATES)

      toast("The game has been reset by the host")
    })

    return () => {
      socket.off("game:status")
      socket.off("game:reset")
    }
  }, [state, dispatch, router, socket])

  return (
    <GameWrapper>
      {GAME_STATE_COMPONENTS[state.status.name] &&
        createElement(GAME_STATE_COMPONENTS[state.status.name], {
          data: state.status.data,
        })}
    </GameWrapper>
  )
}