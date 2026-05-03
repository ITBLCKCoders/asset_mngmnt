'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import logo from '@/assets/Blackcoders-Black.png';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

type ResetChannel = 'email' | 'sms';

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

export default function ResetMethodSelectionPage() {
  const navigate = useNavigate();
  const [channel, setChannel] = useState<ResetChannel>('email');
  const [loading, setLoading] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const email = useMemo(() => localStorage.getItem('resetEmail') || '', []);

  useEffect(() => {
    if (!email.trim()) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleContinue = async () => {
    if (!email.trim()) {
      toast.error('Email is required');
      navigate('/forgot-password');
      return;
    }

    setLoading(true);
    try {
      const { message, contactNumber, effectiveChannel } = await api.post<{
        message: string;
        contactNumber?: string;
        effectiveChannel?: 'email' | 'sms';
      }>('/auth/forgot-password', {
        channel,
        email,
      });

      const actualChannel = effectiveChannel || channel;
      localStorage.setItem('resetChannel', actualChannel);
      if (actualChannel === 'sms' && contactNumber) {
        localStorage.setItem('resetContactNumber', contactNumber);
      } else {
        localStorage.removeItem('resetContactNumber');
      }
      localStorage.setItem('resetEmail', email);
      localStorage.setItem(
        'resetOtpExpiryTime',
        (Date.now() + 10 * 60 * 1000).toString()
      );

      if (channel === 'sms' && effectiveChannel === 'email') {
        toast.success('SMS failed. OTP sent via Email instead.', {
          description: 'Please check your email for the reset code.',
        });
      } else {
        toast.success(message);
      }
      setIsLeaving(true);
      setTimeout(() => {
        navigate('/verify-reset-otp');
      }, AUTH_TRANSITION_MS);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <AuthBackdrop />

      <div className="relative z-20 flex min-h-screen w-full items-center justify-center px-4 py-8 lg:justify-end lg:pl-[38vw] lg:pr-[8vw]">
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
                <p className="text-2xl font-semibold text-black">Choose Verification Method</p>
                <p className="text-sm text-gray-700">
                  Send reset code for <strong>{email}</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  className={`rounded-md border-2 px-4 py-3 text-sm font-medium transition-colors ${
                    channel === 'email'
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-red-400'
                  }`}
                >
                  Email OTP
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  className={`rounded-md border-2 px-4 py-3 text-sm font-medium transition-colors ${
                    channel === 'sms'
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-red-400'
                  }`}
                >
                  SMS OTP
                </button>
              </div>

              <div className="flex flex-col items-center gap-3 pt-1">
                <Button
                  type="button"
                  onClick={handleContinue}
                  disabled={loading}
                  className="w-full max-w-xs bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Code'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (isLeaving) return;
                    setIsLeaving(true);
                    setTimeout(() => navigate('/forgot-password'), AUTH_TRANSITION_MS);
                  }}
                  disabled={isLeaving}
                  className="text-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
