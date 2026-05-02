'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { api, setToken } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

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
        void validateSession();
        return;
      }

      setIsLoading(false);
      setIsAuthenticated(false);
      setUser(null);
    };

    window.addEventListener('tokenChanged', handleTokenChanged);

    return () => {
      window.removeEventListener('tokenChanged', handleTokenChanged);
    };
  }, [validateSession]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user }}>
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

export function AuthLoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white/5 p-6">
        <Skeleton className="mx-auto h-16 w-64 bg-white/15" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-24 bg-white/15" />
          <Skeleton className="h-10 w-full bg-white/15" />
          <Skeleton className="h-4 w-28 bg-white/15" />
          <Skeleton className="h-10 w-full bg-white/15" />
        </div>
        <Skeleton className="mx-auto h-10 w-44 bg-red-500/25" />
        <div className="space-y-2">
          <Skeleton className="mx-auto h-4 w-40 bg-white/15" />
          <Skeleton className="mx-auto h-4 w-56 bg-white/15" />
        </div>
      </div>
    </div>
  );
}
