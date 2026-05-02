import { useUserPermissions } from '@/hooks/useUserPermissions';
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface PermissionRouteProps {
  children: ReactNode;
  module: string;
  permission?: string;
}

export default function PermissionRoute({
  children,
  module,
  permission = 'view',
}: PermissionRouteProps) {
  const { hasPermission, loading } = useUserPermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !hasPermission(module, permission)) {
      navigate('/');
    }
  }, [loading, hasPermission, module, permission, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (!hasPermission(module, permission)) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
