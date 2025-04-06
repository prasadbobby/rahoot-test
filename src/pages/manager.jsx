// src/pages/manager.jsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import GameWrapper from "@/components/game/GameWrapper"
import ManagerPassword from "@/components/ManagerPassword"
import { GAME_STATES, GAME_STATE_COMPONENTS_MANAGER } from "@/constants"
import { useSocketContext } from "@/context/socket"
import { createElement } from "react"
import toast from "react-hot-toast"

export default function Manager() {
  const router = useRouter();
  const { socket, connected, reconnect } = useSocketContext();
  const [nextText, setNextText] = useState("Start");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState({
    ...GAME_STATES,
    status: {
      ...GAME_STATES.status,
      name: "WAIT",
      data: { text: "Initializing game..." }
    },
    created: false
  });
  const [gamePin, setGamePin] = useState(null);

  useEffect(() => {
    if (!socket || !connected) return;
    
    // Set up event listeners
    const handleInviteCode = (inviteCode) => {
      console.log("Received room invite code:", inviteCode);
      setLoading(false);
      setGamePin(inviteCode);
      
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
        setNextText("Start Game");
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
    
    const handleHostError = (error) => {
      setLoading(false);
      toast.error(error);
    };
    
    socket.on("manager:inviteCode", handleInviteCode);
    socket.on("manager:hostingRoom", handleInviteCode);
    socket.on("game:status", handleGameStatus);
    socket.on("game:errorMessage", handleHostError);
    socket.on("manager:hostError", handleHostError);
    
    return () => {
      socket.off("manager:inviteCode", handleInviteCode);
      socket.off("manager:hostingRoom", handleInviteCode);
      socket.off("game:status", handleGameStatus);
      socket.off("game:errorMessage", handleHostError);
      socket.off("manager:hostError", handleHostError);
    };
  }, [socket, connected]);

  const handleCreate = () => {
    if (state.created) {
      toast.info(`Game room already created with PIN: ${gamePin}`);
      return;
    }
    
    if (!connected) {
      toast.error("Not connected to game server");
      reconnect && reconnect();
      return;
    }
    
    setLoading(true);
    
    // Generate a random PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Emit host request
    socket.emit("manager:hostRoom", { 
      pin,
      token: localStorage.getItem('rahootAuthToken') || "anonymous"
    });
    
    // Set a timeout for no response
    setTimeout(() => {
      if (loading) {
        setLoading(false);
        toast.error("Request timed out. Please try again.");
      }
    }, 5000);
  };

  const handleAction = () => {
    if (!connected) {
      toast.error("Not connected to game server");
      reconnect && reconnect();
      return;
    }
    
    console.log("Action button clicked, current state:", state.status.name);
    
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
        socket.emit("manager:resetGame");
        setState({
          ...GAME_STATES,
          status: {
            ...GAME_STATES.status,
            name: "WAIT",
            data: { text: "Resetting game..." }
          },
          created: false
        });
        setGamePin(null);
        setTimeout(() => {
          handleCreate();
        }, 1000);
        break;
        
      default:
        toast.info("No action available");
        break;
    }
  };

  // Show reconnection UI if disconnected
  if (!connected && gamePin) {
    return (
      <section className="relative flex min-h-screen flex-col items-center justify-center">
        <div className="absolute h-full w-full overflow-hidden">
          <div className="absolute -left-[15vmin] -top-[15vmin] min-h-[75vmin] min-w-[75vmin] rounded-full bg-primary/15"></div>
          <div className="absolute -bottom-[15vmin] -right-[15vmin] min-h-[75vmin] min-w-[75vmin] rotate-45 bg-primary/15"></div>
        </div>

        <div className="z-10 flex w-full max-w-80 flex-col gap-4 rounded-lg bg-white p-6 shadow-card">
          <h2 className="text-xl font-bold text-center mb-2">Connection Error</h2>
          <p className="text-gray-600 text-center mb-4">
            Lost connection to game server. Your current game PIN is: {gamePin}
          </p>
          <button 
            onClick={reconnect}
            className="btn-shadow rounded-md bg-primary p-2 text-lg font-semibold text-white transition-all hover:bg-primary-dark"
          >
            <span>Reconnect</span>
          </button>
          <button
            onClick={() => router.push('/')}
            className="btn-shadow rounded-md bg-gray-200 p-2 text-lg font-semibold text-gray-700 transition-all hover:bg-gray-300"
          >
            <span>Return Home</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      {!state.created ? (
        <ManagerPassword onSubmit={handleCreate} loading={loading} />
      ) : (
        <GameWrapper textNext={nextText} onNext={handleAction} manager>
          {GAME_STATE_COMPONENTS_MANAGER[state.status.name] &&
            createElement(GAME_STATE_COMPONENTS_MANAGER[state.status.name], {
              data: state.status.data,
            })}
        </GameWrapper>
      )}
    </>
  );
}