// src/components/game/join/Room.jsx
import { usePlayerContext } from "@/context/player"
import Form from "@/components/Form"
import Button from "@/components/Button"
import Input from "@/components/Input"
import { useState } from "react"
import { useSocketContext } from "@/context/socket"
import { useRouter } from "next/router"
import toast from "react-hot-toast"

export default function Room() {
  const router = useRouter();
  const { socket, connected } = useSocketContext()
  const { dispatch } = usePlayerContext()
  const [roomId, setRoomId] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = () => {
    if (!roomId.trim()) {
      toast.error("Please enter a game PIN");
      return;
    }

    const playerUsername = username.trim() || `Player-${Math.floor(Math.random() * 1000)}`;

    if (!connected) {
      toast.error("Socket connection lost. Please refresh.");
      return;
    }

    console.log("Attempting to join room:", roomId);
    setLoading(true);

    // First check if room exists
    socket.emit("player:checkRoom", roomId);

    // Set up event handlers
    const checkTimeout = setTimeout(() => {
      setLoading(false);
      toast.error("No response from server");
      cleanup();
    }, 5000);

    function cleanup() {
      clearTimeout(checkTimeout);
      socket.off("game:successRoom");
      socket.off("game:errorMessage");
      socket.off("game:successJoin");
      socket.off("player:join-response");
    }

    // Room check handler
    socket.once("game:successRoom", () => {
      console.log("Room exists, attempting to join");
      
      // Room exists, now try to join
      socket.emit("player:join", { 
        username: playerUsername, 
        room: roomId,
        gamePin: roomId // Add both formats to be safe
      });
      
      // Listen for successful join
      socket.once("game:successJoin", () => {
        cleanup();
        console.log("Successfully joined room");
        
        dispatch({
          type: "JOIN",
          payload: {
            username: playerUsername,
            roomId: roomId,
            gameInstance: { pinCode: roomId }
          }
        });
        
        setLoading(false);
        router.push("/play");
      });
      
      // Listen for server response (newer format)
      socket.once("player:join-response", (response) => {
        cleanup();
        console.log("Join response:", response);
        setLoading(false);
        
        if (response.success) {
          dispatch({
            type: "JOIN",
            payload: {
              username: playerUsername,
              roomId: roomId,
              gameInstance: response.gameInstance
            }
          });
          
          router.push("/play");
        } else {
          toast.error(response.message || "Failed to join game");
        }
      });
    });

    // Error handler
    socket.once("game:errorMessage", (message) => {
      cleanup();
      setLoading(false);
      toast.error(message);
    });
  };

  return (
    <Form className="max-w-96">
      <h2 className="text-xl font-bold text-center mb-2">Join a Game</h2>
      <Input
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="Enter game PIN"
        className="text-center text-2xl tracking-wider w-full z-20 relative" 
        maxLength={6}
        autoFocus
      />
      <Input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter your username (optional)"
        className="text-center text-xl tracking-wider w-full z-20 relative mt-4" 
        maxLength={20}
      />
      <Button 
        onClick={handleLogin}
        className={`transition-all hover:bg-primary-dark mt-4 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        disabled={loading}
      >
        {loading ? "Joining..." : "Join Game"}
      </Button>
    </Form>
  );
}