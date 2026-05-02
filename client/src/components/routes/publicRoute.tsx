import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '@/lib/api';
import { ReactNode } from 'react';

interface PublicRouteProps {
  children: ReactNode;
}

export default function PublicRoute({ children }: PublicRouteProps) {
  const token = getToken();
  const location = useLocation();

  if (token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
