'use client';

import { useState, useEffect } from 'react';
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
import { api, setToken } from '@/lib/api';
import { toast } from 'sonner';
import { Shield, KeyRound, ArrowLeft, Loader2 } from 'lucide-react';
import { Shimmer } from '@/components/ui/shimmer';

export default function VerifyMFA() {
  const [totp, setTotp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const tempToken = localStorage.getItem('mfaTempToken');

  useEffect(() => {
    // If no temp token, redirect to login
    if (!tempToken) {
      navigate('/login');
    }
  }, [tempToken, navigate]);

  const verify = async () => {
    if (!tempToken) {
      toast.error('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    if (totp.length < 6) {
      setError('Please enter a valid 6-digit code or 8-character backup code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/mfa/verify', {
        tempToken,
        totp,
      });

      // Clear temp token
      localStorage.removeItem('mfaTempToken');

      // Signal auth success
      setToken('authenticated');

      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid code. Please try again.';
      setError(errorMsg);
      setTotp('');
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && totp.length >= 6) {
      verify();
    }
  };

  const goBack = () => {
    localStorage.removeItem('mfaTempToken');
    navigate('/login');
  };

  if (!tempToken) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                6-digit TOTP code or 8-char backup code
              </label>
              <Input
                placeholder="000000"
                value={totp}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '');
                  setTotp(value.slice(0, 8));
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                maxLength={8}
                className="text-center text-lg tracking-widest"
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Use your authenticator app (Google Authenticator, Microsoft Authenticator, etc.)
              </p>
            </div>

            <Button 
              onClick={verify} 
              disabled={totp.length < 6 || isLoading} 
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Lost access to your authenticator?</p>
                <p className="mt-1">
                  Use one of your backup codes (8-character codes) that you saved when setting up MFA.
                </p>
              </div>
            </div>
          </div>

          <Button variant="ghost" onClick={goBack} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
