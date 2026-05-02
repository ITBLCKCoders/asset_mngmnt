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
    const loadingToast = toast.loading(
      `Switching to ${nextChannel === 'sms' ? 'SMS' : 'Email'} OTP...`
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
    const loadingToast = toast.loading('Verifying OTP...');
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

    const loadingToast = toast.loading('Sending new OTP...');
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
    <div className="min-h-screen relative overflow-hidden bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0">
        <svg
          className="w-full h-full"
          viewBox="0 0 320 1440"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#EE1D25"
            d="M115,1750 C-60,1000 400,-390 100,-50 L320,0 L320,1440 Z"
          />
          <path
            fill="#ffffff"
            d="M86,1590 C-10,760 500,-210 20,-370 L553380,0 L280,1440 Z"
          />
        </svg>
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-4 lg:left-[77%] lg:top-1/2 lg:-translate-y-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-xl lg:p-0 lg:ml-8 lg:mt-12 z-10">
        <div className="w-full max-w-lg">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-xl lg:bg-transparent lg:backdrop-blur-none lg:rounded-none lg:p-0 lg:shadow-none flex flex-col items-center">
            <div className="w-40 h-auto mb-4 drop-shadow-md sm:w-48 md:w-56 lg:absolute lg:right-1/2 lg:-top-20 lg:translate-x-1/2 lg:w-[600px] lg:mb-0 lg:drop-shadow-lg lg:pointer-events-none">
              <img src={logo} alt="Blackcoders" className="w-full h-auto" />
            </div>

            <div className="w-full space-y-6 lg:pt-20">
              <div className="space-y-1">
                <p className="text-2xl font-semibold text-black">
                  Verify Reset {channel === 'sms' ? 'Code (SMS)' : 'Code (Email)'}
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
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
