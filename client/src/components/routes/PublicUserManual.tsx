import { useAuth, AuthLoadingSpinner } from '@/context/AuthContext';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { RouteContentFallback } from '@/components/common/pageSkeletons';

const UserManual = lazy(() => import('@/pages/userManual'));

function BackButton() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const section = searchParams.get('section');

  if (!section) return null;

  const href = section === 'login' ? '/login' : '/register';
  const label = section === 'login' ? 'Back to Login' : 'Back to Registration';

  return (
    <div className="fixed top-4 left-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(href)}
        className="gap-1.5 bg-white/90 backdrop-blur shadow-md hover:bg-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Button>
    </div>
  );
}

export default function PublicUserManual() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <AuthLoadingSpinner />;

  if (isAuthenticated) {
    return <Navigate to="/user-manual" replace />;
  }

  return (
    <>
      <BackButton />
      <Suspense fallback={<RouteContentFallback />}>
        <UserManual />
      </Suspense>
    </>
  );
}
