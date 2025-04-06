// src/context/socket.jsx
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-hot-toast';

// Create context
const SocketContext = createContext();

// Export the socket directly so it can be imported elsewhere
export let socket = null;

// Define the socket URL - adjust based on your environment
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5505';

// Provider
export function SocketContextProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const socketRef = useRef(null);
  
  useEffect(() => {
    // Initialize socket connection only on client side
    if (typeof window === 'undefined') return;
    
    // Cleanup previous connection if exists
    if (socketRef.current) {
      console.log("Cleaning up previous socket connection");
      socketRef.current.disconnect();
    }
    
    console.log("Creating new socket connection to:", SOCKET_URL);
    
    // Create socket connection with more reliable configuration
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
      autoConnect: true
    });
    
    // Store the socket in refs and exported variable
    socketRef.current = socketInstance;
    socket = socketInstance;
    
    // Set up event listeners
    socketInstance.on('connect', () => {
      console.log('Socket connected with id:', socketInstance.id);
      setConnected(true);
      setConnectionAttempts(0);
      toast.success('Connected to game server');
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected. Reason:', reason);
      setConnected(false);
      
      // Only show toast for problematic disconnect reasons
      if (reason !== 'io client disconnect') {
        toast.error(`Disconnected from game server: ${reason}`);
        
        // Attempt to reconnect automatically for certain disconnect reasons
        if (reason === 'transport close' || reason === 'ping timeout') {
          setTimeout(() => {
            console.log("Attempting to reconnect after transport close");
            socketInstance.connect();
          }, 1000);
        }
      }
    });
    
    // Add more robust error handling
    socketInstance.on('connect_error', (err) => {
      const attempts = connectionAttempts + 1;
      setConnectionAttempts(attempts);
      console.error(`Socket connection error (attempt ${attempts}):`, err);
      
      if (attempts <= 3) {
        toast.error(`Connection error: ${err.message}. Retrying...`);
      }
      
      // Force reconnect after a short delay
      setTimeout(() => {
        if (!socketInstance.connected) {
          console.log("Attempting to reconnect...");
          socketInstance.connect();
        }
      }, 2000);
    });
    
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      toast.success('Reconnected to game server');
    });
    
    socketInstance.on('reconnect_error', (err) => {
      console.error('Socket reconnection error:', err.message);
    });
    
    // Attempt to connect
    if (!socketInstance.connected) {
      socketInstance.connect();
    }
    
    // Clean up on unmount
    return () => {
      console.log("Cleaning up socket connection");
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [connectionAttempts]);
  
  const reconnect = () => {
    if (socketRef.current && !socketRef.current.connected) {
      console.log("Manual reconnection attempt");
      socketRef.current.connect();
      toast("Attempting to reconnect...", {
        icon: '🔄',
      });
    }
  };
  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

// Hook
export function useSocketContext() {
  const context = useContext(SocketContext);
  
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketContextProvider');
  }
  
  return context;
}