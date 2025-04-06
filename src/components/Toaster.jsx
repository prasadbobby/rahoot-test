// src/components/Toaster.jsx
import { Toaster as HotToaster } from 'react-hot-toast';

export default function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#FFF',
          color: '#333',
          boxShadow: 'rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px',
          fontWeight: 500,
        },
        success: {
          style: {
            borderLeft: '4px solid #10B981',
          },
        },
        error: {
          style: {
            borderLeft: '4px solid #EF4444',
          },
        },
      }}
    />
  );
}