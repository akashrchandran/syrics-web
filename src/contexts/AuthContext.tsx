import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AuthState } from '@/types/spotify';
import {
  initializeOAuthFromStorage,
  isOAuthAuthenticated,
  fetchUserProfile,
  getCachedUserProfile,
  logoutOAuth,
  initiateOAuthLogin,
  handleOAuthCallback,
  setAuthMode as setServiceAuthMode,
  clearTokenCache,
} from '@/services/spotify';

interface AuthContextType {
  authState: AuthState;
  isAuthenticated: boolean;
  isOAuthUser: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
  handleCallback: (code: string, state: string) => Promise<void>;
  switchToClientCredentials: () => void;
  switchToOAuth: () => void;
  clearError: () => void;
}

const defaultAuthState: AuthState = {
  mode: 'client-credentials',
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  tokenExpiry: 0,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { accessToken, refreshToken, tokenExpiry } = initializeOAuthFromStorage();
        
        if (accessToken && refreshToken) {
          // Check if we have a cached profile
          let user = getCachedUserProfile();
          
          // If OAuth is authenticated, try to fetch fresh profile
          if (isOAuthAuthenticated()) {
            try {
              user = await fetchUserProfile();
            } catch {
              // Use cached profile if fetch fails
              user = getCachedUserProfile();
            }
          }
          
          setAuthState({
            mode: 'oauth',
            isAuthenticated: true,
            user,
            accessToken,
            refreshToken,
            tokenExpiry,
          });
          setServiceAuthMode('oauth');
        } else {
          // Check if client credentials are configured
          const hasClientCreds = localStorage.getItem('spotify_client_id') && 
                                 localStorage.getItem('spotify_client_secret');
          
          setAuthState({
            ...defaultAuthState,
            mode: 'client-credentials',
            isAuthenticated: !!hasClientCreds,
          });
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await initiateOAuthLogin();
      // The page will redirect, so we don't need to update state here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate login');
      setIsLoading(false);
    }
  }, []);

  const handleCallback = useCallback(async (code: string, state: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const tokens = await handleOAuthCallback(code, state);
      
      // Fetch user profile
      const user = await fetchUserProfile();
      
      setAuthState({
        mode: 'oauth',
        isAuthenticated: true,
        user,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: Date.now() + (tokens.expires_in * 1000),
      });
      
      setServiceAuthMode('oauth');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete login');
      throw err; // Re-throw so the callback page can handle it
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    logoutOAuth();
    setAuthState(defaultAuthState);
    setServiceAuthMode('client-credentials');
    setError(null);
  }, []);

  const switchToClientCredentials = useCallback(() => {
    setAuthState(prev => ({
      ...prev,
      mode: 'client-credentials',
    }));
    setServiceAuthMode('client-credentials');
    clearTokenCache();
  }, []);

  const switchToOAuth = useCallback(() => {
    if (isOAuthAuthenticated()) {
      setAuthState(prev => ({
        ...prev,
        mode: 'oauth',
      }));
      setServiceAuthMode('oauth');
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed auth values - single source of truth
  const isAuthenticated = authState.isAuthenticated || 
    !!(localStorage.getItem('spotify_client_id') && localStorage.getItem('spotify_client_secret'));
  const isOAuthUser = authState.mode === 'oauth' && authState.isAuthenticated;

  return (
    <AuthContext.Provider
      value={{
        authState,
        isAuthenticated,
        isOAuthUser,
        isLoading,
        error,
        login,
        logout,
        handleCallback,
        switchToClientCredentials,
        switchToOAuth,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
