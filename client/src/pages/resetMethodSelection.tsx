'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import logo from '@/assets/Blackcoders-Black.png';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type ResetChannel = 'email' | 'sms';

export default function ResetMethodSelectionPage() {
  const navigate = useNavigate();
  const [channel, setChannel] = useState<ResetChannel>('email');
  const [loading, setLoading] = useState(false);

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
      navigate('/verify-reset-otp');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
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

            <div className="w-full space-y-4 lg:pt-20">
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
