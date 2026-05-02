'use client';

import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  User,
  LogOut,
  Settings2,
  LayoutDashboard,
  ChevronDown,
  Package,
  Wrench,
  ArrowRightLeft,
  Undo2,
  Trash2,
  FileSearch,
  ClipboardList,
  Hammer,
  Tag,
  PlusCircle,
  FileText,
  CheckSquare,
  HandHelping,
  BarChart3,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAvatarPreview } from '@/hooks/avatarPreview';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { ASSET_SIDEBAR_ENTRIES } from '@/components/sidebar/sidebarConfig';
import {
  SidebarHoverItem,
  SIDEBAR_HOVER_TRANSITION,
} from '@/components/sidebar/SidebarHoverItem';

// ASSET_SIDEBAR_ENTRIES, AssetSidebarEntry / AssetSidebarChild types, the
// SIDEBAR_HOVER_TRANSITION constant and the SidebarHoverItem helper now live
// in ./sidebar/sidebarConfig and ./sidebar/SidebarHoverItem.

interface SidebarProps {
  onLogout?: () => void;
}

// Dead-code marker: the legacy ASSET_SIDEBAR_ENTRIES literal lived between
// the block-comment markers below and was duplicated as a re-declaration.
// They've been wrapped in a `/* ... */` comment so the TS compiler skips them
// while the file diff stays minimal. Safe to physically delete in a follow-up.
/*
  {
    label: 'Asset List',
    perm: 'Asset List',
    path: '/assets',
    icon: Package,
  },
  {
    label: 'Asset Assignment',
    perm: 'Asset Assignment',
    path: '/assets/assignment',
    icon: ClipboardList,
  },
  {
    label: 'Asset Request',
    perm: 'Asset Request',
    path: '/assets/request',
    icon: PlusCircle,
  },
  {
    label: 'Request Management',
    perm: 'Request Management',
    path: '/assets/request-admin',
    icon: ClipboardList,
  },
  {
    label: 'Borrow assets',
    perm: 'Asset Borrowing',
    path: '/assets/borrow',
    icon: HandHelping,
    groupKey: 'assets-borrow',
    children: [
      {
        label: 'Requests',
        perm: 'Borrow Request Management',
        path: '/assets/borrow-requests',
        icon: FileText,
      },
    ],
  },
  {
    label: 'Asset Tagging',
    perm: 'Asset Tagging',
    path: '/assets/tagging',
    icon: Tag,
  },
  {
    label: 'Asset Transfer',
    perm: 'Asset Transfer',
    path: '/assets/transfer',
    icon: ArrowRightLeft,
    groupKey: 'assets-transfer',
    children: [
      {
        label: 'Requests',
        perm: 'Asset Transfer',
        path: '/assets/transfer-requests',
        icon: FileText,
      },
    ],
  },
  {
    label: 'Asset Maintenance',
    perm: 'Asset Maintenance',
    path: '/assets/maintenance',
    icon: Wrench,
  },
  {
    label: 'Asset Repair',
    perm: 'Asset Repair',
    path: '/assets/repair',
    icon: Hammer,
  },
  {
    label: 'Asset Return',
    perm: 'Asset Return',
    path: '/assets/return',
    icon: Undo2,
    groupKey: 'assets-return',
    children: [
      {
        label: 'Requests',
        perm: 'Asset Return',
        path: '/assets/return-requests',
        icon: FileText,
      },
    ],
  },
  {
    label: 'Return asset',
    perm: 'Return Request',
    path: '/assets/return-request',
    icon: Undo2,
    groupKey: 'assets-return-request',
    children: [
      {
        label: 'My Requests',
        perm: 'Return Request',
        path: '/assets/return-request/my-requests',
        icon: FileText,
      },
    ],
  },
  {
    label: 'Transfer asset',
    perm: 'Transfer Request',
    path: '/assets/transfer-request',
    icon: ArrowRightLeft,
    groupKey: 'assets-transfer-request',
    children: [
      {
        label: 'My Requests',
        perm: 'Transfer Request',
        path: '/assets/transfer-request/my-requests',
        icon: FileText,
      },
    ],
  },
  {
    label: 'Asset Disposal',
    perm: 'Asset Disposal',
    path: '/assets/disposal',
    icon: Trash2,
  },
];

interface SidebarProps {
  onLogout?: () => void;
}

const SIDEBAR_HOVER_TRANSITION = {
  type: 'spring',
  stiffness: 320,
  damping: 24,
  mass: 0.7,
} as const;

function SidebarHoverItem({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <motion.div
      initial={false}
      whileHover={active ? { scale: 1.01 } : { x: 4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={SIDEBAR_HOVER_TRANSITION}
    >
      {children}
    </motion.div>
  );
}
*/

export default function Sidebar({ onLogout }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, refetch } = useCurrentUser();
  const { hasPermission } = useUserPermissions();
  const { previewUrl, clearPreview } = useAvatarPreview();

  const [assetsOpen, setAssetsOpen] = useState(false);
  const [formsOpen, setFormsOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [userManualOpen, setUserManualOpen] = useState(false);
  const [assetNestedOpen, setAssetNestedOpen] = useState<Record<string, boolean>>(
    {}
  );
  const savedAvatarUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (user?.avatarUrl && user.avatarUrl !== savedAvatarUrlRef.current) {
      savedAvatarUrlRef.current = user.avatarUrl;
      clearPreview();
    }
  }, [user?.avatarUrl, clearPreview]);

  useEffect(() => {
    if (
      location.pathname === '/forms/accountability' ||
      location.pathname === '/forms/borrow' ||
      location.pathname === '/forms/return' ||
      location.pathname === '/forms/transfer' ||
      location.pathname === '/approvals'
    ) {
      setFormsOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (
      location.pathname.startsWith('/reports') ||
      location.pathname.startsWith('/history/')
    ) {
      setReportsOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (
      location.pathname === '/user-manual' ||
      location.pathname === '/flow-diagrams'
    ) {
      setUserManualOpen(true);
    } else {
      setUserManualOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/assets') && path !== '/assets/my-assets') {
      setAssetsOpen(true);
    }

    setAssetNestedOpen(prev => {
      const next = { ...prev };
      if (
        path === '/assets/borrow' ||
        path.startsWith('/assets/borrow-requests')
      ) {
        next['assets-borrow'] = true;
      }
      if (path.startsWith('/assets/transfer-request')) {
        next['assets-transfer-request'] = true;
      } else if (
        path === '/assets/transfer' ||
        path.startsWith('/assets/transfer-requests')
      ) {
        next['assets-transfer'] = true;
      }
      if (path.startsWith('/assets/return-request')) {
        next['assets-return-request'] = true;
      } else if (
        path === '/assets/return' ||
        path.startsWith('/assets/return-requests')
      ) {
        next['assets-return'] = true;
      }
      return next;
    });
  }, [location.pathname]);

  const displayAvatarUrl = previewUrl || user?.avatarUrl;

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const initials =
    user?.username
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? 'GU';

  const matchesPath = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);
  const reportSection = new URLSearchParams(location.search).get('section');

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout').catch(() => {});
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(';').forEach(c => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });

      await refetch();

      onLogout?.();

      navigate('/login', { replace: true });
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="flex flex-col h-full"
        style={{
          background: 'linear-gradient(to top, #881115, #EE1D25)',
        }}
      >
        <div className="flex shrink-0 flex-col items-center px-3 pb-3 pr-4 pt-6 sm:px-4 sm:pb-4 sm:pr-6 sm:pt-8">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={handleProfileClick}
                className="group focus:outline-none focus:ring-2 focus:ring-white/30 rounded-full transition-all duration-200 hover:ring-4 hover:ring-white/40"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                transition={SIDEBAR_HOVER_TRANSITION}
              >
                <Avatar className="h-[clamp(5.5rem,14vh,10rem)] w-[clamp(5.5rem,14vh,10rem)] ring-2 sm:ring-4 ring-white/50 shadow-xl transition-transform group-hover:scale-105">
                  <AvatarImage
                    src={displayAvatarUrl}
                    alt={user?.username || user?.name || 'User'}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-white/20 text-white text-[clamp(1.5rem,3.2vh,2.25rem)] font-bold backdrop-blur-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              align="center"
              className="bg-gray-900 text-white border-none shadow-lg rounded-xl px-3 py-2 text-sm font-medium"
              style={{
                backdropFilter: 'blur(8px)',
                background: 'rgba(17, 17, 17, 0.9)',
              }}
            >
              View Profile
            </TooltipContent>
          </Tooltip>

          <div className="mt-2 sm:mt-3 flex w-full flex-col items-center text-center">
            {loading ? (
              <>
                <Skeleton className="h-5 w-32 mb-1 bg-white/30 rounded" />
                <Skeleton className="h-3 w-24 mb-1 bg-white/30 rounded" />
                <Skeleton className="h-4 w-16 bg-white/30 rounded-full" />
              </>
            ) : user ? (
              <>
                <p className="text-sm font-semibold text-white max-w-[180px] line-clamp-2 break-words drop-shadow">
                  {user.username || user.name || 'Unknown User'}
                </p>
                <p className="text-xs text-white/80 max-w-[180px] line-clamp-2 break-words drop-shadow">
                  {user.position || 'No position'}
                </p>
                <Badge
                  className="text-xs text-white backdrop-blur-sm px-2 py-0.5 mt-1"
                  style={{
                    background:
                      'linear-gradient(to top right, rgba(255,255,255,0.1), rgba(255,255,255,0.3))',
                    borderImage:
                      'linear-gradient(to top right, rgba(255,255,255,0.4), rgba(255,255,255,0.8)) 1',
                    border: '1px solid transparent',
                    borderBottom: '2px solid white',
                    borderRadius: '9999px',
                  }}
                  variant="secondary"
                >
                  {user.role?.name || 'No role'}
                </Badge>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">Guest</p>
                <p className="text-xs text-white/70">Not logged in</p>
              </>
            )}
          </div>
        </div>

        {user?.role ? (
          <nav className="flex-1 overflow-y-auto px-3 pb-3">
            <ul className="space-y-1">
              {hasPermission('Dashboard', 'view') && (
                <li>
                  <SidebarHoverItem active={matchesPath('/dashboard')}>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-200 justify-start',
                        matchesPath('/dashboard')
                          ? 'bg-white/20 text-white shadow-md'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
                      <span>Dashboard</span>
                    </button>
                  </SidebarHoverItem>
                </li>
              )}

              {hasPermission('My Assets', 'view') && (
                <li>
                  <SidebarHoverItem
                    active={
                      matchesPath('/my-assets')
                    }
                  >
                    <button
                      onClick={() => navigate('/my-assets')}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-200 justify-start',
                        matchesPath('/my-assets')
                          ? 'bg-white/20 text-white shadow-md'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <Package className="h-5 w-5 flex-shrink-0" />
                      <span>My Assets</span>
                    </button>
                  </SidebarHoverItem>
                </li>
              )}

              {(hasPermission('Accountability Form', 'view') ||
                hasPermission('Borrow Form', 'view') ||
                hasPermission('Return Form', 'view') ||
                hasPermission('Transfer Form', 'view') ||
                hasPermission('Approvals', 'view')) && (
                <li>
                  <SidebarHoverItem
                    active={
                      location.pathname === '/forms/accountability' ||
                      location.pathname === '/forms/borrow' ||
                      location.pathname === '/forms/return' ||
                      location.pathname === '/forms/transfer' ||
                      location.pathname === '/approvals' ||
                      formsOpen
                    }
                  >
                    <button
                      onClick={() => setFormsOpen(!formsOpen)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-200 justify-between',
                        location.pathname === '/forms/accountability' ||
                          location.pathname === '/forms/borrow' ||
                          location.pathname === '/forms/return' ||
                          location.pathname === '/forms/transfer' ||
                          location.pathname === '/approvals' ||
                          formsOpen
                          ? 'bg-white/20 text-white shadow-md'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 flex-shrink-0" />
                        <span>Forms</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          formsOpen && 'rotate-180'
                        )}
                      />
                    </button>
                  </SidebarHoverItem>

                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-300 ease-in-out',
                      formsOpen
                        ? 'max-h-[500px] opacity-100'
                        : 'max-h-0 opacity-0'
                    )}
                  >
                    <div className="mt-1 space-y-1 pl-10">
                      {hasPermission('Accountability Form', 'view') && (
                        <SidebarHoverItem
                          active={location.pathname === '/forms/accountability'}
                        >
                          <button
                            onClick={() => navigate('/forms/accountability')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/forms/accountability'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span>Accountability</span>
                          </button>
                        </SidebarHoverItem>
                      )}
                      {hasPermission('Borrow Form', 'view') && (
                        <SidebarHoverItem
                          active={location.pathname === '/forms/borrow'}
                        >
                          <button
                            onClick={() => navigate('/forms/borrow')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/forms/borrow'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <HandHelping className="h-4 w-4 flex-shrink-0" />
                            <span>Borrow forms</span>
                          </button>
                        </SidebarHoverItem>
                      )}
                      {hasPermission('Return Form', 'view') && (
                        <SidebarHoverItem
                          active={location.pathname === '/forms/return'}
                        >
                          <button
                            onClick={() => navigate('/forms/return')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/forms/return'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <ClipboardList className="h-4 w-4 flex-shrink-0" />
                            <span>Return form</span>
                          </button>
                        </SidebarHoverItem>
                      )}
                      {hasPermission('Transfer Form', 'view') && (
                        <SidebarHoverItem
                          active={location.pathname === '/forms/transfer'}
                        >
                          <button
                            onClick={() => navigate('/forms/transfer')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/forms/transfer'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <ArrowRightLeft className="h-4 w-4 flex-shrink-0" />
                            <span>Transfer forms</span>
                          </button>
                        </SidebarHoverItem>
                      )}
                      {hasPermission('Approvals', 'view') && (
                        <SidebarHoverItem
                          active={location.pathname === '/approvals'}
                        >
                          <button
                            onClick={() => navigate('/approvals')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/approvals'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <CheckSquare className="h-4 w-4 flex-shrink-0" />
                            <span>Approvals</span>
                          </button>
                        </SidebarHoverItem>
                      )}
                    </div>
                  </div>
                </li>
              )}

              {(hasPermission('Assets', 'view') ||
                hasPermission('Asset List', 'view') ||
                hasPermission('Asset Assignment', 'view') ||
                hasPermission('Asset Request', 'view') ||
                hasPermission('Request Management', 'view') ||
                hasPermission('Asset Tagging', 'view') ||
                hasPermission('Asset Transfer', 'view') ||
                hasPermission('Asset Maintenance', 'view') ||
                hasPermission('Asset Repair', 'view') ||
                hasPermission('Asset Return', 'view') ||
                hasPermission('Return Request', 'view') ||
                hasPermission('Transfer Request', 'view') ||
                hasPermission('Asset Disposal', 'view') ||
                hasPermission('Asset Borrowing', 'view') ||
                hasPermission('Borrow Request Management', 'view')) && (
                <li>
                  <SidebarHoverItem
                    active={
                      (location.pathname.startsWith('/assets') &&
                        location.pathname !== '/assets/my-assets') ||
                      assetsOpen
                    }
                  >
                    <button
                      onClick={() => setAssetsOpen(!assetsOpen)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-200 justify-between',
                        (location.pathname.startsWith('/assets') &&
                          location.pathname !== '/assets/my-assets') ||
                          assetsOpen
                          ? 'bg-white/20 text-white shadow-md'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 flex-shrink-0" />
                        <span>Assets</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          assetsOpen && 'rotate-180'
                        )}
                      />
                    </button>
                  </SidebarHoverItem>

                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-300 ease-in-out',
                      assetsOpen
                        ? 'max-h-[1200px] opacity-100'
                        : 'max-h-0 opacity-0'
                    )}
                  >
                    <div className="mt-1 space-y-1 pl-10">
                      {ASSET_SIDEBAR_ENTRIES.flatMap(entry => {
                        const parentOk = hasPermission(entry.perm, 'view');
                        const visibleChildren =
                          entry.children?.filter(c =>
                            hasPermission(c.perm, 'view')
                          ) ?? [];

                        if (!parentOk && visibleChildren.length === 0) {
                          return [];
                        }

                        const linkClass = (path: string, extra?: string) =>
                          cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                            extra,
                            matchesPath(path)
                              ? 'bg-white/15 text-white font-medium'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          );

                        const entryActive =
                          matchesPath(entry.path) ||
                          visibleChildren.some(child => matchesPath(child.path));

                        if (!parentOk && visibleChildren.length > 0) {
                          return visibleChildren.map((child, ci) => (
                            <SidebarHoverItem
                              key={`${child.path}-orphan-${ci}`}
                              active={matchesPath(child.path)}
                            >
                              <button
                                type="button"
                                onClick={() => navigate(child.path)}
                                className={linkClass(child.path)}
                              >
                                <child.icon className="h-4 w-4 flex-shrink-0" />
                                <span>{child.label}</span>
                              </button>
                            </SidebarHoverItem>
                          ));
                        }

                        if (visibleChildren.length === 0) {
                          return [
                            <SidebarHoverItem
                              key={entry.path}
                              active={entryActive}
                            >
                              <button
                                type="button"
                                onClick={() => navigate(entry.path)}
                                className={linkClass(entry.path)}
                              >
                                <entry.icon className="h-4 w-4 flex-shrink-0" />
                                <span>{entry.label}</span>
                              </button>
                            </SidebarHoverItem>,
                          ];
                        }

                        const gk = entry.groupKey!;
                        const nestedOpen = assetNestedOpen[gk] ?? false;

                        return [
                          <div key={gk} className="space-y-1">
                            <div className="flex w-full items-stretch gap-0.5">
                              <SidebarHoverItem
                                active={entryActive}
                              >
                                <button
                                  type="button"
                                  onClick={() => navigate(entry.path)}
                                  className={cn(
                                    'flex min-w-0 flex-1 items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-left',
                                    entryActive
                                      ? 'bg-white/15 text-white font-medium'
                                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                                  )}
                                >
                                  <entry.icon className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{entry.label}</span>
                                </button>
                              </SidebarHoverItem>
                              <SidebarHoverItem active={nestedOpen}>
                                <button
                                  type="button"
                                  aria-expanded={nestedOpen}
                                  aria-label={
                                    nestedOpen
                                      ? 'Collapse submenu'
                                      : 'Expand submenu'
                                  }
                                  onClick={() =>
                                    setAssetNestedOpen(prev => ({
                                      ...prev,
                                      [gk]: !prev[gk],
                                    }))
                                  }
                                  className={cn(
                                    'flex shrink-0 items-center justify-center rounded-lg px-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white',
                                    nestedOpen && 'text-white'
                                  )}
                                >
                                  <ChevronDown
                                    className={cn(
                                      'h-4 w-4 transition-transform duration-200',
                                      nestedOpen && 'rotate-180'
                                    )}
                                  />
                                </button>
                              </SidebarHoverItem>
                            </div>
                            <div
                              className={cn(
                                'overflow-hidden transition-all duration-300 ease-in-out',
                                nestedOpen
                                  ? 'max-h-[240px] opacity-100'
                                  : 'max-h-0 opacity-0'
                              )}
                            >
                              <div className="ml-1 space-y-1 border-l border-white/20 pl-3">
                                {visibleChildren.map(child => (
                                  <SidebarHoverItem
                                    key={child.path}
                                    active={matchesPath(child.path)}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => navigate(child.path)}
                                      className={linkClass(child.path, 'pl-2')}
                                    >
                                      <child.icon className="h-4 w-4 flex-shrink-0" />
                                      <span>{child.label}</span>
                                    </button>
                                  </SidebarHoverItem>
                                ))}
                              </div>
                            </div>
                          </div>,
                        ];
                      })}
                    </div>
                  </div>
                </li>
              )}

              {hasPermission('Users', 'view') && (
                <li>
                  <SidebarHoverItem active={matchesPath('/user')}>
                    <button
                      onClick={() => navigate('/user')}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-200 justify-start',
                        matchesPath('/user')
                          ? 'bg-white/20 text-white shadow-md'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <User className="h-5 w-5 flex-shrink-0" />
                      <span>User</span>
                    </button>
                  </SidebarHoverItem>
                </li>
              )}
              {hasPermission('Reports', 'view') && (
                <li>
                  <SidebarHoverItem
                    active={
                      matchesPath('/reports') ||
                      location.pathname.startsWith('/history/') ||
                      reportsOpen
                    }
                  >
                    <div className="flex w-full items-stretch gap-0.5">
                      <button
                        onClick={() => navigate('/reports')}
                        className={cn(
                          'flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left',
                          matchesPath('/reports') ||
                            location.pathname.startsWith('/history/') ||
                            reportsOpen
                            ? 'bg-white/20 text-white shadow-md'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <BarChart3 className="h-5 w-5 flex-shrink-0" />
                        <span className="truncate">Reports</span>
                      </button>
                      <button
                        type="button"
                        aria-expanded={reportsOpen}
                        aria-label={reportsOpen ? 'Collapse reports submenu' : 'Expand reports submenu'}
                        onClick={() => setReportsOpen(!reportsOpen)}
                        className={cn(
                          'flex shrink-0 items-center justify-center rounded-lg px-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white',
                          reportsOpen && 'text-white'
                        )}
                      >
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform duration-200',
                            reportsOpen && 'rotate-180'
                          )}
                        />
                      </button>
                    </div>
                  </SidebarHoverItem>

                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-300 ease-in-out',
                      reportsOpen
                        ? 'max-h-[500px] opacity-100'
                        : 'max-h-0 opacity-0'
                    )}
                  >
                    <div className="mt-1 space-y-1 pl-10">
                      {hasPermission('Assignment History', 'view') && (
                        <SidebarHoverItem
                          active={
                            location.pathname === '/reports' &&
                            reportSection === 'assignment'
                          }
                        >
                          <button
                            onClick={() => navigate('/reports?section=assignment')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/reports' &&
                                reportSection === 'assignment'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <ClipboardList className="h-4 w-4 flex-shrink-0" />
                            <span>Assignment History</span>
                          </button>
                        </SidebarHoverItem>
                      )}
                      {hasPermission('Return History', 'view') && (
                        <SidebarHoverItem
                          active={
                            location.pathname === '/reports' &&
                            reportSection === 'return'
                          }
                        >
                          <button
                            onClick={() => navigate('/reports?section=return')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/reports' &&
                                reportSection === 'return'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <Undo2 className="h-4 w-4 flex-shrink-0" />
                            <span>Return History</span>
                          </button>
                        </SidebarHoverItem>
                      )}
                      {hasPermission('Transfer History', 'view') && (
                        <SidebarHoverItem
                          active={
                            location.pathname === '/reports' &&
                            reportSection === 'transfer'
                          }
                        >
                          <button
                            onClick={() => navigate('/reports?section=transfer')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/reports' &&
                                reportSection === 'transfer'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <ArrowRightLeft className="h-4 w-4 flex-shrink-0" />
                            <span>Transfer History</span>
                          </button>
                        </SidebarHoverItem>
                      )}
                      {hasPermission('Maintenance History', 'view') && (
                        <SidebarHoverItem
                          active={
                            location.pathname === '/reports' &&
                            reportSection === 'maintenance'
                          }
                        >
                          <button
                            onClick={() => navigate('/reports?section=maintenance')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/reports' &&
                                reportSection === 'maintenance'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <Wrench className="h-4 w-4 flex-shrink-0" />
                            <span>Maintenance History</span>
                          </button>
                        </SidebarHoverItem>
                      )}
                      {hasPermission('Repair History', 'view') && (
                        <SidebarHoverItem
                          active={
                            location.pathname === '/reports' &&
                            reportSection === 'repair'
                          }
                        >
                          <button
                            onClick={() => navigate('/reports?section=repair')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/reports' &&
                                reportSection === 'repair'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <Hammer className="h-4 w-4 flex-shrink-0" />
                            <span>Repair History</span>
                          </button>
                        </SidebarHoverItem>
                      )}
                      {(hasPermission('Borrow History', 'view') ||
                        hasPermission('Asset Borrowing', 'view')) && (
                        <SidebarHoverItem
                          active={
                            location.pathname === '/reports' &&
                            reportSection === 'borrow'
                          }
                        >
                          <button
                            onClick={() => navigate('/reports?section=borrow')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/reports' &&
                                reportSection === 'borrow'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <HandHelping className="h-4 w-4 flex-shrink-0" />
                            <span>Borrow History</span>
                          </button>
                        </SidebarHoverItem>
                      )}
                      {(hasPermission('Asset Request History', 'view') ||
                        hasPermission('Asset Request', 'view')) && (
                        <SidebarHoverItem
                          active={
                            location.pathname === '/reports' &&
                            reportSection === 'assetRequest'
                          }
                        >
                          <button
                            onClick={() => navigate('/reports?section=assetRequest')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/reports' &&
                                reportSection === 'assetRequest'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <PlusCircle className="h-4 w-4 flex-shrink-0" />
                            <span>Asset Request History</span>
                          </button>
                        </SidebarHoverItem>
                      )}
                    </div>
                  </div>
                </li>
              )}
              {hasPermission('Audit Trail', 'view') && (
                <li>
                  <SidebarHoverItem
                    active={matchesPath('/audit')}
                  >
                    <button
                      onClick={() => navigate('/audit')}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-200 justify-start',
                        matchesPath('/audit')
                          ? 'bg-white/20 text-white shadow-md'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <FileSearch className="h-5 w-5 flex-shrink-0" />
                      <span>Audit Trail</span>
                    </button>
                  </SidebarHoverItem>
                </li>
              )}

              {hasPermission('Settings', 'view') && (
                <li>
                  <SidebarHoverItem active={matchesPath('/settings')}>
                    <button
                      onClick={() => navigate('/settings')}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-200 justify-start',
                        matchesPath('/settings')
                          ? 'bg-white/20 text-white shadow-md'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <Settings2 className="h-5 w-5 flex-shrink-0" />
                      <span>Settings</span>
                    </button>
                  </SidebarHoverItem>
                </li>
              )}

              <li>
                <SidebarHoverItem
                  active={
                    location.pathname === '/user-manual' ||
                    location.pathname === '/flow-diagrams'
                  }
                >
                  <button
                    type="button"
                    onClick={() => setUserManualOpen(!userManualOpen)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-200 justify-between',
                      location.pathname === '/user-manual' ||
                        location.pathname === '/flow-diagrams'
                        ? 'bg-white/20 text-white shadow-md'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 flex-shrink-0" />
                      <span>User Manual</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        userManualOpen && 'rotate-180'
                      )}
                    />
                  </button>
                </SidebarHoverItem>

                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    userManualOpen
                      ? 'max-h-[500px] opacity-100'
                      : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="mt-1 space-y-1 pl-10">
                    <SidebarHoverItem
                      active={location.pathname === '/user-manual'}
                    >
                      <button
                        onClick={() => navigate('/user-manual')}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                          location.pathname === '/user-manual'
                            ? 'bg-white/15 text-white font-medium'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span>User Manual</span>
                      </button>
                    </SidebarHoverItem>
                    <SidebarHoverItem
                      active={location.pathname === '/flow-diagrams'}
                    >
                      <button
                        onClick={() => navigate('/flow-diagrams')}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                          location.pathname === '/flow-diagrams'
                            ? 'bg-white/15 text-white font-medium'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span>Flow Diagrams</span>
                      </button>
                    </SidebarHoverItem>
                  </div>
                </div>
              </li>
            </ul>
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        <div className="p-3 border-t border-white/10">
          <SidebarHoverItem>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full flex items-center justify-start text-white hover:text-white hover:bg-white/20 transition-all duration-200"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className="ml-3">Logout</span>
            </Button>
          </SidebarHoverItem>
        </div>
      </div>
    </TooltipProvider>
  );
}
