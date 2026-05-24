'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { api, setToken } from '@/lib/api';
import { clearCurrentUserCache } from '@/hooks/useCurrentUser';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const validateSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/auth/me');
      // If successful, session is valid
      setToken('authenticated'); // Set the in-memory flag
      setIsAuthenticated(true);
      setUser(response);
    } catch (err) {
      // Session is invalid or expired
      setToken(null);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  useEffect(() => {
    const handleTokenChanged = (event: Event) => {
      const token = (event as CustomEvent<string | null>).detail;

      if (token) {
        clearCurrentUserCache();
        void validateSession();
        return;
      }

      clearCurrentUserCache();
      setIsLoading(false);
      setIsAuthenticated(false);
      setUser(null);
    };

    window.addEventListener('tokenChanged', handleTokenChanged);

    return () => {
      window.removeEventListener('tokenChanged', handleTokenChanged);
    };
  }, [validateSession]);

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, user }),
    [isAuthenticated, isLoading, user]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
        <p className="text-white text-lg">Validating session...</p>
      </div>
    </div>
  );
}
