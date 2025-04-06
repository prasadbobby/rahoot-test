import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

export default function AuthCallback() {
  const router = useRouter();
  const { token, user, error } = router.query;

  useEffect(() => {
    if (error) {
      toast.error('Authentication failed. Please try again.');
      router.replace('/auth/login');
      return;
    }

    if (token && user) {
      try {
        // Store auth data in localStorage
        localStorage.setItem('rahootAuthToken', token);
        localStorage.setItem('rahootUser', user);
        
        toast.success('Successfully logged in!');
        router.replace('/dashboard');
      } catch (err) {
        console.error('Error saving auth data:', err);
        toast.error('Authentication failed. Please try again.');
        router.replace('/auth/login');
      }
    }
  }, [token, user, error, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-orange-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Authenticating...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}