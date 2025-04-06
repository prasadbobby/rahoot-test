// src/pages/dashboard/index.jsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/auth';

export default function Dashboard() {
  const router = useRouter();
  const { user, isAuthenticated, loading, isAdmin } = useAuth();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);
  
  if (loading || !isAuthenticated) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title="Dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome header */}
        <div className="bg-gradient-to-r from-primary to-amber-500 rounded-lg shadow-lg p-6 md:p-8 mb-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                Welcome back, {user?.name || user?.username || 'User'}!
              </h1>
              <p className="mt-2 text-white/90">
                {isAdmin 
                  ? 'Manage your quizzes, view statistics, and create new content.'
                  : 'Track your quiz progress, view your scores, and discover new quizzes to play.'}
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              {isAdmin ? (
                <Link
                  href="/quizzes/create"
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 -ml-1 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Create Quiz
                </Link>
              ) : (
                <Link
                  href="/"
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 -ml-1 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Play Now
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {/* Admin Dashboard or User Dashboard based on role */}
        {isAdmin ? (
          <div className="space-y-8">
            {/* Quick Stats for Admin */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Quizzes</dt>
                        <dd>
                          <div className="text-lg font-bold text-gray-900">12</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Players</dt>
                        <dd>
                          <div className="text-lg font-bold text-gray-900">342</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Games Played</dt>
                        <dd>
                          <div className="text-lg font-bold text-gray-900">87</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* My Quizzes Section */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    My Quizzes
                  </h3>
                  <Link
                    href="/quizzes/create"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
                  >
                    <svg className="-ml-1 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    New Quiz
                  </Link>
                </div>
              </div>
              <ul className="divide-y divide-gray-200">
                {[
                  { id: 1, title: 'Geography Challenge', questions: 10, plays: 45, lastPlayed: '2023-10-15' },
                  { id: 2, title: 'Science Trivia', questions: 15, plays: 32, lastPlayed: '2023-10-12' },
                  { id: 3, title: 'History Quiz', questions: 8, plays: 19, lastPlayed: '2023-10-10' },
                ].map((quiz) => (
                  <li key={quiz.id}>
                    <div className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded bg-primary flex items-center justify-center">
                              <span className="text-white font-bold">{quiz.questions}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{quiz.title}</div>
                              <div className="text-sm text-gray-500">
                                {quiz.questions} questions • {quiz.plays} plays
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Link
                              href={`/quizzes/${quiz.id}/host`}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary hover:bg-primary-dark"
                            >
                              Host
                            </Link>
                            <Link
                              href={`/quizzes/${quiz.id}/edit`}
                              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Edit
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <Link
                  href="/quizzes"
                  className="text-sm font-medium text-primary hover:text-primary-dark"
                >
                  View all quizzes →
                </Link>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Recent Activity
                </h3>
              </div>
              <ul className="divide-y divide-gray-200">
                {[
                  { id: 1, event: 'New player joined', quiz: 'Geography Challenge', timestamp: '2023-10-18T14:32:00Z' },
                  { id: 2, event: 'Quiz completed', quiz: 'Science Trivia', timestamp: '2023-10-17T18:22:00Z' },
                  { id: 3, event: 'Quiz created', quiz: 'History Facts', timestamp: '2023-10-16T09:15:00Z' },
                ].map((activity) => (
                  <li key={activity.id}>
                    <div className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {activity.event}
                            </p>
                            <p className="text-sm text-gray-500">
                              {activity.quiz} • {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats cards for regular users */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {/* Total Games Played */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Games Played</dt>
                        <dd>
                          <div className="text-lg font-bold text-gray-900">12</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Average Score */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Average Score</dt>
                        <dd>
                          <div className="text-lg font-bold text-gray-900">750 pts</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Highest Score */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Highest Score</dt>
                        <dd>
                          <div className="text-lg font-bold text-gray-900">950 pts</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quizzes Taken */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Quizzes Taken</dt>
                        <dd>
                          <div className="text-lg font-bold text-gray-900">5</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recent game history */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Recent Activity</h3>
              
              <div className="flow-root">
                <ul className="-my-5 divide-y divide-gray-200">
                  {[
                    { id: 1, title: 'Geography Challenge', date: '2023-10-15', score: 850 },
                    { id: 2, title: 'Science Trivia', date: '2023-10-12', score: 750 },
                    { id: 3, title: 'History Facts', date: '2023-10-10', score: 920 },
                  ].map((game) => (
                    <li key={game.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-md bg-primary text-white flex items-center justify-center">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {game.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(game.date).toLocaleDateString()} • Score: {game.score} points
                          </p>
                        </div>
                        <div>
                          <Link
                            href={`/games/results/${game.id}`}
                            className="inline-flex items-center shadow-sm px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-6">
                  <Link
                    href="/dashboard/history"
                    className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    View All Activity
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Discover quizzes */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Discover Quizzes</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { id: 1, title: 'Music Trivia', questions: 15, category: 'Entertainment' },
                  { id: 2, title: 'World Capitals', questions: 20, category: 'Geography' },
                  { id: 3, title: 'Famous Scientists', questions: 12, category: 'Science' },
                ].map((quiz) => (
                  <div key={quiz.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-4">
                      <h4 className="text-lg font-medium text-gray-900">{quiz.title}</h4>
                      <p className="text-sm text-gray-500">
                        {quiz.questions} questions • {quiz.category}
                      </p>
                      <div className="mt-4">
                        <Link
                          href={`/play/${quiz.id}`}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
                        >
                          Play Now
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-center">
                <Link
                  href="/discover"
                  className="text-sm font-medium text-primary hover:text-primary-dark"
                >
                  Discover more quizzes →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}