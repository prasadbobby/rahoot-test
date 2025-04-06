// src/pages/index.jsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/auth';
import { useGame } from '@/context/game';
import toast from 'react-hot-toast';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { joinGame } = useGame();
  
 // src/pages/index.jsx (continued)
 const [gamePin, setGamePin] = useState('');
 const [username, setUsername] = useState('');
 const [joining, setJoining] = useState(false);
 
 const handleJoinGame = async () => {
   if (!gamePin) {
     toast.error('Please enter a game PIN');
     return;
   }
   
   if (!username && !isAuthenticated) {
     toast.error('Please enter a username');
     return;
   }
   
   try {
     setJoining(true);
     
     const playerName = isAuthenticated ? (user.username || user.name) : username;
     const success = await joinGame(gamePin, playerName);
     
     if (success) {
       router.push('/play');
     }
   } catch (error) {
     console.error('Error joining game:', error);
     toast.error('Failed to join game');
   } finally {
     setJoining(false);
   }
 };
 
 return (
   <Layout>
     <div className="relative overflow-hidden">
       {/* Hero section */}
       <div className="bg-gradient-to-b from-primary-dark to-primary pt-10 pb-14 sm:pt-16 lg:pt-24 lg:pb-32">
         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
           <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
             <div className="mx-auto max-w-md px-4 sm:max-w-2xl sm:px-6 lg:px-0">
               <div className="lg:py-24">
                 <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl xl:text-6xl">
                   <span className="block">Learn, Play,</span>
                   <span className="block">Quiz Together</span>
                 </h1>
                 
                 <p className="mt-3 text-base text-white/90 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                   Rahoot is an interactive quiz platform where you can create, share and play quizzes with friends, students, or colleagues.
                 </p>
                 
                 <div className="mt-10 sm:mt-12">
                   <div className="sm:max-w-xl sm:mx-auto lg:mx-0">
                     <div className="sm:flex">
                       <div className="min-w-0 flex-1">
                         <label htmlFor="gamePin" className="sr-only">
                           Game PIN
                         </label>
                         <input
                           id="gamePin"
                           type="text"
                           placeholder="Enter game PIN"
                           value={gamePin}
                           onChange={(e) => setGamePin(e.target.value)}
                           className="block w-full px-4 py-3 rounded-md text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white"
                         />
                       </div>
                       <div className="mt-3 sm:mt-0 sm:ml-3">
                         <button
                           onClick={handleJoinGame}
                           disabled={joining}
                           className="block w-full py-3 px-4 rounded-md shadow bg-white text-primary font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                         >
                           {joining ? 'Joining...' : 'Join'}
                         </button>
                       </div>
                     </div>
                     
                     {!isAuthenticated && (
                       <div className="mt-3">
                         <label htmlFor="username" className="sr-only">
                           Your Name
                         </label>
                         <input
                           id="username"
                           type="text"
                           placeholder="Your name"
                           value={username}
                           onChange={(e) => setUsername(e.target.value)}
                           className="block w-full px-4 py-3 rounded-md text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white"
                         />
                       </div>
                     )}
                     
                     <p className="mt-3 text-sm text-white/80 sm:mt-4">
                       Don't have a PIN? {' '}
                       {isAuthenticated ? (
                         <Link href="/dashboard" className="font-medium text-white underline">
                           Go to your dashboard
                         </Link>
                       ) : (
                         <Link href="/auth/login" className="font-medium text-white underline">
                           Sign in to create games
                         </Link>
                       )}
                     </p>
                   </div>
                 </div>
               </div>
             </div>
             
             <div className="mt-12 -mb-16 sm:-mb-48 lg:m-0 lg:relative">
               <div className="mx-auto max-w-md px-4 sm:max-w-2xl sm:px-6 lg:max-w-none lg:px-0">
                 {/* Add an illustration here */}
                 <div className="w-full h-64 bg-white/10 rounded-lg"></div>
               </div>
             </div>
           </div>
         </div>
       </div>
       
       {/* Features section */}
       <div className="relative bg-white py-16 sm:py-24 lg:py-32">
         <div className="mx-auto max-w-md px-4 text-center sm:max-w-3xl sm:px-6 lg:max-w-7xl lg:px-8">
           <h2 className="text-base font-semibold uppercase tracking-wider text-primary">
             Everything You Need
           </h2>
           
           <p className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
             The Ultimate Quiz Platform
           </p>
           
           <p className="mx-auto mt-5 max-w-prose text-xl text-gray-500">
             Create engaging quizzes, play with friends, and track your progress - all in one place.
           </p>
           
           <div className="mt-12">
             <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
               {/* Feature 1 */}
               <div className="pt-6">
                 <div className="flow-root rounded-lg bg-gray-50 px-6 pb-8">
                   <div className="-mt-6">
                     <div>
                       <span className="inline-flex items-center justify-center rounded-md bg-primary p-3 shadow-lg">
                         <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                         </svg>
                       </span>
                     </div>
                     
                     <h3 className="mt-8 text-lg font-medium tracking-tight text-gray-900">
                       Create Custom Quizzes
                     </h3>
                     
                     <p className="mt-5 text-base text-gray-500">
                       Design your own quizzes with multiple-choice questions, images, and custom time limits.
                     </p>
                   </div>
                 </div>
               </div>
               
               {/* Feature 2 */}
               <div className="pt-6">
                 <div className="flow-root rounded-lg bg-gray-50 px-6 pb-8">
                   <div className="-mt-6">
                     <div>
                       <span className="inline-flex items-center justify-center rounded-md bg-primary p-3 shadow-lg">
                         <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                       </span>
                     </div>
                     
                     <h3 className="mt-8 text-lg font-medium tracking-tight text-gray-900">
                       Play Together
                     </h3>
                     
                     <p className="mt-5 text-base text-gray-500">
                       Join games with a simple PIN code and compete with friends, classmates, or colleagues.
                     </p>
                   </div>
                 </div>
               </div>
               
               {/* Feature 3 */}
               <div className="pt-6">
                 <div className="flow-root rounded-lg bg-gray-50 px-6 pb-8">
                   <div className="-mt-6">
                     <div>
                       <span className="inline-flex items-center justify-center rounded-md bg-primary p-3 shadow-lg">
                         <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                         </svg>
                       </span>
                     </div>
                     
                     <h3 className="mt-8 text-lg font-medium tracking-tight text-gray-900">
                       Track Progress
                     </h3>
                     
                     <p className="mt-5 text-base text-gray-500">
                       View detailed statistics and leaderboards to monitor your performance over time.
                     </p>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
       
       {/* CTA section */}
       <div className="bg-primary">
         <div className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8 lg:py-16">
           <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
             <div>
               <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                 Ready to create your own quiz?
               </h2>
               <p className="mt-3 max-w-md text-lg text-white/90">
                 Sign up now to create, share and play interactive quizzes with your audience.
               </p>
             </div>
             <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0 lg:justify-end">
               <div className="inline-flex rounded-md shadow">
                 <Link
                   href="/auth/register"
                   className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-5 py-3 text-base font-medium text-primary hover:bg-gray-50"
                 >
                   Get started
                 </Link>
               </div>
               <div className="ml-3 inline-flex rounded-md shadow">
                 <Link
                   href="/auth/login"
                   className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-dark px-5 py-3 text-base font-medium text-white hover:bg-primary-darker"
                 >
                   Log in
                 </Link>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   </Layout>
 );
}