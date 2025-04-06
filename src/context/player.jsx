// src/context/player.jsx
import { createContext, useContext, useReducer, useEffect } from "react";
import { toast } from "react-hot-toast";

const PlayerContext = createContext();

export function playerReducer(state, action) {
  console.log("Player Action:", action.type, action.payload);

  switch (action.type) {
    case "JOIN":
      const newState = { 
        player: { 
          username: action.payload.username,
          room: action.payload.roomId,
          gameInstance: action.payload.gameInstance,
          points: 0
        }
      };
      
      // Persist to localStorage
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('rahootPlayer', JSON.stringify(newState.player));
        }
      } catch (error) {
        console.error("Error saving player:", error);
      }
      
      return newState;
    
    case "UPDATE":
      if (!state.player) return state;
      
      const updatedPlayer = {
        ...state.player,
        ...action.payload
      };
      
      // Update localStorage
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('rahootPlayer', JSON.stringify(updatedPlayer));
        }
      } catch (error) {
        console.error("Error updating player:", error);
      }
      
      return { player: updatedPlayer };
    
    case "LOGOUT":
      // Clear localStorage
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('rahootPlayer');
        }
      } catch (error) {
        console.error("Error removing player:", error);
      }
      
      return { player: null };
    
    default:
      return state;
  }
}

export function PlayerContextProvider({ children }) {
  const initialState = { player: null };
  const [state, dispatch] = useReducer(playerReducer, initialState);
  
  // Load player from localStorage on client-side
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedPlayer = localStorage.getItem('rahootPlayer');
        console.log("Loading stored player:", storedPlayer);
        
        if (storedPlayer) {
          try {
            const parsedPlayer = JSON.parse(storedPlayer);
            
            if (parsedPlayer) {
              dispatch({ 
                type: "JOIN", 
                payload: {
                  username: parsedPlayer.username,
                  roomId: parsedPlayer.room || parsedPlayer.gameInstance?.pinCode,
                  gameInstance: parsedPlayer.gameInstance
                }
              });
            }
          } catch (error) {
            console.error("Error parsing stored player:", error);
            localStorage.removeItem('rahootPlayer');
          }
        }
      }
    } catch (error) {
      console.error("Error loading player:", error);
    }
  }, []);

  return (
    <PlayerContext.Provider value={{ ...state, dispatch }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayerContext() {
  const context = useContext(PlayerContext);
  
  if (context === undefined) {
    throw new Error("usePlayerContext must be used within a PlayerContextProvider");
  }
  
  return context;
}