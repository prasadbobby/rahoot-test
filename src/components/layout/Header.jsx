// src/components/layout/Header.jsx
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/auth';
import { FiMenu, FiX, FiLogOut, FiUser } from 'react-icons/fi';

export default function Header() {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="text-2xl font-bold text-primary">Rahoot</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/"
              className="text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-md text-sm font-medium"
            >
              Home
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link 
                  href="/dashboard"
                  className="text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                
                {isAdmin && (
                  <>
                    <Link 
                      href="/quizzes/create"
                      className="text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Create Quiz
                    </Link>
                    
                    <Link 
                      href="/quizzes"
                      className="text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-md text-sm font-medium"
                    >
                      My Quizzes
                    </Link>
                  </>
                )}
                
                <div className="flex items-center">
                  {user?.picture ? (
                    <Image 
                      src={user.picture} 
                      alt={user.name || user.username} 
                      width={32} 
                      height={32} 
                      className="rounded-full" 
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                      {(user?.name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={logout}
                    className="ml-4 text-gray-600 hover:text-primary transition-colors"
                    aria-label="Logout"
                  >
                    <FiLogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link 
                  href="/auth/login"
                  className="text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-md text-sm font-medium"
                >
                  Log In
                </Link>
                
                <Link 
                  href="/auth/register"
                  className="text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              type="button"
              className="bg-white p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">{mobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
              {mobileMenuOpen ? (
                <FiX className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <FiMenu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
            <Link 
              href="/"
              className="block text-gray-600 hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link 
                  href="/dashboard"
                  className="block text-gray-600 hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                
                {isAdmin && (
                  <>
                    <Link 
                      href="/quizzes/create"
                      className="block text-gray-600 hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Create Quiz
                    </Link>
                    
                    <Link 
                      href="/quizzes"
                      className="block text-gray-600 hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Quizzes
                    </Link>
                  </>
                )}
                
                <div className="flex items-center px-3 py-2">
                  {user?.picture ? (
                    <Image 
                      src={user.picture} 
                      alt={user.name || user.username} 
                      width={32} 
                      height={32} 
                      className="rounded-full" 
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                      {(user?.name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <span className="ml-3 text-gray-700">{user?.name || user?.username}</span>
                </div>
                
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left text-gray-600 hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                >
                  <div className="flex items-center">
                    <FiLogOut className="mr-2 h-5 w-5" />
                    Log Out
                  </div>
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/auth/login"
                  className="block text-gray-600 hover:text-primary hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log In
                </Link>
                
                <Link 
                  href="/auth/register"
                  className="block text-primary bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}