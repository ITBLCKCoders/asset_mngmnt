'use client';

import { useLocation, useNavigate } from 'react-router-dom';
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
import {
  clearCurrentUserCache,
  useCurrentUser,
} from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAvatarPreview } from '@/hooks/avatarPreview';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { api, setToken } from '@/lib/api';
import { ASSET_SIDEBAR_ENTRIES } from '@/components/sidebar/sidebarConfig';
import { SidebarHoverItem } from '@/components/sidebar/SidebarHoverItem';
import {
  prefetchRoute,
  prefetchRoutes,
  SIDEBAR_ROUTE_PATHS,
} from '@/components/sidebar/routePrefetch';

interface SidebarProps {
  onLogout?: () => void;
}



const Sidebar = memo(function Sidebar({ onLogout }: SidebarProps) {

  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useCurrentUser();
  const { hasPermission } = useUserPermissions();
  const { previewUrl, clearPreview } = useAvatarPreview();

  const go = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const prefetch = useCallback(
    (path: string) => ({
      onMouseEnter: () => prefetchRoute(path),
      onFocus: () => prefetchRoute(path),
    }),
    []
  );

  const prefetchMany = useCallback(
    (paths: readonly string[]) => ({
      onMouseEnter: () => prefetchRoutes(paths),
      onFocus: () => prefetchRoutes(paths),
    }),
    []
  );

  const savedAvatarUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (user?.avatarUrl && user.avatarUrl !== savedAvatarUrlRef.current) {
      savedAvatarUrlRef.current = user.avatarUrl;
      clearPreview();
    }
  }, [user?.avatarUrl, clearPreview]);

  const [userFormsOpen, setUserFormsOpen] = useState(false);
  const [userReportsOpen, setUserReportsOpen] = useState(false);
  const [userManualOpen, setUserManualOpen] = useState(false);
  const [userAssetsOpen, setUserAssetsOpen] = useState(false);
  const [userAssetNestedOpen, setUserAssetNestedOpen] = useState<Record<string, boolean>>({});

  const formsOpenMatch = useMemo(() => {
    const p = location.pathname;
    return (
      p === '/forms/accountability' ||
      p === '/forms/borrow' ||
      p === '/forms/checklist' ||
      p === '/forms/return' ||
      p === '/forms/transfer' ||
      p === '/approvals'
    );
  }, [location.pathname]);
  const formsOpen = userFormsOpen || formsOpenMatch;

  const reportsOpenMatch = useMemo(() => {
    const p = location.pathname;
    return p.startsWith('/reports') || p.startsWith('/history/');
  }, [location.pathname]);
  const reportsOpen = userReportsOpen || reportsOpenMatch;

  const manualOpenMatch = useMemo(() => {
    const p = location.pathname;
    return p === '/user-manual' || p === '/flow-diagrams';
  }, [location.pathname]);
  const manualOpen = userManualOpen || manualOpenMatch;

  const assetsOpenMatch = useMemo(() => {
    const p = location.pathname;
    return p.startsWith('/assets') && p !== '/assets/my-assets';
  }, [location.pathname]);
  const assetsOpen = userAssetsOpen || assetsOpenMatch;

  const assetNestedOpen = useMemo(() => {
    const path = location.pathname;
    const routeMatch: Record<string, boolean> = {};
    if (
      path === '/assets/borrow' ||
      path.startsWith('/assets/borrow-requests')
    ) {
      routeMatch['assets-borrow'] = true;
    }
    if (path.startsWith('/assets/transfer-request')) {
      routeMatch['assets-transfer-request'] = true;
    } else if (
      path === '/assets/transfer' ||
      path.startsWith('/assets/transfer-requests')
    ) {
      routeMatch['assets-transfer'] = true;
    }
    if (path.startsWith('/assets/return-request')) {
      routeMatch['assets-return-request'] = true;
    } else if (
      path === '/assets/return' ||
      path.startsWith('/assets/return-requests')
    ) {
      routeMatch['assets-return'] = true;
    }
    return { ...userAssetNestedOpen, ...routeMatch };
  }, [location.pathname, userAssetNestedOpen]);

  const displayAvatarUrl = previewUrl || user?.avatarUrl;

  const handleProfileClick = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  const initials = useMemo(
    () =>
      user?.username
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) ?? 'GU',
    [user?.username]
  );

  const matchesPath = useCallback(
    (path: string) => {
      if (path === '/assets') {
        return location.pathname === '/assets';
      }
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    },
    [location.pathname]
  );
  const reportSection = new URLSearchParams(location.search).get('section');

  // Eagerly warm-load all lazy route chunks so navigation feels instant
  useEffect(() => {
    prefetchRoutes(SIDEBAR_ROUTE_PATHS);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.post('/auth/logout').catch(() => {});
    } finally {
      clearCurrentUserCache();
      localStorage.removeItem('mfaTempToken');
      sessionStorage.clear();
      document.cookie.split(';').forEach(c => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
      setToken(null);
      onLogout?.();
      navigate('/login', { replace: true });
    }
  }, [navigate, onLogout]);

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
              <button
                onClick={handleProfileClick}
                className="group focus:outline-none focus:ring-2 focus:ring-white/30 rounded-full transition-[transform,box-shadow] duration-150 ease-out hover:scale-105 hover:ring-4 hover:ring-white/40 active:scale-95"
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
              </button>
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
                      onClick={() => go('/dashboard')} {...prefetch('/dashboard')}
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
                      onClick={() => go('/my-assets')} {...prefetch('/my-assets')}
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
                hasPermission('Checklist Form', 'view') ||
                hasPermission('Borrow Form', 'view') ||
                hasPermission('Return Form', 'view') ||
                hasPermission('Transfer Form', 'view') ||
                hasPermission('Approvals', 'view')) && (
                <li>
                  <SidebarHoverItem
                    active={
                      location.pathname === '/forms/accountability' ||
                      location.pathname === '/forms/borrow' ||
                      location.pathname === '/forms/checklist' ||
                      location.pathname === '/forms/return' ||
                      location.pathname === '/forms/transfer' ||
                      location.pathname === '/approvals' ||
                      formsOpen
                    }
                  >
                    <button
                      onClick={() => setUserFormsOpen(!formsOpen)} {...prefetchMany(['/forms/accountability', '/forms/checklist', '/forms/borrow', '/forms/return', '/forms/transfer', '/approvals'])}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-200 justify-between',
                        location.pathname === '/forms/accountability' ||
                          location.pathname === '/forms/borrow' ||
                          location.pathname === '/forms/checklist' ||
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
                            onClick={() => go('/forms/accountability')} {...prefetch('/forms/accountability')}
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
                      {hasPermission('Checklist Form', 'view') && (
                        <SidebarHoverItem
                          active={location.pathname === '/forms/checklist'}
                        >
                          <button
                            onClick={() => go('/forms/checklist')} {...prefetch('/forms/checklist')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/forms/checklist'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span>Checklist forms</span>
                          </button>
                        </SidebarHoverItem>
                      )}
                      {hasPermission('Borrow Form', 'view') && (
                        <SidebarHoverItem
                          active={location.pathname === '/forms/borrow'}
                        >
                          <button
                            onClick={() => go('/forms/borrow')} {...prefetch('/forms/borrow')}
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
                            onClick={() => go('/forms/return')} {...prefetch('/forms/return')}
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
                            onClick={() => go('/forms/transfer')} {...prefetch('/forms/transfer')}
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
                            onClick={() => go('/approvals')} {...prefetch('/approvals')}
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
                hasPermission('Borrow Request Management', 'view') ||
                hasPermission('Gate Pass', 'view')) && (
                <li>
                  <SidebarHoverItem
                    active={
                      (location.pathname.startsWith('/assets') &&
                        location.pathname !== '/assets/my-assets') ||
                      assetsOpen
                    }
                  >
                    <button
                      onClick={() => setUserAssetsOpen(!assetsOpen)} {...prefetchMany(ASSET_SIDEBAR_ENTRIES.flatMap(e => [e.path, ...(e.children?.map(c => c.path) ?? [])]))}
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
                                onClick={() => go(child.path)} {...prefetch(child.path)}
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
                                onClick={() => go(entry.path)} {...prefetch(entry.path)}
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
                                  onClick={() => go(entry.path)} {...prefetch(entry.path)}
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
                                    setUserAssetNestedOpen((prev: Record<string, boolean>) => ({
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
                                      onClick={() => go(child.path)} {...prefetch(child.path)}
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
                      onClick={() => go('/user')} {...prefetch('/user')}
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
                        onClick={() => go('/reports')} {...prefetch('/reports')}
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
                        onClick={() => setUserReportsOpen(!reportsOpen)} {...prefetch('/reports')}
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
                            onClick={() => go('/reports?section=assignment')} {...prefetch('/reports')}
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
                            onClick={() => go('/reports?section=return')} {...prefetch('/reports')}
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
                            onClick={() => go('/reports?section=transfer')} {...prefetch('/reports')}
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
                            onClick={() => go('/reports?section=maintenance')} {...prefetch('/reports')}
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
                            onClick={() => go('/reports?section=repair')} {...prefetch('/reports')}
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
                            onClick={() => go('/reports?section=borrow')} {...prefetch('/reports')}
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
                      {hasPermission('Reports', 'view') && (
                        <SidebarHoverItem
                          active={
                            location.pathname === '/reports' &&
                            reportSection === 'finance'
                          }
                        >
                          <button
                            onClick={() => go('/reports?section=finance')} {...prefetch('/reports')}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-all duration-200',
                              location.pathname === '/reports' &&
                                reportSection === 'finance'
                                ? 'bg-white/15 text-white font-medium'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <BarChart3 className="h-4 w-4 flex-shrink-0" />
                            <span>Finance Reports</span>
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
                            onClick={() => go('/reports?section=assetRequest')} {...prefetch('/reports')}
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
                      onClick={() => go('/audit')} {...prefetch('/audit')}
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
                      onClick={() => go('/settings')} {...prefetch('/settings')}
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
                    onClick={() => setUserManualOpen(!manualOpen)} {...prefetchMany(['/user-manual', '/flow-diagrams'])}
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
                        manualOpen && 'rotate-180'
                      )}
                    />
                  </button>
                </SidebarHoverItem>

                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    manualOpen
                      ? 'max-h-[500px] opacity-100'
                      : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="mt-1 space-y-1 pl-10">
                    <SidebarHoverItem
                      active={location.pathname === '/user-manual'}
                    >
                      <button
                        onClick={() => go('/user-manual')} {...prefetch('/user-manual')}
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
                        onClick={() => go('/flow-diagrams')} {...prefetch('/flow-diagrams')}
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
});

export default Sidebar;
