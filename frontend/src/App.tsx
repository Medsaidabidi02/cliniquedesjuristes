import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './lib/AuthContext';

// Components
import Loading from './components/Loading';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import BlogPage from './pages/BlogPage';
import BlogDetailPage from './pages/BlogDetailPage';
import CoursesPage from './pages/CoursesPage';
import ContactPage from './pages/ContactPage';
import AdminDashboard from './pages/AdminDashboard';
import DraftsPage from './pages/DraftPage';
import VideoPlayerPage from './pages/VideoPlayerPage';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <Loading fullScreen text={t('auth.checking_auth', 'Checking authentication...')} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Admin Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAuthenticated, user } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <Loading fullScreen text={t('auth.checking_admin', 'Checking admin rights...')} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {t('user.access_denied', 'Access Denied')}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('user.no_permission', 'You don\'t have permission to access this page.')}
          </p>
          <button 
            onClick={() => window.location.href = '/'} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded transition"
          >
            {t('user.return_home', 'Return to Home')}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Guest Route Component
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (isAuthenticated) {
    if (user?.is_admin) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/subject/:subjectId/video/:videoId?" element={<VideoPlayerPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />
        <Route path="/blog/drafts" element={<DraftsPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Guest Routes */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />

        {/* Protected Routes */}

        {/* Admin Routes */}
        <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;