import { createContext, useContext, useReducer, useEffect } from "react";
import { toast } from "react-hot-toast";

const PlayerContext = createContext();

export function playerReducer(state, action) {
  console.group("Player Reducer");
  console.log("Action Type:", action.type);
  console.log("Payload:", action.payload);

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
      
      console.log("New Player State:", newState);
      
      // Persist to localStorage
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('rahootPlayer', JSON.stringify(newState.player));
        }
      } catch (error) {
        console.error("Error saving player to localStorage:", error);
      }
      
      console.groupEnd();
      return newState;
    
    // Other cases remain the same
    default:
      console.groupEnd();
      return state;
  }
}
export function PlayerContextProvider({ children }) {
  const initialState = { 
    player: null 
  };

  const [state, dispatch] = useReducer(playerReducer, initialState);
  
  // Load player from localStorage on client-side
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedPlayer = localStorage.getItem('rahootPlayer');
        console.log("Stored Player Raw:", storedPlayer);
        
        if (storedPlayer) {
          try {
            const parsedPlayer = JSON.parse(storedPlayer);
            console.log("Parsed Player:", parsedPlayer);
            
            // More robust state restoration
            if (parsedPlayer.gameInstance && parsedPlayer.gameInstance.pinCode) {
              dispatch({ 
                type: "JOIN", 
                payload: {
                  username: parsedPlayer.username,
                  roomId: parsedPlayer.gameInstance.pinCode,
                  gameInstance: parsedPlayer.gameInstance
                }
              });
            }
          } catch (parseError) {
            console.error("Error parsing stored player:", parseError);
            localStorage.removeItem('rahootPlayer');
          }
        }
      }
    } catch (error) {
      console.error("Error loading player from localStorage:", error);
    }
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        dispatch,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}
export function usePlayerContext() {
  const context = useContext(PlayerContext);
  
  if (context === undefined) {
    throw new Error("usePlayerContext must be used inside a PlayerContextProvider");
  }
  
  return context;
}