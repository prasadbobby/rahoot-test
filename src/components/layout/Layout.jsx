// src/components/layout/Layout.jsx
import Head from 'next/head';
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children, title, description, showHeader = true, showFooter = true }) {
  const pageTitle = title ? `${title} | Rahoot` : 'Rahoot - Interactive Quiz Platform';
  const pageDescription = description || 'Create and play interactive quizzes with Rahoot, the open-source quiz platform';
  
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Head>
      
      <div className="flex flex-col min-h-screen">
        {showHeader && <Header />}
        
        <main className="flex-grow">
          {children}
        </main>
        
        {showFooter && <Footer />}
      </div>
    </>
  );
}