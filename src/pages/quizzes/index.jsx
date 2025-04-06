// src/pages/quizzes/index.jsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/auth';
import { FiPlus, FiEdit, FiPlay, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

export default function Quizzes() {
  const router = useRouter();
  const { user, isAuthenticated, loading, isAdmin } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  
  // Fetch quizzes on component mount
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const token = localStorage.getItem('rahootAuthToken');
        const response = await fetch('/api/quizzes', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setQuizzes(data);
        } else {
          console.error('Failed to fetch quizzes');
        }
      } catch (error) {
        console.error('Error fetching quizzes:', error);
      } finally {
        setLoadingQuizzes(false);
      }
    };
    
    fetchQuizzes();
  }, []);
  
  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);
  
  if (loading || !isAuthenticated) {
    return (
      <Layout title="My Quizzes">
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }
  
  const deleteQuiz = async (quizId) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    
    try {
      const token = localStorage.getItem('rahootAuthToken');
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setQuizzes(quizzes.filter(quiz => quiz.id !== quizId));
        toast.success('Quiz deleted successfully');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete quiz');
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred while deleting the quiz');
    }
  };
  
  const startQuiz = async (quizId) => {
    try {
      const token = localStorage.getItem('rahootAuthToken');
      const response = await fetch(`/api/quizzes/${quizId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        router.push(`/host/${data.gamePin}`);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start quiz');
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred while starting the quiz');
    }
  };
  
  return (
    <Layout title="My Quizzes">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              My Quizzes
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your created quizzes and host games
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link
              href="/quizzes/create"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <FiPlus className="-ml-1 mr-2 h-5 w-5" />
              Create Quiz
            </Link>
          </div>
        </div>
        
        {loadingQuizzes ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-12 sm:px-6 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No quizzes</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new quiz.
              </p>
              <div className="mt-6">
                <Link
                  href="/quizzes/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <FiPlus className="-ml-1 mr-2 h-5 w-5" />
                  Create New Quiz
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {quizzes.map((quiz) => (
                <li key={quiz.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded bg-primary flex items-center justify-center">
                          <span className="text-white font-bold">{quiz.questions.length}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{quiz.title}</div>
                          <div className="text-sm text-gray-500">
                            {quiz.questions.length} questions • {quiz.category}
                            {!quiz.isPublic && " • Private"}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startQuiz(quiz.id)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary hover:bg-primary-dark"
                        >
                          <FiPlay className="mr-1 h-3 w-3" />
                          Host
                        </button>
                        <Link
                          href={`/quizzes/${quiz.id}/edit`}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <FiEdit className="mr-1 h-3 w-3" />
                          Edit
                        </Link>
                        <button
                          onClick={() => deleteQuiz(quiz.id)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-red-600 bg-white hover:bg-gray-50"
                        >
                          <FiTrash2 className="mr-1 h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}