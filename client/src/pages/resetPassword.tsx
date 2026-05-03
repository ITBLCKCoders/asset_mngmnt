'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import logo from '@/assets/Blackcoders-Black.png';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import zxcvbn from 'zxcvbn';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState('');
  const [strengthColor, setStrengthColor] = useState('bg-red-500');

  useEffect(() => {
    const resetUserId = localStorage.getItem('resetUserId');
    if (!resetUserId) {
      navigate('/forgot-password');
    }
  }, [navigate]);

  useEffect(() => {
    if (!password) {
      setStrength(0);
      setStrengthLabel('');
      return;
    }

    const result = zxcvbn(password);
    const score = result.score;
    setStrength((score / 4) * 100);

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-lime-500',
      'bg-green-500',
    ];

    setStrengthLabel(labels[score]);
    setStrengthColor(colors[score]);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (strength < 50) {
      toast.error('Please choose a stronger password');
      return;
    }

    const resetUserId = localStorage.getItem('resetUserId');
    if (!resetUserId) {
      toast.error('Session expired. Please try again.');
      navigate('/forgot-password');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        userId: resetUserId,
        password,
      });
      localStorage.removeItem('resetUserId');
      toast.success(
        'Password reset successfully! Please log in with your new password.'
      );
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message);
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
                <p className="text-2xl font-semibold text-black">Reset Password</p>
                <p className="text-sm text-gray-700">Enter your new password</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-black text-sm">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-white border-2 border-gray-300 focus:ring-2 focus:ring-red-500 py-2 text-sm pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {password && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300 pt-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        Strength:{' '}
                        <span className="font-bold text-red-600">
                          {strengthLabel}
                        </span>
                      </span>
                      <span className="text-gray-500">{Math.round(strength)}%</span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden shadow-inner">
                      <div
                        className={`h-full ${strengthColor} transition-all duration-500 ease-out rounded-full`}
                        style={{ width: `${strength}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Use uppercase, lowercase, numbers, and symbols for a
                      stronger password.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-black text-sm">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-white border-2 border-gray-300 focus:ring-2 focus:ring-red-500 py-2 text-sm pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 pt-1">
                <Button
                  type="submit"
                  disabled={loading || strength < 50}
                  className="w-full max-w-xs bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
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
