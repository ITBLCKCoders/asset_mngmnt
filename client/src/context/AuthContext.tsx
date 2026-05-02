'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setToken } from '@/lib/api';
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const validateSession = async (retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 500; // 500ms between retries

    try {
      const response = await api.get('/auth/me');
      // If successful, session is valid
      setToken('authenticated'); // Set the in-memory flag
      setIsAuthenticated(true);
      setUser(response);
    } catch (err) {
      // On initial load, retry if we get a 401 - this handles the race condition
      // where cookies might not be fully available yet after login
      if (isInitialLoad && retryCount < maxRetries) {
        console.log(`[AuthContext] Initial validation failed (attempt ${retryCount + 1}/${maxRetries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return validateSession(retryCount + 1);
      }

      // Session is invalid or expired
      setToken(null);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    validateSession();
  }, []);

  // Re-validate session when token changes (e.g., after login)
  useEffect(() => {
    const handleTokenChange = () => {
      console.log('[AuthContext] Token changed, re-validating session...');
      setIsLoading(true);
      validateSession();
    };

    window.addEventListener('tokenChanged', handleTokenChange);
    return () => window.removeEventListener('tokenChanged', handleTokenChange);
  }, []);

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
