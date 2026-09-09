'use client';

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { RouteContentFallback } from '@/components/common/pageSkeletons';
import { motion } from 'framer-motion';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { IdleTimerDialog } from '@/components/IdleTimerDialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Search } from 'lucide-react';
import calendarIcon from '@/assets/icons/calendar.png';
import Sidebar from '../sidebar';
import logo from '@/assets/Blackcoders-Black.png';
import logoWhite from '@/assets/Blackcoders - White.png';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/NotificationBell';
import PasswordExpirationWarning from '@/components/auth/PasswordExpirationWarning';

import { AvatarPreviewProvider } from '@/hooks/avatarPreview';
import { CompanyProvider, useCompanyContext } from '@/context/CompanyContext';
import { CompanyFilter } from '@/components/CompanyFilter';
import ThemeToggle from '@/components/common/ThemeToggle';
import { useTheme } from '@/hooks/use-theme';
import { TooltipProvider } from '@/components/ui/tooltip';

import { Shimmer } from '@/components/ui/shimmer';

function ProtectedLayoutShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const today = useMemo(() => new Date(), []);
  const { loading: companyLoading } = useCompanyContext();
  const { theme } = useTheme();

  const [isCalOpen, setIsCalOpen] = useState(false);
  const [isCalLoading, setIsCalLoading] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isHeaderLoading = companyLoading;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const { showDialog, setShowDialog, onStay, onLogout: onIdleLogout, warningTime } = useIdleTimer();

  const handleLogout = useCallback(() => {
    const persistedTheme = localStorage.getItem("am-theme");
    localStorage.clear();
    if (persistedTheme === "light" || persistedTheme === "dark") {
      localStorage.setItem("am-theme", persistedTheme);
    }
    sessionStorage.clear();
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
        <TooltipProvider delayDuration={150}>
        <div className="app-shell relative flex h-screen overflow-hidden bg-background">
        <div className="hidden md:flex items-center justify-center fixed bottom-[87vh] left-0 z-20 h-[18vh] min-h-[80px] pl-2 pt-4 w-[260px]">
          <img
            src={theme === "dark" ? logoWhite : logo}
            alt="Blackcoders Logo"
            className="h-20 w-auto object-contain drop-shadow-md"
          />
        </div>

        <aside className="hidden md:block w-64 pt-6 pb-6 fixed bottom-0 left-0 z-10 h-[90vh] overflow-y-auto shadow-inner ring-1 ring-gray-200 rounded-tr-[210px] bg-gradient-to-t from-[#881115] to-[#EE1D25]">
          <Sidebar onLogout={handleLogout} currentPath={location.pathname} currentSearch={location.search} />
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 md:hidden bg-white/90 backdrop-blur shadow-lg rounded-full"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[min(16rem,88vw)] rounded-tr-[210px] border-r-0 p-0 bg-gradient-to-t from-[#881115] to-[#EE1D25] shadow-inner ring-1 ring-white/10 overflow-y-auto"
        >
          <Sidebar onLogout={handleLogout} currentPath={location.pathname} currentSearch={location.search} />
        </SheetContent>
        </Sheet>

        <header className="fixed top-0 left-0 md:left-64 right-0 h-24 z-30 px-4 md:px-9">
          <div className="flex items-center justify-end h-full gap-2 md:gap-4">
            <ThemeToggle />
            {isHeaderLoading ? (
              <Button
                variant="ghost"
                size="icon"
                className="relative h-14 w-14 rounded-full bg-white/10 backdrop-blur shadow-lg"
              >
                <Shimmer className="h-8 w-8 rounded-full" />
                <Shimmer className="absolute -top-1 -right-1 h-6 w-6 rounded-full" />
              </Button>
            ) : (
              <NotificationBell />
            )}

            {/* Search Bar */}
            {isHeaderLoading ? (
              <div className="w-40 md:w-60 h-14 rounded-full border border-white/20 bg-white/10 backdrop-blur shadow-lg flex items-center px-5">
                <Search className="h-5 w-5 text-gray-400 mr-3" />
                <Shimmer className="h-4 w-20 md:w-40 rounded" />
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-40 md:w-60 h-14 pl-14 pr-6 rounded-full border border-white/20 bg-white/10 backdrop-blur text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-lg hover:shadow-xl"
                />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
            )}

            {/* Company Filter */}
            <CompanyFilter />

            {/* Calendar Popover */}
            <div className="hidden sm:block">
              <Popover
                open={isCalOpen}
                onOpenChange={open => {
                  setIsCalOpen(open);
                  if (open) setIsCalLoading(true);
                  setTimeout(() => setIsCalLoading(false), 600);
                }}
              >
                <PopoverTrigger asChild>
                  {isHeaderLoading ? (
                    <Button
                      variant="outline"
                      className="h-14 w-60 md:w-80 rounded-full border border-white/20 bg-white/10 backdrop-blur shadow-lg flex items-center justify-center gap-4 md:gap-6 px-4 md:px-6"
                    >
                      <div className="flex items-center gap-3">
                        <Shimmer className="w-10 h-10 rounded-full" />
                        <div className="text-left space-y-1.5 hidden md:block">
                          <Shimmer className="h-3 w-20 rounded" />
                          <Shimmer className="h-5 w-32 rounded" />
                        </div>
                        <Shimmer className="h-6 w-6 rounded ml-2 md:ml-4" />
                      </div>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-14 w-60 md:w-80 rounded-full border border-white/20 bg-white/10 backdrop-blur hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-4 md:gap-6 px-4 md:px-6 shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md">
                          <span className="text-lg font-extrabold text-white">
                            {format(today, 'd')}
                          </span>
                        </div>
                        <div className="text-left hidden md:block">
                          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {format(today, 'EEEE')}
                          </div>
                          <div className="text-lg font-bold text-foreground">
                            {format(today, 'MMMM yyyy')}
                          </div>
                        </div>
                        <img
                          src={calendarIcon}
                          alt="Calendar"
                          className="h-6 w-6 ml-2 md:ml-4"
                        />
                      </div>
                    </Button>
                  )}
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 mt-2 mr-3 border border-border bg-card"
                  align="end"
                  sideOffset={10}
                >
                  {isCalLoading ? (
                    /* Calendar shimmer */
                    <div className="p-4 bg-card rounded-xl shadow-2xl">
                      {' '}
                      {/* ... your shimmer ... */}{' '}
                    </div>
                  ) : (
                    <Card className="border-0 shadow-2xl overflow-hidden">
                      <CardContent className="p-1 bg-card">
                        <Calendar
                          mode="single"
                          selected={today}
                          defaultMonth={today}
                          className="rounded-xl border-0"
                          components={{
                            Day: ({ day, ...props }) => {
                              if (!day?.date)
                                return <div className="h-11 w-11" />;
                              const isToday =
                                day.date.toDateString() ===
                                today.toDateString();
                              return (
                                <div
                                  {...props}
                                  className={cn(
                                    'h-11 w-11 flex items-center justify-center rounded-full text-base font-semibold transition-all hover:bg-gray-100 cursor-pointer',
                                    isToday &&
                                      'bg-[#EE1D25] text-white font-bold shadow-lg hover:bg-[#EE1D25]/90'
                                  )}
                                >
                                  <motion.span
                                    className="flex h-full w-full items-center justify-center"
                                    whileHover={{ scale: 1.05, y: -1 }}
                                    transition={{
                                      type: 'spring',
                                      stiffness: 420,
                                      damping: 28,
                                      mass: 0.55,
                                    }}
                                  >
                                    {day.date.getDate()}
                                  </motion.span>
                                </div>
                              );
                            },
                          }}
                        />
                      </CardContent>
                    </Card>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="app-main flex-1 md:ml-64 pt-20 pb-8 px-0 overflow-auto bg-background">
          <Suspense fallback={<RouteContentFallback />}>
            <Outlet />
          </Suspense>
        </main>

        {/* Password Expiration Warning Dialog */}
        <PasswordExpirationWarning />

        {/* Idle Timer Dialog */}
        <IdleTimerDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          warningTime={warningTime}
          onStay={onStay}
          onLogout={onIdleLogout}
        />
      </div>
      </TooltipProvider>
  );
}

export default function ProtectedLayout() {
  return (
    <CompanyProvider>
      <AvatarPreviewProvider>
        <ProtectedLayoutShell />
      </AvatarPreviewProvider>
    </CompanyProvider>
  );
}
