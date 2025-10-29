import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { authService, User as AuthUser } from './auth';
import { apiUtils, getErrorMessage } from './api';

type User = AuthUser;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Try to restore user from localStorage if present
    try {
      const stored = apiUtils.getUserData();
      return stored ? (stored as User) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => apiUtils.isAuthenticated());

  useEffect(() => {
    const initAuth = async () => {
      try {
        // If we already have a token stored, attempt to get current user from authService
        if (apiUtils.isAuthenticated()) {
          try {
            const current = await authService.getCurrentUser?.();
            if (current) {
              setUser(current as User);
              setIsAuthenticated(true);
            } else {
              // Fallback: use stored user in localStorage
              const stored = apiUtils.getUserData();
              if (stored) {
                setUser(stored as User);
                setIsAuthenticated(true);
              }
            }
          } catch (err) {
            // Could not fetch current user, clear local state but don't logout automatically
            console.warn('Could not fetch current user on init:', err);
            const stored = apiUtils.getUserData();
            if (stored) {
              setUser(stored as User);
              setIsAuthenticated(true);
            } else {
              setUser(null);
              setIsAuthenticated(false);
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * login
   * - Normalizes email
   * - Calls authService.login
   * - Throws on failure so callers (LoginPage) can handle and avoid navigation
   * - Persists token and user via apiUtils on success
   */
  const login = async (email: string, password: string): Promise<User> => {
    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = String(email).trim().toLowerCase();

      // Call auth service (this may throw on network error)
      const res: any = await authService.login({ email: normalizedEmail, password });

      // Handle different possible shapes of response from authService
      // Expected successful shape: { success: true, token, user } OR { token, user }
      if (!res) {
        const msg = 'Authentication failed (no response)';
        setError(msg);
        throw new Error(msg);
      }

      // If the service returned a success flag that's false -> treat as failure
      if (res.success === false) {
        const msg = res.message || 'Authentication failed';
        setError(msg);
        throw new Error(msg);
      }

      // Ensure token and user exist
      const token = res.token || res.data?.token;
      const userPayload = res.user || res.data?.user || res;

      if (!token || !userPayload) {
        const msg = res.message || 'Authentication failed: invalid response from server';
        setError(msg);
        throw new Error(msg);
      }

      // Persist auth data
      try {
        apiUtils.setAuthToken(token);
        apiUtils.setUserData(userPayload);
      } catch (e) {
        console.warn('Could not persist auth data to localStorage:', e);
      }

      setUser(userPayload as User);
      setIsAuthenticated(true);
      setLoading(false);

      return userPayload as User;
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      setLoading(false);
      // Re-throw so callers (LoginPage) will catch and avoid navigating
      throw new Error(msg);
    }
  };

  const logout = () => {
    try {
      apiUtils.removeAuthToken();
    } catch (e) {
      console.warn('Error clearing auth token:', e);
    }
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};