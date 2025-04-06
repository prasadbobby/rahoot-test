// src/components/game/join/Username.jsx
import { usePlayerContext } from "@/context/player"
import Form from "@/components/Form"
import Button from "@/components/Button"
import Input from "@/components/Input"
import { useEffect, useState } from "react"
import { useSocketContext } from "@/context/socket"
import { useRouter } from "next/router"

export default function Username() {
  const { socket } = useSocketContext()
  const { player, dispatch } = usePlayerContext()
  const router = useRouter()
  const [username, setUsername] = useState("")
  
  // Load username from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined' && player?.username) {
      setUsername(player.username)
    }
  }, [player])

  const handleJoin = () => {
    if (!username.trim()) return
    socket.emit("player:join", { username: username, room: player.room })
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleJoin()
    }
  }

  useEffect(() => {
    socket.on("game:successJoin", () => {
      dispatch({
        type: "LOGIN",
        payload: username,
      })

      router.replace("/game")
    })

    return () => {
      socket.off("game:successJoin")
    }
  }, [username, dispatch, router, socket])

  return (
    <Form>
      <h2 className="text-xl font-bold text-center mb-2">Enter Your Name</h2>
      <Input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Username here"
        className="w-full z-20 relative"
        autoFocus
      />
      <Button 
        onClick={handleJoin}
        className="transition-all hover:bg-primary-dark"
      >
        Join Game
      </Button>
    </Form>
  )
}