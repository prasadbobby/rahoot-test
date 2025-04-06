// src/context/player.jsx
import { createContext, useContext, useReducer, useEffect } from "react";

// Create context
const PlayerContext = createContext();

// Reducer
export function playerReducer(state, action) {
  switch (action.type) {
    case "JOIN":
      return { player: { ...state.player, room: action.payload } };
    case "LOGIN":
      return {
        player: {
          ...state.player,
          username: action.payload,
          points: 0,
        },
      };
    case "UPDATE":
      return { player: { ...state.player, ...action.payload } };
    case "LOGOUT":
      return { player: null };
    case "RESET_ROOM":
      return { 
        player: state.player ? { 
          ...state.player, 
          room: null,
          points: 0 
        } : null 
      };
    default:
      return state;
  }
}

// Provider
export function PlayerContextProvider({ children }) {
  // Initialize with empty state
  const [state, dispatch] = useReducer(playerReducer, {
    player: null,
  });
  
  // Load from localStorage only on client-side
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedPlayer = localStorage.getItem('rahootPlayer');
        if (savedPlayer) {
          const parsedPlayer = JSON.parse(savedPlayer);
          dispatch({ type: 'UPDATE', payload: parsedPlayer });
        }
      }
    } catch (error) {
      console.error("Error loading player from localStorage:", error);
    }
  }, []);
  
  // Save to localStorage when state changes (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (state.player) {
        try {
          localStorage.setItem('rahootPlayer', JSON.stringify(state.player));
        } catch (error) {
          console.error("Error saving to localStorage:", error);
        }
      } else {
        try {
          localStorage.removeItem('rahootPlayer');
        } catch (error) {
          console.error("Error removing from localStorage:", error);
        }
      }
    }
  }, [state.player]);

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

// Hook
export function usePlayerContext() {
  const context = useContext(PlayerContext);
  
  if (context === undefined) {
    throw new Error("usePlayerContext must be used inside a PlayerContextProvider");
  }
  
  return context;
}