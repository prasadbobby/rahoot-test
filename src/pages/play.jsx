import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { usePlayerContext } from '@/context/player';
import { useSocketContext } from '@/context/socket';
import Layout from '@/components/layout/Layout';
import GameWrapper from '@/components/game/GameWrapper';
import { GAME_STATES, GAME_STATE_COMPONENTS } from '@/constants';
import { createElement, useState } from 'react';
import toast from 'react-hot-toast';
export default function Play() {
    const router = useRouter();
    const { player, dispatch } = usePlayerContext();
    const { socket, connected } = useSocketContext();
    
    const [state, setState] = useState({
      ...GAME_STATES,
      questions: player?.gameInstance?.questions || []
    });
  
    // Comprehensive logging and redirection
    useEffect(() => {
      console.group("Play Page Diagnostics");
      console.log("Player Context State:", player);
      console.log("Socket Connected:", connected);
      
      // Detailed localStorage check
      try {
        const storedPlayer = localStorage.getItem('rahootPlayer');
        console.log("Stored Player in Play Page:", storedPlayer);
      } catch (error) {
        console.error("Error accessing localStorage:", error);
      }
      
      console.groupEnd();
    }, [player, connected]);
  
    // Redirect if no player or room
    useEffect(() => {
      console.group("Play Page Redirect Check");
      console.log("Player:", player);
      console.log("Socket Connected:", connected);
      
      // More robust redirection logic
      const shouldRedirect = 
        !player || 
        !player.gameInstance || 
        !player.gameInstance.pinCode;
  
      console.log("Should Redirect:", shouldRedirect);
      console.log("Detailed Player State:", JSON.stringify(player, null, 2));
      
      if (shouldRedirect) {
        console.log("Redirecting due to incomplete player state");
        router.replace('/').catch(err => {
          console.error("Redirect Error:", err);
          window.location.href = '/';
        });
        return;
      }
      
      console.groupEnd();
    }, [player, router, connected]);
  
    // Socket event handlers
    useEffect(() => {
      if (!socket || !connected || !player?.gameInstance) return;
  
      console.log("Setting up socket listeners for game");
  
      socket.on("game:status", (status) => {
        console.log("Received game status:", status);
        setState(prevState => ({
          ...prevState,
          status: status,
          questions: player?.gameInstance?.questions || []
        }));
        
        // If game is finished, reset room
        if (status.name === "SHOW_FINAL_RESULTS") {
          dispatch({ type: "RESET_ROOM" });
        }
      });
  
      socket.on("game:reset", () => {
        console.log("Game reset received");
        router.replace("/");
        dispatch({ type: "RESET_ROOM" });
        setState(GAME_STATES);
        toast.info("The game has been reset by the host");
      });
  
      return () => {
        socket.off("game:status");
        socket.off("game:reset");
      };
    }, [socket, connected, dispatch, router, player]);
  
    // Prevent rendering if no game instance
    if (!player?.gameInstance?.pinCode) {
      console.log("No game instance, rendering null");
      return null;
    }
  
    return (
      <Layout title="Game" showHeader={false} showFooter={false}>
        <GameWrapper>
          {GAME_STATE_COMPONENTS[state.status.name] &&
            createElement(GAME_STATE_COMPONENTS[state.status.name], {
              data: {
                ...state.status.data,
                questions: player?.gameInstance?.questions || []
              },
            })}
        </GameWrapper>
      </Layout>
    );
  }