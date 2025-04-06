// src/components/game/join/Room.jsx
import { usePlayerContext } from "@/context/player"
import Form from "@/components/Form"
import Button from "@/components/Button"
import Input from "@/components/Input"
import { useEffect, useState } from "react"
import { socket } from "@/context/socket"
import { motion } from "framer-motion"

export default function Room() {
  const { player, dispatch } = usePlayerContext()
  const [roomId, setRoomId] = useState("")
  const [recentGames, setRecentGames] = useState([])
  
  useEffect(() => {
    // Load recent games from localStorage (client-side only)
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('rahootRecentGames')
        if (saved) {
          setRecentGames(JSON.parse(saved))
        }
      }
    } catch (error) {
      console.error("Error loading recent games:", error)
    }
  }, [])

  const handleLogin = () => {
    if (!roomId.trim()) return
    socket.emit("player:checkRoom", roomId)
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleLogin()
    }
  }

  useEffect(() => {
    socket.on("game:successRoom", (roomId) => {
      // Save to recent games (client-side only)
      try {
        if (typeof window !== 'undefined') {
          const timestamp = new Date().toISOString()
          const updatedGames = [
            { roomId, timestamp },
            ...recentGames.filter(g => g.roomId !== roomId)
          ].slice(0, 5)
          
          localStorage.setItem('rahootRecentGames', JSON.stringify(updatedGames))
        }
      } catch (error) {
        console.error("Error saving to localStorage:", error)
      }
      
      dispatch({ type: "JOIN", payload: roomId })
    })

    return () => {
      socket.off("game:successRoom")
    }
  }, [dispatch, recentGames])

  return (
    <Form className="max-w-96">
      <h2 className="text-xl font-bold text-center mb-2">Join a Game</h2>
      <Input
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter game PIN"
        className="text-center text-2xl tracking-wider w-full z-20 relative" 
        maxLength={6}
        autoFocus
      />
      <Button 
        onClick={handleLogin}
        className="transition-all hover:bg-primary-dark"
      >
        Enter
      </Button>
      
      {recentGames.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Recent Games</h3>
          <div className="space-y-2">
            {recentGames.map((game, index) => (
              <button
                key={game.roomId}
                className="w-full px-3 py-2 text-left bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                onClick={() => {
                  setRoomId(game.roomId)
                  setTimeout(() => handleLogin(), 100)
                }}
              >
                <div className="font-bold">{game.roomId}</div>
                <div className="text-xs text-gray-500">
                  {new Date(game.timestamp).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </Form>
  )
}