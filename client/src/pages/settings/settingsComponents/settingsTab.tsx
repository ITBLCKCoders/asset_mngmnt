'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Tag,
  MapPin,
  Building2,
  Bell,
  Users,
  Shield,
  FileText,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';
import { Shimmer } from '@/components/ui/shimmer';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface SettingsTabsProps {
  children: React.ReactNode;
}

const tabs = [
  { value: 'general', label: 'General', icon: Package },
  { value: 'assets', label: 'Assets', icon: Tag },
  { value: 'locations', label: 'Locations', icon: MapPin },
  { value: 'departments', label: 'Departments', icon: Building2 },
  { value: 'notifications', label: 'Notifications', icon: Bell },
  { value: 'users', label: 'Users & Roles', icon: Users },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'forms', label: 'Forms', icon: FileText },
  { value: 'audit-retention', label: 'Audit Retention', icon: Archive },
];

export function SettingsTabs({ children }: SettingsTabsProps) {
  const { user } = useCurrentUser();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const urlTab = searchParams.get('tab');
    const savedTab = localStorage.getItem('settings-active-tab');
    return urlTab || savedTab || 'general';
  });
  const action = searchParams.get('action');

  // Check if user is admin or super admin
  const isAdminOrSuperAdmin = () => {
    const normalizedRoleName = (user?.role?.name ?? '').trim().toLowerCase();
    return normalizedRoleName === 'admin' || normalizedRoleName === 'super admin';
  };

  // Filter tabs based on user role
  const filteredTabs = tabs.filter(tab => {
    if (isAdminOrSuperAdmin()) return true;
    // Hide admin-only tabs for non-admin users
    const adminOnlyTabs = ['notifications', 'users', 'security', 'forms', 'audit-retention', 'departments'];
    return !adminOnlyTabs.includes(tab.value);
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('settings-active-tab', activeTab);
  }, [activeTab]);

  const childrenWithProps = React.Children.map(children, (child, index) => {
    const tabValue = tabs[index]?.value;
    return React.cloneElement(child as React.ReactElement<any>, {
      isActive: activeTab === tabValue,
      action,
    });
  });

  if (isLoading) {
    return (
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="flex h-auto w-full gap-2 rounded-xl border bg-white p-2 shadow-sm overflow-x-auto scrollbar-hide">
          {filteredTabs.map(tab => (
            <div
              key={tab.value}
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 whitespace-nowrap"
            >
              <Shimmer className="w-4 h-4 rounded" />
              <Shimmer className="h-4 w-16 rounded hidden sm:block" />
              <Shimmer className="h-4 w-8 rounded sm:hidden" />
            </div>
          ))}
        </TabsList>
        {childrenWithProps}
      </Tabs>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="flex h-auto w-full gap-2 rounded-xl border bg-white p-2 shadow-sm overflow-x-auto scrollbar-hide">
        {filteredTabs.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-medium data-[state=active]:bg-red-600 data-[state=active]:text-white hover:bg-gray-100 data-[state=active]:hover:bg-red-700 transition-all whitespace-nowrap flex-1"
          >
            <Icon className="w-4 h-4" />
            <span className="text-xs font-normal sm:text-sm">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {childrenWithProps}
    </Tabs>
  );
}
