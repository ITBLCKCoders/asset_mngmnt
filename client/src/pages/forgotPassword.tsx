'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import logo from '@/assets/Blackcoders-Black.png';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    localStorage.removeItem('resetChannel');
    localStorage.removeItem('resetContactNumber');
    localStorage.removeItem('resetOtpExpiryTime');
    localStorage.setItem('resetEmail', email.trim());
    setLoading(false);
    navigate('/reset-method-selection');
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

      <form
        onSubmit={handleSubmit}
        className="absolute inset-0 flex items-center justify-center p-4 lg:left-[77%] lg:top-1/2 lg:-translate-y-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-xl lg:p-0 lg:ml-8 lg:mt-12 z-10"
      >
        <div className="w-full max-w-lg">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-xl lg:bg-transparent lg:backdrop-blur-none lg:rounded-none lg:p-0 lg:shadow-none flex flex-col items-center">
            <div className="w-40 h-auto mb-4 drop-shadow-md sm:w-48 md:w-56 lg:absolute lg:right-1/2 lg:-top-20 lg:translate-x-1/2 lg:w-[600px] lg:mb-0 lg:drop-shadow-lg lg:pointer-events-none">
              <img src={logo} alt="Blackcoders" className="w-full h-auto" />
            </div>

            <div className="w-full space-y-4 lg:pt-20">
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
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Continuing...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/login')}
                  className="text-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
