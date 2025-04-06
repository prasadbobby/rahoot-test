import { usePlayerContext } from "@/context/player"
import Form from "@/components/Form"
import Button from "@/components/Button"
import Input from "@/components/Input"
import { useEffect, useState } from "react"
import { useSocketContext } from "@/context/socket"
import { useRouter } from "next/router"
import toast from "react-hot-toast"

export default function Room() {
  const router = useRouter();
  const { socket, connected } = useSocketContext()
  const { player, dispatch } = usePlayerContext()
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

    // Emit room check
    socket.emit("player:checkRoom", roomId);

    // Room check timeout
    const checkTimeout = setTimeout(() => {
      setLoading(false);
      toast.error("Room check timed out");
    }, 5000);

    // Room check handler
    const handleRoomSuccess = () => {
      clearTimeout(checkTimeout);
      
      // Emit join request
      socket.emit("player:join", { 
        gamePin: roomId, 
        username: playerUsername
      });
    };

    const handleRoomError = (message) => {
      clearTimeout(checkTimeout);
      setLoading(false);
      toast.error(message);
    };

    socket.once("game:successRoom", handleRoomSuccess);
    socket.once("game:errorMessage", handleRoomError);
  };

  // Join response handler
  useEffect(() => {
    const handleJoinResponse = (response) => {
      console.log("Join Response:", response);
      setLoading(false);

      if (response.success) {
        console.log("Join successful, dispatching player state");
        
        // Dispatch player join action with full game instance
        dispatch({ 
          type: "JOIN", 
          payload: { 
            username: response.gameInstance.players.find(p => p.username)?.username, 
            roomId: response.gameInstance.pinCode,
            gameInstance: response.gameInstance
          } 
        });

        // Navigate to play page
        router.push("/play").catch(err => {
          console.error("Navigation Error:", err);
          toast.error("Failed to navigate to game");
        });
      } else {
        toast.error(response.message || "Failed to join game");
      }
    };

    socket.on("player:join-response", handleJoinResponse);

    return () => {
      socket.off("player:join-response", handleJoinResponse);
    };
  }, [dispatch, router, socket]);

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