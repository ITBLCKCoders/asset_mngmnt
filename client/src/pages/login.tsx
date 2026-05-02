'use client';

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '@/assets/Blackcoders-Black.png';
import { api } from '@/lib/api';
import { setToken, setRefreshToken } from '@/lib/api';
import { toast } from 'sonner';
import MFAVerificationModal from '@/components/auth/MFAVerificationModal';
import ForcePasswordChangeDialog from '@/components/auth/ForcePasswordChangeDialog';

type AuthScene = 'login' | 'register';

const AUTH_TRANSITION_MS = 900;

const AUTH_BACKDROP: Record<AuthScene, { red: string; white: string }> = {
  login: {
    red: 'M640 -120 C570 20 520 125 690 245 C920 405 720 520 640 665 C560 805 560 905 520 1020 L1440 1020 L1440 -120 Z',
    white:
      'M695 -120 C625 25 575 130 745 250 C970 410 775 525 695 668 C615 810 615 905 575 1020 L1440 1020 L1440 -120 Z',
  },
  register: {
    red: 'M0 -120 C300 -120 700 -120 860 -120 C990 90 520 230 735 470 C965 720 940 850 1040 1020 L0 1020 L0 -120 Z',
    white:
      'M0 -120 C300 -120 675 -120 815 -120 C945 90 480 230 695 470 C920 720 895 850 995 1020 L0 1020 L0 -120 Z',
  },
};

const getInitialAuthScene = (
  state: unknown,
  fallback: AuthScene
): AuthScene => {
  if (
    state &&
    typeof state === 'object' &&
    'fromAuth' in state &&
    (state as { fromAuth?: unknown }).fromAuth === 'register'
  ) {
    return 'register';
  }

  return fallback;
};

function AuthBackdrop({ scene }: { scene: AuthScene }) {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <motion.path
        fill="#EE1D25"
        initial={false}
        animate={{ d: AUTH_BACKDROP[scene].red }}
        transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: 'easeInOut' }}
      />
      <motion.path
        fill="#ffffff"
        initial={false}
        animate={{ d: AUTH_BACKDROP[scene].white }}
        transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: 'easeInOut' }}
      />
    </svg>
  );
}

function GhostRegisterPanel({ scene }: { scene: AuthScene }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-[5vw] top-1/2 z-10 hidden w-[32rem] -translate-y-1/2 lg:block"
      initial={false}
      animate={{
        opacity: scene === 'login' ? 0.2 : 0.08,
        x: scene === 'login' ? 0 : -96,
        scale: scene === 'login' ? 1 : 0.96,
      }}
      transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <div className="mx-auto mb-8 h-16 w-56 rounded-sm border border-red-500/30" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-8 rounded-sm border border-white/10 bg-white/20"
          />
        ))}
      </div>
      <div className="mx-auto mt-5 h-9 w-36 rounded-sm bg-red-600/50" />
      <div className="mx-auto mt-5 h-8 w-72 rounded-sm bg-white/20" />
      <div className="mx-auto mt-3 h-8 w-72 rounded-sm bg-white/20" />
    </motion.div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState<string | null>(null);
  const [showForceChangeDialog, setShowForceChangeDialog] = useState(false);
  const [forceChangeTempToken, setForceChangeTempToken] = useState<string | null>(null);
  const [forceChangeMfaEnabled, setForceChangeMfaEnabled] = useState(false);
  const [forceChangeReason, setForceChangeReason] =
    useState<'mustChangePassword' | 'passwordExpired'>('mustChangePassword');
  const [forceChangeMessage, setForceChangeMessage] = useState<string>('');
  const [scene, setScene] = useState<AuthScene>(() =>
    getInitialAuthScene(location.state, 'login')
  );
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setScene('login'));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const navigateToDashboard = () => {
    const from = (
      location.state as { from?: { pathname?: string } } | null
    )?.from?.pathname;
    const destination =
      from && from !== '/login' && from.startsWith('/') ? from : '/';
    navigate(destination, { replace: true });
  };

  const handleMFAVerified = () => {
    setShowMFAModal(false);
    setMfaTempToken(null);
    navigateToDashboard();
  };

  const handleMFACancel = () => {
    setShowMFAModal(false);
    setMfaTempToken(null);
    setLoading(false);
  };

  const handleMFAOpenChange = (open: boolean) => {
    setShowMFAModal(open);
  };

  const handleBackToLogin = () => {
    setShowMFAModal(false);
    setMfaTempToken(null);
    setLoading(false);
  };

  const handleForceChangeDone = () => {
    setShowForceChangeDialog(false);
    setForceChangeTempToken(null);
    toast.success('Password changed successfully. Welcome!');
    navigateToDashboard();
  };

  const handleForceChangeCancel = () => {
    setShowForceChangeDialog(false);
    setForceChangeTempToken(null);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post<{
        accessToken?: string;
        refreshToken?: string;
        mfaRequired?: boolean;
        mustChangePassword?: boolean;
        passwordExpired?: boolean;
        mfaEnabled?: boolean;
        tempToken?: string;
        message?: string;
        passwordExpiringSoon?: boolean;
        daysRemaining?: number;
      }>('/auth/login', {
        email,
        password,
      });

      // Check if admin forced password change
      if (response.mustChangePassword) {
        setForceChangeTempToken(response.tempToken || null);
        setForceChangeMfaEnabled(!!response.mfaEnabled);
        setForceChangeReason('mustChangePassword');
        setForceChangeMessage(response.message || '');
        setShowForceChangeDialog(true);
        return;
      }

      // Check if password expired
      if (response.passwordExpired) {
        setForceChangeTempToken(response.tempToken || null);
        setForceChangeMfaEnabled(!!response.mfaEnabled);
        setForceChangeReason('passwordExpired');
        setForceChangeMessage(response.message || '');
        setShowForceChangeDialog(true);
        return;
      }

      // Check if MFA is required
      if (response.mfaRequired) {
        setMfaTempToken(response.tempToken || null);
        setShowMFAModal(true);
        return;
      }

      // Normal login flow (no MFA required)
      if (response.accessToken && response.refreshToken) {
        setToken(response.accessToken);
        setRefreshToken(response.refreshToken);
        toast.success('Logged in!');

        // Show warning if password is expiring soon
        if (response.passwordExpiringSoon && response.daysRemaining) {
          toast.warning(
            `Your password will expire in ${response.daysRemaining} day(s). Please change it soon.`,
            { duration: 8000 }
          );
        }

        // Small delay to ensure cookies are properly set before navigation
        // This prevents race condition where AuthContext tries to validate
        // session before cookies are available
        setTimeout(() => {
          navigateToDashboard();
        }, 100);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => {
    if (isRouting) return;
    setIsRouting(true);
    setScene('register');
    setTimeout(() => {
      navigate('/register', { state: { fromAuth: 'login' } });
    }, AUTH_TRANSITION_MS);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <AuthBackdrop scene={scene} />
      <GhostRegisterPanel scene={scene} />

      <form
        onSubmit={handleLogin}
        className="relative z-20 flex min-h-screen w-full items-center justify-center px-4 py-8 lg:justify-end lg:pr-[8vw]"
      >
        <motion.div
          className="w-full max-w-md"
          initial={false}
          animate={{
            opacity: scene === 'login' ? 1 : 0,
            x: scene === 'login' ? 0 : -180,
            scale: scene === 'login' ? 1 : 0.96,
          }}
          transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: 'easeInOut' }}
        >
          <div className="flex flex-col items-center rounded-lg bg-white/95 p-6 shadow-xl backdrop-blur-sm lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
            <div className="mb-7 w-52 drop-shadow-md sm:w-64 lg:w-[26rem] lg:drop-shadow-lg">
              <img src={logo} alt="Blackcoders" className="h-auto w-full" />
            </div>

            <div className="w-full space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-black text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-white backdrop-blur-sm border-2 border-gray-300 focus:ring-2 focus:ring-red-500 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pwd" className="text-black text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="pwd"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="bg-white/90 backdrop-blur-sm border-2 border-gray-300 focus:ring-2 focus:ring-red-500 py-2 text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="text-left">
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:text-red-700 underline bg-white px-3 py-1 rounded-md shadow-sm"
                    onClick={() => navigate('/forgot-password')}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full max-w-xs bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Logging in...
                    </>
                  ) : (
                    'Log in'
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={goToRegister}
                  disabled={isRouting}
                  variant="ghost"
                  className="w-full max-w-xs text-red-600 hover:bg-red-600 hover:text-white text-sm py-2 shadow-none"
                >
                  Create an account
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </form>

      <MFAVerificationModal
        isOpen={showMFAModal}
        tempToken={mfaTempToken}
        onVerified={handleMFAVerified}
        onCancel={handleMFACancel}
        onOpenChange={handleMFAOpenChange}
        onBackToLogin={handleBackToLogin}
      />

      <ForcePasswordChangeDialog
        isOpen={showForceChangeDialog}
        tempToken={forceChangeTempToken}
        mfaEnabled={forceChangeMfaEnabled}
        reason={forceChangeReason}
        message={forceChangeMessage}
        onChanged={handleForceChangeDone}
        onCancel={handleForceChangeCancel}
      />
    </div>
  );
}
