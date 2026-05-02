'use client';

import { Navigate } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/context/AuthContext';
import { getToken } from '@/lib/api';
import { getLandingPage } from '@/utils/navigation';

export default function LandingRedirect() {
  const { hasPermission, loading: permsLoading } = useUserPermissions();
  const { user, loading: userLoading } = useCurrentUser();
  const { isLoading: authLoading } = useAuth();

  // No token: redirect to login immediately (no API wait — avoids hang on network deploy)
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  // Wait for auth context to finish loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // User finished loading but not authenticated
  if (!userLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (permsLoading || userLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const landingPage = getLandingPage(hasPermission, !!user?.role);

  return <Navigate to={landingPage} replace />;
}
