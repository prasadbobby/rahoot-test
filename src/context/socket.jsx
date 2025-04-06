// src/context/socket.jsx
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-hot-toast';

const SocketContext = createContext();

export let socket = null;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5505';

export function SocketContextProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const socketRef = useRef(null);
  
  useEffect(() => {
    // Initialize socket connection only on client side
    if (typeof window === 'undefined') return;
    
    // Cleanup previous connection if exists
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    console.log("Creating new socket connection to:", SOCKET_URL);
    
    // Create socket with better configuration
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: true
    });
    
    socketRef.current = socketInstance;
    socket = socketInstance;
    
    // Connection events
    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setConnected(true);
      setConnectionAttempts(0);
      toast.success('Connected to game server');
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
      
      if (reason !== 'io client disconnect') {
        toast.error(`Disconnected: ${reason}`);
      }
    });
    
    socketInstance.on('connect_error', (err) => {
      const attempts = connectionAttempts + 1;
      setConnectionAttempts(attempts);
      console.error(`Connection error (attempt ${attempts}):`, err);
      
      if (attempts <= 3) {
        toast.error(`Connection error: ${err.message}`);
      }
    });
    
    if (!socketInstance.connected) {
      socketInstance.connect();
    }
    
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [connectionAttempts]);
  
// Add this to your SocketContextProvider
useEffect(() => {
  if (socketRef.current) {
    socketRef.current.on('connect', () => {
      console.log('Socket connected with ID:', socketRef.current.id);
    });
    
    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    // Debug listener for all events
    socketRef.current.onAny((event, ...args) => {
      console.log(`[Socket Event] ${event}:`, args);
    });
  }
  
  return () => {
    if (socketRef.current) {
      socketRef.current.off('connect');
      socketRef.current.off('disconnect');
      socketRef.current.offAny();
    }
  };
}, [socketRef.current]);

  const reconnect = () => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
      toast("Reconnecting...", { icon: '🔄' });
    }
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketContextProvider');
  }
  
  return context;
}