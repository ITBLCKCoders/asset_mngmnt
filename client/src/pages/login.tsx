'use client';

import { useState } from 'react';
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
  const [isAnimating, setIsAnimating] = useState(false);

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
    setIsAnimating(true);
    setTimeout(() => {
      navigate('/register');
    }, 1000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0">
        <svg
          className="w-full h-full"
          viewBox="0 0 320 1440"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            fill="#EE1D25"
            d="M115,1750 C-60,1000 400,-390 100,-50 L320,0 L320,1440 Z"
            animate={isAnimating ? { d: "M215,1750 C40,1000 500,-390 200,-50 L420,0 L420,1440 Z" } : { d: "M115,1750 C-60,1000 400,-390 100,-50 L320,0 L320,1440 Z" }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
          <motion.path
            fill="#ffffff"
            d="M86,1590 C-10,760 500,-210 20,-370 L553380,0 L280,1440 Z"
            animate={isAnimating ? { d: "M186,1590 C90,760 600,-210 120,-370 L553480,0 L380,1440 Z" } : { d: "M86,1590 C-10,760 500,-210 20,-370 L553380,0 L280,1440 Z" }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </svg>
      </div>

      <form
        onSubmit={handleLogin}
        className="absolute inset-0 flex items-center justify-center p-4 lg:left-[77%] lg:top-1/2 lg:-translate-y-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-xl lg:p-0 lg:ml-8 lg:mt-12 z-10"
      >
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 1, scale: 1 }}
          animate={isAnimating ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-xl lg:bg-transparent lg:backdrop-blur-none lg:rounded-none lg:p-0 lg:shadow-none flex flex-col items-center">
            <div className="w-40 h-auto mb-4 drop-shadow-md sm:w-48 md:w-56 lg:absolute lg:right-1/2 lg:-top-20 lg:translate-x-1/2 lg:w-[600px] lg:mb-0 lg:drop-shadow-lg lg:pointer-events-none">
              <img src={logo} alt="Blackcoders" className="w-full h-auto" />
            </div>

            <div className="w-full space-y-4 lg:pt-20">
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
                    placeholder="••••••••"
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
                      Logging in…
                    </>
                  ) : (
                    'Log in'
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={goToRegister}
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
