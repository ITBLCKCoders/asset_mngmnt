'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/Blackcoders-Black.png';
import { motion } from 'framer-motion';

const AUTH_TRANSITION_MS = 350;

const LOGIN_BACKDROP = {
  red: 'M760 -120 C620 130 555 315 720 455 C900 608 610 715 510 900 L1440 900 L1440 -120 Z',
  white:
    'M835 -120 C700 128 640 318 805 455 C980 600 705 720 610 900 L1440 900 L1440 -120 Z',
};

function AuthBackdrop() {
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
        animate={{ d: LOGIN_BACKDROP.red }}
        transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: 'easeInOut' }}
      />
      <motion.path
        fill="#ffffff"
        initial={false}
        animate={{ d: LOGIN_BACKDROP.white }}
        transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: 'easeInOut' }}
      />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    localStorage.removeItem('resetChannel');
    localStorage.removeItem('resetContactNumber');
    localStorage.removeItem('resetOtpExpiryTime');
    localStorage.setItem('resetEmail', email.trim());
    setIsLeaving(true);
    setTimeout(() => {
      navigate('/reset-method-selection');
    }, AUTH_TRANSITION_MS);
  };

  const goBackToLogin = () => {
    if (isLeaving) return;
    setIsLeaving(true);
    setTimeout(() => {
      navigate('/login');
    }, AUTH_TRANSITION_MS);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <AuthBackdrop />

      <form
        onSubmit={handleSubmit}
        className="relative z-20 flex min-h-screen w-full items-center justify-center px-4 py-8 lg:justify-end lg:pl-[38vw] lg:pr-[8vw]"
      >
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, x: 72, scale: 0.96 }}
          animate={{
            opacity: isLeaving ? 0 : 1,
            x: isLeaving ? -72 : 0,
            scale: isLeaving ? 0.96 : 1,
          }}
          transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: 'easeInOut' }}
        >
          <div className="flex flex-col items-center rounded-lg bg-white/95 p-6 shadow-xl backdrop-blur-sm lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
            <div className="mb-6 w-52 drop-shadow-md sm:w-64 lg:w-[29rem] lg:drop-shadow-lg">
              <img src={logo} alt="Blackcoders" className="w-full h-auto" />
            </div>

            <div className="w-full space-y-4">
              <div className="space-y-1">
                <p className="text-2xl font-semibold text-black">Forgot Password</p>
                <p className="text-sm text-gray-700">
                  Enter your email to continue
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-black text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-white border-2 border-gray-300 focus:ring-2 focus:ring-red-500 py-2 text-sm"
                />
              </div>

              <div className="flex flex-col items-center gap-3 pt-1">
                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full max-w-xs bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2"
                >
                  {loading ? (
                    <span className="inline-block h-4 w-24 animate-pulse rounded bg-white/40" />
                  ) : (
                    'Continue'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={goBackToLogin}
                  disabled={isLeaving}
                  className="text-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
