'use client';

import { useEffect, useState } from 'react';
import { TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
import { User, Lock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Shimmer } from '@/components/ui/shimmer';

export default function TabTriggers() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className={cn(segmentTabsListClassName, 'grid grid-cols-1 sm:grid-cols-3')}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex h-12 items-center justify-center gap-3 rounded-lg bg-slate-100/90 px-4"
          >
            <Shimmer className="w-5 h-5 rounded" />
            <Shimmer className="h-5 w-20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <TabsList className={cn(segmentTabsListClassName, 'grid grid-cols-1 sm:grid-cols-3')}>
      <TabsTrigger
        value="basic"
        className={cn(segmentTabsTriggerClassName, 'justify-start sm:justify-center')}
      >
        <User className="mr-2 h-4 w-4" /> Basic Information
      </TabsTrigger>
      <TabsTrigger
        value="account"
        className={cn(segmentTabsTriggerClassName, 'justify-start sm:justify-center')}
      >
        <Lock className="mr-2 h-4 w-4" /> Account
      </TabsTrigger>
      <TabsTrigger
        value="documents"
        className={cn(segmentTabsTriggerClassName, 'justify-start sm:justify-center')}
      >
        <FileText className="mr-2 h-4 w-4" /> Documents
      </TabsTrigger>
    </TabsList>
  );
}
