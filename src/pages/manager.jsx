// src/pages/manager.jsx
import Button from "@/components/Button"
import GameWrapper from "@/components/game/GameWrapper"
import ManagerPassword from "@/components/ManagerPassword"
import { GAME_STATES, GAME_STATE_COMPONENTS_MANAGER } from "@/constants"
import { useSocketContext } from "@/context/socket"
import { createElement, useEffect, useState } from "react"
import toast from "react-hot-toast"

export default function Manager() {
  const { socket } = useSocketContext()

  const [nextText, setNextText] = useState("Start")
  const [state, setState] = useState({
    ...GAME_STATES,
    status: {
      ...GAME_STATES.status,
      name: "SHOW_ROOM",
    },
  })

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

      // Update next button text based on game state
      if (status.name === "SHOW_ROOM") {
        setNextText("Start")
      } else if (status.name === "SELECT_ANSWER") {
        setNextText("Skip")
      } else if (status.name === "SHOW_RESPONSES") {
        setNextText("Show Leaderboard")
      } else if (status.name === "SHOW_LEADERBOARD") {
        setNextText("Next Question")
      } else if (status.name === "FINISH") {
        setNextText("New Game")
      }
    })

    socket.on("manager:inviteCode", (inviteCode) => {
      setState({
        ...state,
        created: true,
        status: {
          ...state.status,
          data: {
            ...state.status.data,
            inviteCode: inviteCode,
          },
        },
      })
    })

    return () => {
      socket.off("game:status")
      socket.off("manager:inviteCode")
    }
  }, [state, socket])

  const handleCreate = () => {
    socket.emit("manager:createRoom")
  }

  const handleSkip = () => {
    console.log("Skip button clicked, current state:", state.status.name)
    
    switch (state.status.name) {
      case "SHOW_ROOM":
        socket.emit("manager:startGame")
        break

      case "SELECT_ANSWER":
        socket.emit("manager:abortQuiz")
        break

      case "SHOW_RESPONSES":
        socket.emit("manager:showLeaderboard")
        break

      case "SHOW_LEADERBOARD":
        socket.emit("manager:nextQuestion")
        break
        
      case "FINISH":
        // Reset the game and create a new room
        socket.emit("manager:resetGame")
        socket.emit("manager:createRoom", "PASSWORD") // Use the default password
        setState({
          ...GAME_STATES,
          status: {
            ...GAME_STATES.status,
            name: "SHOW_ROOM",
          }
        })
        break
    }
    
    toast.success("Action processed")
  }

  return (
    <>
      {!state.created ? (
        <div>
          <ManagerPassword />
        </div>
      ) : (
        <>
          <GameWrapper textNext={nextText} onNext={handleSkip} manager>
            {GAME_STATE_COMPONENTS_MANAGER[state.status.name] &&
              createElement(GAME_STATE_COMPONENTS_MANAGER[state.status.name], {
                data: state.status.data,
              })}
          </GameWrapper>
        </>
      )}
    </>
  )
}