import { api, apiUtils } from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  is_approved: boolean;
  last_ip?: string;
  created_at?: string;
  updated_at?: string;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  token: string;
  user: User;
}

interface CurrentUserResponse {
  success: boolean;
  message?: string;
  user: User;
}

export const authService = {
  // Login user
  async login(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    try {
      console.log('🔐 Attempting login with:', { email: credentials.email, passwordLength: credentials.password.length });
      
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      
      if (response && response.token && response.user) {
        // Store token and user data
        apiUtils.setAuthToken(response.token);
        apiUtils.setUserData(response.user);
        
        console.log('👤 Login successful for user:', response.user.name);
        return {
          user: response.user,
          token: response.token
        };
      }
      
      console.error('❌ Login failed - invalid response structure:', response);
      throw new Error('Login failed');
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      // Check if this is a session-active error
      if (error.response?.data?.sessionActive) {
        const sessionError = new Error(error.response.data.message || 'Session already active') as any;
        sessionError.sessionActive = true;
        sessionError.cooldownMinutes = error.response.data.cooldownMinutes || 0;
        sessionError.attemptsRemaining = error.response.data.attemptsRemaining || 0;
        throw sessionError;
      }
      
      throw error;
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint to invalidate session and set ban
      await api.post('/auth/logout', {});
      console.log('👋 Logout API call successful');
    } catch (error) {
      console.error('❌ Logout API error (continuing with local logout):', error);
    } finally {
      // Always clear local auth data even if API call fails
      apiUtils.removeAuthToken();
      console.log('👋 User logged out locally');
    }
  },

  // Get current user info
  async getCurrentUser(): Promise<User | null> {
    try {
      // First check localStorage for user data to avoid unnecessary API calls
      const cachedUser = apiUtils.getUserData();
      if (cachedUser) {
        console.log('👤 Using cached user data');
        return cachedUser;
      }
      
      console.log('🔍 Fetching current user from API');
      const response = await api.get<CurrentUserResponse>('/auth/me');
      
      if (response && response.success && response.user) {
        // Cache the user data
        apiUtils.setUserData(response.user);
        return response.user;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching current user:', error);
      // Clear potentially invalid token on error
      apiUtils.removeAuthToken();
      return null;
    }
  }
};