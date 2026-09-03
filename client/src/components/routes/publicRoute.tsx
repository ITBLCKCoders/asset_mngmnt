import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '@/lib/api';
import { ReactNode, useEffect } from 'react';
import { useTheme } from '@/hooks/use-theme';

interface PublicRouteProps {
  children: ReactNode;
}

/**
 * PublicRoute - forces light mode on public pages regardless of user preference
 * Mirrors job_order/apps/web/src/components/routes/PublicRoute.tsx
 */
export default function PublicRoute({ children }: PublicRouteProps) {
  const token = getToken();
  const location = useLocation();
  const { setIsPublicRoute } = useTheme();

  useEffect(() => {
    const wasDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");
    setIsPublicRoute(true);
    return () => {
      if (wasDark) {
        document.documentElement.classList.add("dark");
      }
      setIsPublicRoute(false);
    };
  }, [setIsPublicRoute]);

  if (token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
