// src/components/routes/privateRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import ProtectedLayout from './protectedLayout';
import { useAuth, AuthLoadingSpinner } from '@/context/AuthContext';

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
}
