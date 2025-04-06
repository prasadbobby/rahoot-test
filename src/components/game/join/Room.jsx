// src/components/game/join/Room.jsx
import { usePlayerContext } from "@/context/player"
import Form from "@/components/Form"
import Button from "@/components/Button"
import Input from "@/components/Input"
import { useEffect, useState } from "react"
import { socket } from "@/context/socket"
import { motion } from "framer-motion"
import toast from "react-hot-toast"

export default function Room() {
  const { player, dispatch } = usePlayerContext()
  const [roomId, setRoomId] = useState("")
  const [recentGames, setRecentGames] = useState([])
  const [loading, setLoading] = useState(false)
  
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
    if (!roomId.trim()) {
      toast.error("Please enter a room ID")
      return
    }
    
    setLoading(true)
    socket.emit("player:checkRoom", roomId)
    
    // Set a timeout to handle no response
    setTimeout(() => {
      setLoading(false)
    }, 5000)
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleLogin()
    }
  }

  useEffect(() => {
    socket.on("game:successRoom", (roomId) => {
      setLoading(false)
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
    
    socket.on("game:errorMessage", (message) => {
      setLoading(false)
      toast.error(message)
    })

    return () => {
      socket.off("game:successRoom")
      socket.off("game:errorMessage")
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
        className={`transition-all hover:bg-primary-dark ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Checking...
          </span>
        ) : "Enter"}
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