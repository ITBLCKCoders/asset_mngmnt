import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn('animate-shimmer rounded bg-gray-200/80', className)} />
);

export function SettingsHeader() {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <Card className="shadow-lg rounded-2xl overflow-hidden border-0 mb-8">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-800 p-4 text-white sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <Shimmer className="h-16 w-16 rounded-2xl bg-white/20" />
              <div>
                <Shimmer className="h-9 w-48 rounded bg-white/20" />
                <Shimmer className="h-5 w-80 rounded mt-2 bg-white/20" />
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Shimmer className="h-10 w-32 rounded bg-white/20" />
              <Shimmer className="h-10 w-32 rounded bg-white/20" />
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-2xl overflow-hidden border-0 mb-8">
      <CardHeader className="bg-gradient-to-r from-red-600 to-red-800 p-4 text-white sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-inner">
              <Settings className="h-10 w-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
                Settings
              </CardTitle>
              <p className="mt-1 text-base text-red-100 opacity-90 sm:text-lg">
                Manage your asset tracking preferences, categories, and more.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button
              variant="header"
              size="lg"
              onClick={() => navigate('/audit')}
            >
              <History className="mr-2 h-5 w-5" />
              Audit Log
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
