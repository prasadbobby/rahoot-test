// src/pages/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/auth';
import { usePlayerContext } from '@/context/player';
import { useSocketContext } from '@/context/socket';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FiArrowRight, FiPlusCircle, FiUsers, FiPlay, FiUser } from 'react-icons/fi';
import logo from "@/assets/logo.svg";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { socket, connected } = useSocketContext();
  const { dispatch } = usePlayerContext();
  
  const [gamePin, setGamePin] = useState('');
  const [username, setUsername] = useState('');
  const [joining, setJoining] = useState(false);
  const [activeSection, setActiveSection] = useState('join'); // 'join' or 'create'
  
  // Initialize username from authenticated user if available
  useEffect(() => {
    if (isAuthenticated && user && (user.username || user.name)) {
      setUsername(user.username || user.name);
    }
  }, [isAuthenticated, user]);
  
  const handleJoinGame = () => {
    if (!gamePin) {
      toast.error('Please enter a game PIN');
      return;
    }
    
    if (!username) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!connected) {
      toast.error('Not connected to game server');
      return;
    }
    
    setJoining(true);
    
    // Check if room exists
    socket.emit("player:checkRoom", gamePin);
    
    // Set up timeout
    const timeout = setTimeout(() => {
      setJoining(false);
      toast.error("Request timed out");
      cleanupListeners();
    }, 5000);
    
    function cleanupListeners() {
      clearTimeout(timeout);
      socket.off("game:successRoom");
      socket.off("game:errorMessage");
      socket.off("game:successJoin");
      socket.off("player:join-response");
    }
    
    // Success handler for room check
    socket.once("game:successRoom", () => {
      // Emit join request
      socket.emit("player:join", { 
        username: username,
        room: gamePin,
        gamePin: gamePin
      });
      
      // Handle successful join (old format)
      socket.once("game:successJoin", () => {
        cleanupListeners();
        
        // Update player context
        dispatch({
          type: "JOIN",
          payload: {
            username: username,
            roomId: gamePin,
            gameInstance: { pinCode: gamePin }
          }
        });
        
        setJoining(false);
        router.push("/play");
      });
      
      // Handle successful join (new format)
      socket.once("player:join-response", (response) => {
        cleanupListeners();
        setJoining(false);
        
        if (response.success) {
          // Update player context
          dispatch({
            type: "JOIN",
            payload: {
              username: username,
              roomId: gamePin,
              gameInstance: response.gameInstance
            }
          });
          
          router.push("/play");
        } else {
          toast.error(response.message || "Failed to join game");
        }
      });
    });
    
    // Error handler
    socket.once("game:errorMessage", (message) => {
      cleanupListeners();
      setJoining(false);
      toast.error(message);
    });
  };
  
  return (
    <Layout showHeader={false} showFooter={false}>
      <div className="min-h-screen w-full bg-gradient-to-b from-primary-dark to-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Logo and Header */}
          <div className="flex justify-center mb-8">
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Image 
                src={logo} 
                alt="Rahoot" 
                width={220} 
                height={80} 
                priority 
              />
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Hero Content */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
                Learn, Play, Quiz Together
              </h1>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto lg:mx-0">
                Join interactive quizzes or create your own to play with friends, 
                students, or colleagues in real-time.
              </p>
              
              {/* Features */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">
                  <div className="flex items-start">
                    <div className="bg-white/20 p-2 rounded-lg mr-3">
                      <FiUsers className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Multiplayer Fun</h3>
                      <p className="text-white/70">Play together with unlimited players in real-time</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-white/20 p-2 rounded-lg mr-3">
                      <FiPlay className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Easy to Play</h3>
                      <p className="text-white/70">Just enter a PIN and start playing instantly</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Right Column - Game Access */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg w-full max-w-md overflow-hidden">
                {/* Tab Navigation */}
                <div className="flex border-b border-white/20">
                  <button
                    onClick={() => setActiveSection('join')}
                    className={`flex-1 py-4 px-6 font-medium text-center transition-colors ${
                      activeSection === 'join' 
                        ? 'bg-white/10 text-white' 
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Join Game
                  </button>
                  
                  <button
                    onClick={() => setActiveSection('create')}
                    className={`flex-1 py-4 px-6 font-medium text-center transition-colors ${
                      activeSection === 'create' 
                        ? 'bg-white/10 text-white' 
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Host Game
                  </button>
                </div>
                
                {/* Form Content */}
                <div className="p-8">
                  {activeSection === 'join' ? (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-center">Enter Game PIN</h2>
                      
                      {/* PIN Input */}
                      <div className="relative">
                        <input
                          type="text"
                          value={gamePin}
                          onChange={(e) => setGamePin(e.target.value.replace(/\D/g, '').substring(0, 6))}
                          placeholder="000000"
                          className="w-full bg-white/20 border-2 border-white/30 rounded-lg px-4 py-3 text-center text-3xl tracking-widest font-bold focus:outline-none focus:border-white transition-colors"
                          maxLength={6}
                          autoFocus
                        />
                      </div>
                      
                      {/* Username Input */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <FiUser className="h-5 w-5 text-white/60" />
                        </div>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Your name"
                          className="w-full bg-white/20 border-2 border-white/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder-white/60 focus:outline-none focus:border-white transition-colors"
                          disabled={isAuthenticated && (user?.username || user?.name)}
                        />
                      </div>
                      
                      {/* Join Button */}
                      <button
                        onClick={handleJoinGame}
                        disabled={joining || !connected}
                        className={`w-full bg-white text-primary font-bold py-3 px-6 rounded-lg flex items-center justify-center transition-all ${
                          joining || !connected 
                            ? 'opacity-70 cursor-not-allowed' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {joining ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Joining...
                          </>
                        ) : (
                          <>
                            Enter <FiArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-center">Create a Game</h2>
                      
                      {isAuthenticated ? (
                        <>
                          <p className="text-center text-white/80">
                            Host a new game session and invite players to join with a PIN.
                          </p>
                          
                          <Link 
                            href="/manager" 
                            className="w-full bg-white text-primary font-bold py-3 px-6 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            <FiPlusCircle className="mr-2 h-5 w-5" />
                            Create New Game
                          </Link>
                        </>
                      ) : (
                        <>
                          <p className="text-center text-white/80">
                            Sign in to create and host your own quiz games.
                          </p>
                          
                          <Link 
                            href="/auth/login" 
                            className="w-full bg-white text-primary font-bold py-3 px-6 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            Sign In to Create
                          </Link>
                          
                          <p className="text-center text-white/60 text-sm">
                            Don't have an account?{" "}
                            <Link href="/auth/register" className="underline hover:text-white">
                              Register
                            </Link>
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-12 py-6 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/60 text-sm">
              © {new Date().getFullYear()} Rahoot. All rights reserved.
            </p>
            
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              <Link 
                href="https://github.com/Ralex91/Rahoot" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
              >
                GitHub
              </Link>
              <Link 
                href="/auth/login" 
                className="text-white/60 hover:text-white transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}