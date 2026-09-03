'use client';

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import FloatingHelpButton from '@/components/common/FloatingHelpButton';
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

const TRANSITION_EASING: [number, number, number, number] = [0.65, 0, 0.35, 1];

const AUTH_BACKDROP: Record<AuthScene, { red: string; white: string }> = {
  login: {
    red: 'M760 -120 C620 130 555 315 720 455 C900 608 610 715 510 900 L1440 900 L1440 -120 Z',
    white:
      'M835 -120 C700 128 640 318 805 455 C980 600 705 720 610 900 L1440 900 L1440 -120 Z',
  },
  register: {
    red: 'M680 -120 C820 130 885 315 720 455 C540 608 830 715 930 900 L0 900 L0 -120 Z',
    white:
      'M605 -120 C740 128 800 318 635 455 C460 600 735 720 830 900 L0 900 L0 -120 Z',
  },
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
        transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: TRANSITION_EASING }}
      />
      <motion.path
        fill="#ffffff"
        initial={false}
        animate={{ d: AUTH_BACKDROP[scene].white }}
        transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: TRANSITION_EASING, delay: 0.08 }}
      />
    </svg>
  );
}

function GhostRegisterPanel({ scene }: { scene: AuthScene }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-[5vw] top-1/2 z-10 hidden w-[31rem] -translate-y-1/2 lg:block"
      initial={false}
      animate={{
        opacity: scene === 'login' ? 0.08 : 0.18,
        y: scene === 'login' ? 0 : -8,
        scale: scene === 'login' ? 1 : 1.02,
      }}
      transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: TRANSITION_EASING }}
      aria-hidden="true"
    >
      <div className="mx-auto mb-8 h-16 w-64 rounded-sm border border-red-600/20" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-9 rounded-sm border border-red-500/10 bg-white/[0.12]"
          />
        ))}
      </div>
      <div className="mx-auto mt-5 h-9 w-40 rounded-sm bg-red-700/35" />
      <div className="mx-auto mt-4 h-8 w-80 rounded-sm bg-white/[0.12]" />
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
  const [scene, setScene] = useState<AuthScene>('login');
  const [isRouting, setIsRouting] = useState(false);

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
      if (response.message) {
        setToken('authenticated');
        toast.success('Logged in!');

        // Show warning if password is expiring soon
        if (response.passwordExpiringSoon && response.daysRemaining) {
          toast.warning(
            `Your password will expire in ${response.daysRemaining} day(s). Please change it soon.`,
            { duration: 8000 }
          );
        }

        navigateToDashboard();
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
      navigate('/register');
    }, AUTH_TRANSITION_MS);
  };

  const goToForgotPassword = () => {
    if (isRouting) return;
    setIsRouting(true);
    setTimeout(() => {
      navigate('/forgot-password');
    }, 350);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <AuthBackdrop scene={scene} />
      <GhostRegisterPanel scene={scene} />

      {isRouting && (
        <motion.div
          className="absolute inset-0 z-30 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: TRANSITION_EASING }}
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(0,0,0,0.55) 100%)',
          }}
        />
      )}

      <form
        onSubmit={handleLogin}
        className="relative z-20 flex min-h-screen w-full items-center justify-center px-4 py-8 lg:justify-end lg:pl-[38vw] lg:pr-[8vw]"
        style={{ perspective: '1000px' as unknown as React.CSSProperties['perspective'] }}
      >
        <motion.div
          className="w-full max-w-md"
          style={{ transformStyle: 'preserve-3d' }}
          initial={false}
          animate={{
            opacity: scene === 'login' && !isRouting ? 1 : 0,
            scale: scene === 'login' && !isRouting ? 1 : 0.92,
            rotateY: scene === 'login' && !isRouting ? 0 : -90,
          }}
          transition={{
            duration: AUTH_TRANSITION_MS / 1000,
            ease: TRANSITION_EASING,
          }}
        >
          <div className="flex flex-col items-center">
            <div className="mb-6 w-52 drop-shadow-md sm:w-64 lg:w-[29rem] lg:drop-shadow-lg">
              <img src={logo} alt="Blackcoders" className="w-full h-auto" />
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
                    placeholder="********"
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
                    onClick={goToForgotPassword}
                    disabled={isRouting}
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
      <FloatingHelpButton section="login" />
    </div>
  );
}
