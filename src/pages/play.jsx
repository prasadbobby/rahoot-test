// src/pages/play.jsx
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

  const [loading, setLoading] = useState(true);

  // Diagnostic logging
  useEffect(() => {
    console.group("Play Page Initialization");
    console.log("Player Context:", player);
    console.log("Socket Connected:", connected);
    console.log("Has socket object:", !!socket);
    console.log("Game room:", player?.room || player?.gameInstance?.pinCode);
    console.groupEnd();

    // Allow a moment for everything to initialize
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [player, connected, socket]);

  // Redirect if no player info is available
  useEffect(() => {
    if (loading) return;

    if (!player || !player.room) {
      console.log("No player info, redirecting to home");
      router.replace("/");
    }
  }, [player, router, loading]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !connected || !player) return;

    console.log("Setting up socket listeners for play page");

    // Listen for game status updates
    socket.on("game:status", (status) => {
      console.log("Received game status:", status.name);
      setState(prevState => ({
        ...prevState,
        status: status,
        questions: player?.gameInstance?.questions || []
      }));
    });

    // Listen for game reset
    socket.on("game:reset", () => {
      console.log("Game was reset by host");
      toast.info("The game has been reset by the host");
      dispatch({ type: "LOGOUT" });
      router.replace("/");
    });

    // Handle being kicked
    socket.on("game:kick", () => {
      console.log("Player was kicked");
      toast.error("You have been removed from the game");
      dispatch({ type: "LOGOUT" });
      router.replace("/");
    });

    return () => {
      socket.off("game:status");
      socket.off("game:reset");
      socket.off("game:kick");
    };
  }, [socket, connected, player, dispatch, router]);

  if (loading) {
    return (
      <Layout title="Loading Game" showHeader={false} showFooter={false}>
        <div className="flex flex-col items-center justify-center min-h-screen bg-primary/10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-700 font-medium">Connecting to game...</p>
        </div>
      </Layout>
    );
  }

  if (!player) {
    return null; // Will redirect via useEffect
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