'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RotateCw } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export default function VerifyOTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [otpExpiry, setOtpExpiry] = useState(600);
  const navigate = useNavigate();
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // SMS channel disabled — all OTP now uses email
  // const channel =
  //   (localStorage.getItem('pendingVerificationChannel') as 'email' | 'sms') ||
  //   'email';
  const channel = 'email';
  const email = localStorage.getItem('pendingVerificationEmail') || '';
  // const contactNumber = localStorage.getItem('pendingVerificationContact') || '';
  const contactNumber = '';

  useEffect(() => {
    const expiryTime = localStorage.getItem('otpExpiryTime');
    if (!expiryTime) {
      const newTime = Date.now() + 10 * 60 * 1000;
      localStorage.setItem('otpExpiryTime', newTime.toString());
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
          localStorage.removeItem('pendingVerificationChannel');
          localStorage.removeItem('pendingVerificationEmail');
          localStorage.removeItem('pendingVerificationContact');
          localStorage.removeItem('otpExpiryTime');
          toast.error('OTP expired. Please register again.', {
            duration: 5000,
          });
          navigate('/register');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

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

  const verify = async (code: string) => {
    setStatus('loading');
    const loadingToast = toast.loading('Verifying OTP...');
    try {
      await api.post('/auth/verify-otp', {
        // channel,
        email,
        // contactNumber,
        otp: code,
      });
      localStorage.removeItem('pendingVerificationChannel');
      localStorage.removeItem('pendingVerificationEmail');
      localStorage.removeItem('pendingVerificationContact');
      localStorage.removeItem('otpExpiryTime');
      toast.success(
        // channel === 'sms'
        //   ? 'Phone number verified successfully!'
        //   : 'Email verified successfully!',
        'Email verified successfully!',
        {
        id: loadingToast,
        icon: <CheckCircle2 className="w-5 h-5" />,
        description: 'You can now log in with your credentials.',
        }
      );
      setStatus('success');
      setTimeout(() => {
        localStorage.removeItem('pendingVerificationChannel');
        localStorage.removeItem('pendingVerificationEmail');
        localStorage.removeItem('pendingVerificationContact');
        localStorage.removeItem('otpExpiryTime');
        navigate('/login');
      }, 2000);
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
    // const identifierMissing = channel === 'email' ? !email : !contactNumber;
    const identifierMissing = !email;
    if (!canResend || identifierMissing) return;
    setCanResend(false);
    setResendCooldown(60);
    localStorage.setItem(
      'otpExpiryTime',
      (Date.now() + 10 * 60 * 1000).toString()
    );
    setOtpExpiry(600);

    const loadingToast = toast.loading('Sending new OTP...');
    try {
      await api.post('/auth/resend-otp', {
        // channel,
        email,
        // contactNumber,
      });
      toast.success('New OTP sent!', {
        id: loadingToast,
        icon: <RotateCw className="w-5 h-5" />,
      });
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            Verify Email
          </CardTitle>
          <CardDescription>
            Enter the 6-digit code sent to{' '}
            <strong>{email}</strong>
          </CardDescription>
          <p className="text-sm text-muted-foreground mt-2">
            Expires in:{' '}
            <strong className="text-red-600">{formatTime(otpExpiry)}</strong>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center gap-2">
            {otp.map((_, i) => (
              <Input
                key={i}
                type="text"
                maxLength={1}
                value={otp[i]}
                onChange={e => handleChange(e.target.value, i)}
                onKeyDown={e => handleKeyDown(e, i)}
                className="w-12 h-12 text-center text-lg font-bold"
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

          <div className="flex items-center justify-between">
            <Button
              onClick={resendOTP}
              disabled={
                !canResend ||
                status === 'loading' ||
                // (channel === 'email' ? !email : !contactNumber) ||
                !email ||
                otpExpiry === 0
              }
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
            >
              Verify
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
