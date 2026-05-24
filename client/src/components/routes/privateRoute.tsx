// src/components/routes/privateRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, AuthLoadingSpinner } from '@/context/AuthContext';

export default function PrivateRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
