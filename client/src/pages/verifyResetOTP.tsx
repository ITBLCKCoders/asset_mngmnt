'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RotateCw, ArrowLeft } from 'lucide-react';
import logo from '@/assets/Blackcoders-Black.png';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

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

export default function VerifyResetOTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [channel, setChannel] = useState<'email' | 'sms'>(
    (localStorage.getItem('resetChannel') as 'email' | 'sms') || 'email'
  );
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [switchingChannel, setSwitchingChannel] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [otpExpiry, setOtpExpiry] = useState(600);
  const [isLeaving, setIsLeaving] = useState(false);
  const navigate = useNavigate();
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const email = localStorage.getItem('resetEmail') || '';
  const contactNumber = localStorage.getItem('resetContactNumber') || '';

  useEffect(() => {
    const missingIdentifier =
      channel === 'email' ? !email : !contactNumber && !email;
    if (missingIdentifier) {
      navigate('/forgot-password');
      return;
    }

    const expiryTime = localStorage.getItem('resetOtpExpiryTime');
    if (!expiryTime) {
      const newTime = Date.now() + 10 * 60 * 1000;
      localStorage.setItem('resetOtpExpiryTime', newTime.toString());
      setOtpExpiry(600);
    } else {
      const remaining = Math.max(
        0,
        Math.floor((parseInt(expiryTime) - Date.now()) / 1000)
      );
      setOtpExpiry(remaining);
    }

    const timer = setInterval(() => {
      setOtpExpiry(prev => {
        if (prev <= 1) {
          localStorage.removeItem('resetChannel');
          localStorage.removeItem('resetEmail');
          localStorage.removeItem('resetContactNumber');
          localStorage.removeItem('resetOtpExpiryTime');
          toast.error('OTP expired. Please request a new one.', {
            duration: 5000,
          });
          navigate('/forgot-password');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, channel, email, contactNumber]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
    if (newOtp.every(d => d)) verify(newOtp.join(''));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const switchOtpChannel = async () => {
    const nextChannel = channel === 'sms' ? 'email' : 'sms';
    if (!email) {
      navigate('/forgot-password');
      return;
    }

    setSwitchingChannel(true);
    const loadingToast = toast(
      `Switching to ${nextChannel === 'sms' ? 'SMS' : 'Email'} OTP...`,
      { duration: Infinity }
    );

    try {
      const { contactNumber: resolvedContactNumber, effectiveChannel } = await api.post<{
        message: string;
        contactNumber?: string;
        effectiveChannel?: 'email' | 'sms';
      }>('/auth/forgot-password', {
        channel: nextChannel,
        email,
      });

      const actualChannel = effectiveChannel || nextChannel;
      localStorage.setItem('resetChannel', actualChannel);
      if (actualChannel === 'sms' && resolvedContactNumber) {
        localStorage.setItem('resetContactNumber', resolvedContactNumber);
      } else {
        localStorage.removeItem('resetContactNumber');
      }
      localStorage.setItem(
        'resetOtpExpiryTime',
        (Date.now() + 10 * 60 * 1000).toString()
      );

      setChannel(actualChannel);
      setOtp(['', '', '', '', '', '']);
      setStatus('idle');
      setCanResend(false);
      setResendCooldown(60);
      setOtpExpiry(600);
      inputsRef.current[0]?.focus();

      if (nextChannel === 'sms' && effectiveChannel === 'email') {
        toast.success('SMS failed. OTP sent via Email instead.', {
          id: loadingToast,
          description: 'Please check your email for the reset code.',
        });
      } else {
        toast.success(
          `OTP sent via ${actualChannel === 'sms' ? 'SMS' : 'Email'}!`,
          { id: loadingToast }
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to switch OTP channel', {
        id: loadingToast,
      });
    } finally {
      setSwitchingChannel(false);
    }
  };

  const verify = async (code: string) => {
    setStatus('loading');
    const loadingToast = toast('Verifying OTP...', { duration: Infinity });
    try {
      const { success, userId } = await api.post('/auth/verify-reset-otp', {
        channel,
        email,
        contactNumber,
        otp: code,
      });
      if (success && userId) {
        localStorage.removeItem('resetChannel');
        localStorage.removeItem('resetEmail');
        localStorage.removeItem('resetContactNumber');
        localStorage.removeItem('resetOtpExpiryTime');
        localStorage.setItem('resetUserId', userId);
        toast.success('OTP verified successfully!', {
          id: loadingToast,
          icon: <CheckCircle2 className="w-5 h-5" />,
          description: 'You can now set your new password.',
        });
        setStatus('success');
        setTimeout(() => {
          setIsLeaving(true);
          navigate('/reset-password');
        }, 2000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP', { id: loadingToast });
      setStatus('error');
      setOtp(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setStatus('idle');
    }
  };

  const resendOTP = async () => {
    const identifierMissing =
      channel === 'email' ? !email : !contactNumber && !email;
    if (!canResend || identifierMissing) return;
    setCanResend(false);
    setResendCooldown(60);
    localStorage.setItem(
      'resetOtpExpiryTime',
      (Date.now() + 10 * 60 * 1000).toString()
    );
    setOtpExpiry(600);

    const loadingToast = toast('Sending new OTP...', { duration: Infinity });
    try {
      const { effectiveChannel } = await api.post<{
        message: string;
        effectiveChannel?: 'email' | 'sms';
      }>('/auth/forgot-password', {
        channel,
        email,
        contactNumber,
      });

      const actualChannel = effectiveChannel || channel;
      if (actualChannel !== channel) {
        localStorage.setItem('resetChannel', actualChannel);
        setChannel(actualChannel);
        if (actualChannel === 'email') {
          localStorage.removeItem('resetContactNumber');
        }
      }

      if (channel === 'sms' && effectiveChannel === 'email') {
        toast.success('SMS failed. OTP sent via Email instead.', {
          id: loadingToast,
          icon: <RotateCw className="w-5 h-5" />,
          description: 'Please check your email for the reset code.',
        });
      } else {
        toast.success('New OTP sent!', {
          id: loadingToast,
          icon: <RotateCw className="w-5 h-5" />,
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend', { id: loadingToast });
      setCanResend(true);
      setResendCooldown(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

            <div className="w-full space-y-6">
              <div className="space-y-1">
                <p className="text-2xl font-semibold text-black">
                  Verify Reset Code {channel === 'sms' ? '(SMS)' : '(Email)'}
                </p>
                <p className="text-sm text-gray-700">
                  Enter the 6-digit code sent to{' '}
                  <strong>
                    {channel === 'sms'
                      ? contactNumber || 'your registered mobile number'
                      : email}
                  </strong>
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  Expires in:{' '}
                  <strong className="text-red-600">{formatTime(otpExpiry)}</strong>
                </p>
              </div>

              <div className="flex justify-center gap-2">
                {otp.map((_, i) => (
                  <Input
                    key={i}
                    type="text"
                    maxLength={1}
                    value={otp[i]}
                    onChange={e => handleChange(e.target.value, i)}
                    onKeyDown={e => handleKeyDown(e, i)}
                    className="w-12 h-12 text-center text-lg font-bold bg-white border-2 border-gray-300 focus:ring-2 focus:ring-red-500"
                    disabled={status === 'loading' || otpExpiry === 0}
                    ref={el => {
                      inputsRef.current[i] = el;
                    }}
                  />
                ))}
              </div>

              {status === 'success' && (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center gap-3 py-4"
                >
                  <CheckCircle2 className="w-16 h-16 text-green-600" />
                  <p className="text-lg font-medium text-green-800">
                    Verified! Redirecting...
                  </p>
                </motion.div>
              )}

              {status === 'error' && (
                <Alert variant="destructive">
                  <AlertDescription>Invalid or expired OTP.</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between gap-3">
                <Button
                  onClick={resendOTP}
                  disabled={!canResend || status === 'loading' || otpExpiry === 0}
                  variant="outline"
                  size="sm"
                >
                  {resendCooldown > 0 ? (
                    <>Resend in {resendCooldown}s</>
                  ) : (
                    <>Resend OTP</>
                  )}
                </Button>
                <Button
                  onClick={() => verify(otp.join(''))}
                  disabled={
                    status === 'loading' || !otp.every(d => d) || otpExpiry === 0
                  }
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Verify
                </Button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={switchOtpChannel}
                  disabled={switchingChannel || status === 'loading'}
                  className="text-xs text-red-600 underline hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {switchingChannel
                    ? 'Switching...'
                    : channel === 'sms'
                      ? "Didn't receive the OTP? Change to Email"
                      : "Didn't receive the OTP? Change to SMS"}
                </button>
              </div>

              <div className="text-center">
                <Button
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
