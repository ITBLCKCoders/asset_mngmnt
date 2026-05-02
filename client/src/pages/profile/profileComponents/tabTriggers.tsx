'use client';

import { useEffect, useState } from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Lock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn('animate-shimmer rounded bg-gray-200/80', className)} />
);

export default function TabTriggers() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-2 rounded-xl border bg-white p-2 shadow-sm sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex h-12 items-center justify-center gap-3 rounded-lg bg-gray-100 px-4"
          >
            <Shimmer className="w-5 h-5 rounded" />
            <Shimmer className="h-5 w-20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <TabsList className="grid h-auto w-full grid-cols-1 rounded-xl border bg-white p-1 shadow-sm sm:grid-cols-3">
      <TabsTrigger
        value="basic"
        className="justify-start rounded-lg px-3 py-2 text-left font-medium data-[state=active]:bg-red-600 data-[state=active]:text-white hover:bg-gray-200 hover:text-gray-900 sm:justify-center"
      >
        <User className="mr-2 h-4 w-4" /> Basic Information
      </TabsTrigger>
      <TabsTrigger
        value="account"
        className="justify-start rounded-lg px-3 py-2 text-left font-medium data-[state=active]:bg-red-600 data-[state=active]:text-white hover:bg-gray-200 hover:text-gray-900 sm:justify-center"
      >
        <Lock className="mr-2 h-4 w-4" /> Account
      </TabsTrigger>
      <TabsTrigger
        value="documents"
        className="justify-start rounded-lg px-3 py-2 text-left font-medium data-[state=active]:bg-red-600 data-[state=active]:text-white hover:bg-gray-200 hover:text-gray-900 sm:justify-center"
      >
        <FileText className="mr-2 h-4 w-4" /> Documents
      </TabsTrigger>
    </TabsList>
  );
}
