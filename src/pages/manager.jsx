// src/pages/manager.jsx
import Button from "@/components/Button"
import GameWrapper from "@/components/game/GameWrapper"
import ManagerPassword from "@/components/ManagerPassword"
import { GAME_STATES, GAME_STATE_COMPONENTS_MANAGER } from "@/constants"
import { useSocketContext } from "@/context/socket"
import { createElement, useEffect, useState } from "react"
import toast from "react-hot-toast"

export default function Manager() {
  const { socket, connected, reconnect } = useSocketContext()
  const [nextText, setNextText] = useState("Start")
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState({
    ...GAME_STATES,
    status: {
      ...GAME_STATES.status,
      name: "SHOW_ROOM",
    },
    created: false
  })

  useEffect(() => {
    if (!socket) return;
    
    // Listen for invite code
    const handleInviteCode = (inviteCode) => {
      console.log("Received room invite code:", inviteCode);
      setLoading(false);
      
      // Update state with room information
      setState(prevState => ({
        ...prevState,
        created: true,
        status: {
          name: "SHOW_ROOM",
          data: {
            text: "Waiting for players to join...",
            inviteCode: inviteCode
          }
        }
      }));
      
      toast.success(`Game room created with PIN: ${inviteCode}`);
    };
    
    // Listen for game status updates
    const handleGameStatus = (status) => {
      console.log("Received game status:", status.name);
      
      setState(prevState => ({
        ...prevState,
        status: status,
        question: {
          ...prevState.question,
          current: status.question,
        },
      }));
      
      // Update next button text based on game state
      if (status.name === "SHOW_ROOM") {
        setNextText("Start");
      } else if (status.name === "SELECT_ANSWER") {
        setNextText("Skip");
      } else if (status.name === "SHOW_RESPONSES") {
        setNextText("Show Leaderboard");
      } else if (status.name === "SHOW_LEADERBOARD") {
        setNextText("Next Question");
      } else if (status.name === "FINISH") {
        setNextText("New Game");
      }
    };
    
    // Handle errors
    const handleError = (message) => {
      console.error("Game error:", message);
      toast.error(message);
      setLoading(false);
    };
    
    // Handle connection events to maintain game state
    const handleConnect = () => {
      console.log("Socket connected or reconnected");
      // If we were previously in a game but got disconnected, try to rejoin
      if (state.created && state.status.data?.inviteCode) {
        console.log("Attempting to rejoin room:", state.status.data.inviteCode);
        toast("Reconnected. Attempting to restore game session...", {
          icon: '🔄',
        });
      }
    };
    
    // Set up event listeners
    socket.on("connect", handleConnect);
    socket.on("manager:inviteCode", handleInviteCode);
    socket.on("game:status", handleGameStatus);
    socket.on("game:errorMessage", handleError);
    
    // Clean up on unmount
    return () => {
      socket.off("connect", handleConnect);
      socket.off("manager:inviteCode", handleInviteCode);
      socket.off("game:status", handleGameStatus);
      socket.off("game:errorMessage", handleError);
    };
  }, [socket, state.created]);

  // Check if connection is lost and show reconnection option
  useEffect(() => {
    if (!connected && state.created) {
      toast.error("Connection to server lost. Game management may be affected.");
    }
  }, [connected, state.created]);

  const handleCreate = () => {
    // Check if already created to prevent duplicate requests
    if (state.created) {
      toast(`Game room already created with PIN: ${state.status.data?.inviteCode}`, {
        icon: 'ℹ️',
      });
      return;
    }
    
    if (!connected) {
      toast.error("Not connected to game server");
      reconnect && reconnect();
      return;
    }
    
    setLoading(true);
    
    console.log("Emitting manager:createRoom event");
    socket.emit("manager:createRoom", localStorage.getItem('rahootAuthToken') || "anonymous");
    
    // Set a timeout in case of no response
    setTimeout(() => {
      setLoading((isStillLoading) => {
        if (isStillLoading) {
          toast.error("Request timed out. Please try again.");
          return false;
        }
        return isStillLoading;
      });
    }, 5000);
  };

  const handleSkip = () => {
    if (!connected) {
      toast.error("Not connected to game server");
      reconnect && reconnect();
      return;
    }
    
    console.log("Skip button clicked, current state:", state.status.name);
    
    switch (state.status.name) {
      case "SHOW_ROOM":
        socket.emit("manager:startGame");
        break;

      case "SELECT_ANSWER":
        socket.emit("manager:abortQuiz");
        break;

      case "SHOW_RESPONSES":
        socket.emit("manager:showLeaderboard");
        break;

      case "SHOW_LEADERBOARD":
        socket.emit("manager:nextQuestion");
        break;
        
      case "FINISH":
        // Reset the game and create a new room
        socket.emit("manager:resetGame");
        setTimeout(() => {
          handleCreate();
        }, 1000);
        break;
    }
    
    toast.success("Action processed");
  }

  // Show reconnection UI if disconnected
  if (!connected && !state.created) {
    return (
      <section className="relative flex min-h-screen flex-col items-center justify-center">
        <div className="absolute h-full w-full overflow-hidden">
          <div className="absolute -left-[15vmin] -top-[15vmin] min-h-[75vmin] min-w-[75vmin] rounded-full bg-primary/15"></div>
          <div className="absolute -bottom-[15vmin] -right-[15vmin] min-h-[75vmin] min-w-[75vmin] rotate-45 bg-primary/15"></div>
        </div>

        <div className="z-10 flex w-full max-w-80 flex-col gap-4 rounded-lg bg-white p-6 shadow-card">
          <h2 className="text-xl font-bold text-center mb-2">Connection Error</h2>
          <p className="text-gray-600 text-center mb-4">
            Cannot connect to game server. Please check your network connection.
          </p>
          <Button onClick={reconnect}>
            Reconnect
          </Button>
        </div>
      </section>
    );
  }

  return (
    <>
      {!state.created ? (
        <div>
          <ManagerPassword onSubmit={handleCreate} loading={loading} />
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