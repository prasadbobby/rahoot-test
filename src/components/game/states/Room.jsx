// src/components/game/states/Room.jsx
import { useSocketContext } from "@/context/socket"
import { useEffect, useState } from "react"

export default function Room({ data: { text, inviteCode } }) {
  const { socket } = useSocketContext()
  const [playerList, setPlayerList] = useState([])

  // Directly log all events to help debug
  useEffect(() => {
    console.log("Room component mounted with inviteCode:", inviteCode);
    
    const handleNewPlayer = (player) => {
      console.log("Room: New player joined:", player);
      setPlayerList(prev => {
        // Check if player already exists to avoid duplicates
        if (prev.some(p => p.id === player.id)) {
          return prev;
        }
        return [...prev, player];
      });
    };
    
    const handleRemovePlayer = (playerId) => {
      console.log("Room: Player removed:", playerId);
      setPlayerList(prev => prev.filter(p => p.id !== playerId));
    };
    
    // Set up event listeners
    socket.on("manager:newPlayer", handleNewPlayer);
    socket.on("manager:removePlayer", handleRemovePlayer);
    socket.on("manager:playerKicked", handleRemovePlayer);
    
    // Request current players
    socket.emit("manager:getPlayers");
    
    return () => {
      socket.off("manager:newPlayer", handleNewPlayer);
      socket.off("manager:removePlayer", handleRemovePlayer);
      socket.off("manager:playerKicked", handleRemovePlayer);
    };
  }, [socket, inviteCode]);

  const kickPlayer = (playerId) => {
    console.log("Kicking player:", playerId);
    socket.emit("manager:kickPlayer", playerId);
  };

  return (
    <section className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-2">
      <div className="mb-10 rotate-3 rounded-md bg-white px-6 py-4 text-6xl font-extrabold">
        {inviteCode}
      </div>

      <h2 className="mb-4 text-4xl font-bold text-white drop-shadow-lg">
        {text}
      </h2>
      
      <div className="mb-4 text-white">
        Player count: {playerList.length}
      </div>

      <div className="flex flex-wrap gap-3">
        {playerList.map((player) => (
          <div
            key={player.id}
            className="shadow-inset rounded-md bg-primary px-4 py-3 font-bold text-white"
            onClick={() => kickPlayer(player.id)}
          >
            <span className="cursor-pointer text-xl drop-shadow-md hover:line-through">
              {player.username}
            </span>
          </div>
        ))}
        
        {playerList.length === 0 && (
          <div className="text-white opacity-70 text-center">
            No players have joined yet. Share the PIN with your players!
          </div>
        )}
      </div>
    </section>
  );
}