'use client';

import { Navigate } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getToken } from '@/lib/api';
import { getLandingPage } from '@/utils/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function LandingRedirect() {
  const { hasPermission, loading: permsLoading } = useUserPermissions();
  const { user, loading: userLoading } = useCurrentUser();

  // No token: redirect to login immediately (no API wait — avoids hang on network deploy)
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  // User finished loading but not authenticated
  if (!userLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (permsLoading || userLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const landingPage = getLandingPage(hasPermission, !!user?.role);

  return <Navigate to={landingPage} replace />;
}
