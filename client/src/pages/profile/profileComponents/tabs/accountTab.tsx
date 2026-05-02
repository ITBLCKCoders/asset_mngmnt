'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Lock, Shield, Bell, Mail, Eye, EyeOff, ShieldCheck, Ban, Smartphone, Copy, RefreshCw, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import AnimatedSwitch from '../animatedSwitch';
import zxcvbn from 'zxcvbn';
import { api } from '@/lib/api';
import { setToken } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Dialog } from '@/components/ui/dialog';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shimmer } from '@/components/ui/shimmer';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';

export default function AccountTab() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();

  const [isLoading, setIsLoading] = useState(userLoading);
  const [isTabLoading, setIsTabLoading] = useState(true);

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState('');
  const [strengthColor, setStrengthColor] = useState('bg-red-500');
  const [userMFAEnabled, setUserMFAEnabled] = useState(false);
  const [loadingMFA, setLoadingMFA] = useState(true);

  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const [mfaStep, setMfaStep] = useState<'init' | 'scan' | 'verify' | 'success'>('init');
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaTotp, setMfaTotp] = useState('');
  const [mfaTotpInputs, setMfaTotpInputs] = useState(['', '', '', '', '', '']);
  const [mfaBackupCodes, setMfaBackupCodes] = useState<string[] | null>(null);
  const [mfaCopied, setMfaCopied] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState('');

  useEffect(() => {
    setIsLoading(userLoading);
  }, [userLoading]);

  useEffect(() => {
    const timer = setTimeout(() => setIsTabLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!passwords.newPassword) {
      setStrength(0);
      setStrengthLabel('');
      return;
    }

    const result = zxcvbn(passwords.newPassword);
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
  }, [passwords.newPassword]);

  useEffect(() => {
    fetchMFAStatus();
  }, []);

  const openMfaDialog = () => {
    setMfaStep('init');
    setMfaQrCode(null);
    setMfaSecret('');
    setMfaTotp('');
    setMfaTotpInputs(['', '', '', '', '', '']);
    setMfaBackupCodes(null);
    setMfaCopied(false);
    setMfaDialogOpen(true);
  };

  const handleMfaInputChange = (index: number, value: string) => {
    const allowedChars = /^\d$/;
    if (value && !allowedChars.test(value)) return;

    const newInputs = [...mfaTotpInputs];
    newInputs[index] = value;
    setMfaTotpInputs(newInputs);
    setMfaTotp(newInputs.join(''));

    // Auto-focus next input
    if (value && index < 5) {
      const inputs = document.querySelectorAll('.mfa-totp-input');
      const nextInput = inputs[index + 1] as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleMfaInputPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const allowedChars = /\d/g;
    const filtered = pastedData.match(allowedChars)?.join('').slice(0, 6) || '';
    const newInputs = filtered.split('').slice(0, 6);
    setMfaTotpInputs(newInputs);
    setMfaTotp(filtered);
  };

  const handleMfaKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !mfaTotpInputs[index] && index > 0) {
      const inputs = document.querySelectorAll('.mfa-totp-input');
      const prevInput = inputs[index - 1] as HTMLInputElement;
      prevInput?.focus();
    }
  };

  const startMfaSetup = async () => {
    try {
      const response = await api.post('/auth/mfa/setup');
      setMfaQrCode(response.qrCode);
      setMfaSecret(response.manualEntryKey);
      setMfaStep('scan');
      toast.success('QR code generated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start MFA setup');
    }
  };

  const verifyMfaSetup = async () => {
    if (mfaTotpInputs.join('').length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }
    try {
      const response = await api.post('/auth/mfa/verify-setup', { token: mfaTotp });
      setMfaBackupCodes(response.backupCodes);
      setMfaStep('success');
      toast.success('MFA enabled successfully!');
      setUserMFAEnabled(true);
    } catch (err: any) {
      toast.error(err.message || 'Invalid code. Please try again.');
      setMfaTotp('');
      setMfaTotpInputs(['', '', '', '', '', '']);
    }
  };

  const copyMfaSecret = () => {
    navigator.clipboard.writeText(mfaSecret);
    setMfaCopied(true);
    setTimeout(() => setMfaCopied(false), 2000);
    toast.success('Secret copied to clipboard');
  };

  const copyMfaBackupCodes = () => {
    if (mfaBackupCodes) {
      navigator.clipboard.writeText(mfaBackupCodes.join('\n'));
      toast.success('Backup codes copied to clipboard');
    }
  };

  const downloadMfaBackupCodes = () => {
    if (mfaBackupCodes) {
      const blob = new Blob([mfaBackupCodes.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mfa-backup-codes.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup codes downloaded');
    }
  };

  const handleDisableMFA = async () => {
    if (!disablePassword) {
      toast.error('Please enter your password');
      return;
    }

    setIsDisabling(true);
    try {
      await api.post('/auth/mfa/disable', { password: disablePassword });
      setUserMFAEnabled(false);
      setShowDisableDialog(false);
      setDisablePassword('');
      toast.success('MFA disabled successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable MFA');
    } finally {
      setIsDisabling(false);
    }
  };

  const handleRegenerateBackupCodes = () => {
    setShowRegenerateDialog(true);
  };

  const handleConfirmRegenerate = async () => {
    if (!regeneratePassword) {
      toast.error('Please enter your password');
      return;
    }

    setIsRegenerating(true);
    try {
      const response = await api.post('/auth/mfa/regenerate-backup-codes', { password: regeneratePassword });
      setMfaBackupCodes(response.backupCodes);
      setShowRegenerateDialog(false);
      setRegeneratePassword('');
      setMfaDialogOpen(true);
      setMfaStep('success');
      toast.success('Backup codes regenerated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate backup codes');
    } finally {
      setIsRegenerating(false);
    }
  };

  const fetchMFAStatus = async () => {
    try {
      setLoadingMFA(true);
      const response = await api.get('/auth/me');
      setUserMFAEnabled(response.user?.mfaEnabled || false);
    } catch (err) {
      // Default to disabled if fetch fails
      setUserMFAEnabled(false);
    } finally {
      setLoadingMFA(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwords.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (strength < 50) {
      toast.error('Please choose a stronger password');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
        confirmPassword: passwords.confirmPassword,
      });

      toast.success(
        'Password changed successfully! Logging you out from all devices...'
      );

      setToken(null);
      localStorage.removeItem('accessToken');

      await fetch(`${import.meta.env.VITE_API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});

      setTimeout(() => {
        navigate('/login');
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || isTabLoading) {
    return (
      <Card className="shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-800 p-4 text-white sm:p-6 lg:p-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="rounded-xl border border-white/30 bg-white/20 p-3 backdrop-blur-md">
              <Shimmer className="h-8 w-8 rounded bg-white/20" />
            </div>
            <div>
              <Shimmer className="h-8 w-48 rounded bg-white/20" />
              <Shimmer className="h-5 w-96 rounded mt-2 bg-white/20" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 p-4 sm:p-6 lg:space-y-10 lg:p-8">
          {/* Email */}
          <div className="space-y-3">
            <Shimmer className="h-5 w-32 rounded" />
            <Shimmer className="h-12 w-80 rounded-xl" />
          </div>

          {/* Change Password Section */}
          <div className="w-full max-w-md space-y-6">
            <Shimmer className="h-6 w-48 rounded" />

            <div className="space-y-5">
              <Shimmer className="h-12 w-full rounded-xl" />
              <Shimmer className="h-12 w-full rounded-xl" />
              <Shimmer className="h-12 w-full rounded-xl" />

              {/* Strength Meter Skeleton */}
              <div className="space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <Shimmer className="h-4 w-32 rounded" />
                  <Shimmer className="h-4 w-16 rounded" />
                </div>
                <Shimmer className="h-3 w-full rounded-full" />
                <Shimmer className="h-3 w-72 rounded" />
              </div>

              <Shimmer className="h-12 w-full rounded-xl" />
            </div>
          </div>

          <Separator className="bg-gray-300" />

          {/* Security Settings */}
          <div className="space-y-8">
            <Shimmer className="h-7 w-56 rounded-lg" />

            <div className="space-y-8">
              {[1, 2].map(i => (
                <div key={i} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <Shimmer className="h-5 w-48 rounded" />
                    <Shimmer className="h-4 w-64 rounded" />
                  </div>
                  <Shimmer className="h-8 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-gray-300" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Shimmer className="h-5 w-44 rounded" />
              <Shimmer className="h-4 w-72 rounded" />
            </div>
            <Shimmer className="h-8 w-16 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-2xl overflow-hidden border-0">
      <CardHeader className="bg-gradient-to-r from-red-600 to-red-800 p-4 text-white sm:p-6 lg:p-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="rounded-xl border border-white/30 bg-white/20 p-3 backdrop-blur-md">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold sm:text-2xl">
              Account Settings
            </CardTitle>
            <p className="text-red-100 text-sm opacity-90">
              Manage your email, password, and security preferences
            </p>
          </div>
        </div>
      </CardHeader>

      <Separator className="bg-gray-100" />

      <CardContent className="space-y-8 p-4 sm:p-6 lg:space-y-10 lg:p-8">
        <div>
          <Label className="text-lg">Email Address</Label>
          <div className="mt-3 flex w-full max-w-md items-center gap-4">
            <Input
              value={user?.email || ''}
              disabled
              className="bg-gray-50"
              placeholder="Loading email..."
            />
          </div>
        </div>

        <div className="w-full max-w-md space-y-6">
          <Label className="text-lg">Change Password</Label>
          <form onSubmit={handlePasswordChange} className="space-y-5">
            <div className="relative">
              <Input
                type={showPasswords.current ? 'text' : 'password'}
                placeholder="Current password"
                value={passwords.currentPassword}
                onChange={e =>
                  setPasswords({
                    ...passwords,
                    currentPassword: e.target.value,
                  })
                }
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.current ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showPasswords.new ? 'text' : 'password'}
                  placeholder="New password"
                  value={passwords.newPassword}
                  onChange={e =>
                    setPasswords({ ...passwords, newPassword: e.target.value })
                  }
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPasswords.new ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {passwords.newPassword && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      Strength:{' '}
                      <span className="font-bold text-red-600">
                        {strengthLabel}
                      </span>
                    </span>
                    <span className="text-gray-500">
                      {Math.round(strength)}%
                    </span>
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

            <div className="relative">
              <Input
                type={showPasswords.confirm ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={passwords.confirmPassword}
                onChange={e =>
                  setPasswords({
                    ...passwords,
                    confirmPassword: e.target.value,
                  })
                }
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.confirm ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading || strength < 50}
              className="w-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-block h-4 w-24 animate-pulse rounded bg-white/40" />
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </div>

        <Separator className="bg-gray-300" />

        <div>
          <h3 className="text-xl font-semibold mb-8 flex items-center gap-3 text-red-700">
            <Shield className="w-6 h-6" /> Security Settings
          </h3>
          <div className="space-y-8">
            {loadingMFA ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-5 w-32 animate-pulse rounded bg-red-100" />
              </div>
            ) : userMFAEnabled ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-green-600">MFA is enabled</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={openMfaDialog}
                    className="shrink-0"
                  >
                    Reconfigure
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={handleRegenerateBackupCodes}
                    disabled={isRegenerating}
                    className="shrink-0 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {isRegenerating ? 'Regenerating...' : 'Regenerate Backup Codes'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDisableDialog(true)}
                    className="shrink-0 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove MFA
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <Smartphone className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600">
                      Add an extra layer of security
                    </p>
                  </div>
                </div>
                <Button
                  onClick={openMfaDialog}
                  className="shrink-0 bg-red-600 hover:bg-red-700 text-white"
                >
                  Add MFA
                </Button>
              </div>
            )}
            <div className="flex flex-col gap-3 cursor-not-allowed opacity-50 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Login Notifications</p>
                <p className="text-sm text-gray-600">
                  Email alerts for new logins
                </p>
              </div>
              <AnimatedSwitch
                checked={true}
                onCheckedChange={() => {}}
                icon={Bell}
                disabled
              />
            </div>
          </div>
        </div>

        <Dialog open={mfaDialogOpen} onOpenChange={setMfaDialogOpen}>
          <AppDialogFrame className="sm:max-w-xl">

            {/* ── STEP: init ── */}
            {mfaStep === 'init' && (
              <>
                <AppDialogGradientHeader
                  title={
                    <span className="flex items-center gap-3">
                      <div className="shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      Enable Two-Factor Authentication
                    </span>
                  }
                  description="Add an extra layer of security to your account"
                />
                <AppDialogBody className="space-y-6">
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">You'll need to:</p>
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Scan a QR code with your authenticator app</li>
                      <li>Enter the 6-digit code to verify</li>
                      <li>Save your backup codes in a safe place</li>
                    </ol>
                  </div>
                </AppDialogBody>
                <AppDialogChromeFooter>
                  <Button variant="outline" onClick={() => setMfaDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={startMfaSetup} className="bg-red-600 hover:bg-red-700 text-white">
                    Start Setup
                  </Button>
                </AppDialogChromeFooter>
              </>
            )}

            {/* ── STEP: scan + verify ── */}
            {mfaStep === 'scan' && (
              <>
                <AppDialogGradientHeader
                  title="Scan QR Code"
                  description="Use Google Authenticator, Microsoft Authenticator, or any TOTP app"
                />
                <AppDialogBody className="space-y-6">
                  {mfaQrCode && (
                    <div className="flex flex-col items-center space-y-4">
                      <img src={mfaQrCode} alt="MFA QR Code" className="w-52 h-52 rounded-lg border border-gray-200 shadow-sm" />
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Can't scan? Use this code:</p>
                        <div className="flex items-center justify-center gap-2">
                          <code className="bg-muted px-3 py-1.5 rounded text-sm font-mono">{mfaSecret}</code>
                          <Button variant="ghost" size="sm" onClick={copyMfaSecret}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        {mfaCopied && <p className="text-xs text-green-600 mt-1">Copied!</p>}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Enter the 6-digit code from your app:</p>
                    <div className="flex justify-center gap-2">
                      {mfaTotpInputs.map((value, index) => (
                        <Input
                          key={index}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={value}
                          onChange={(e) => handleMfaInputChange(index, e.target.value)}
                          onKeyDown={(e) => handleMfaKeyDown(index, e)}
                          onPaste={handleMfaInputPaste}
                          className="mfa-totp-input w-12 h-12 text-center text-xl font-bold"
                        />
                      ))}
                    </div>
                  </div>
                </AppDialogBody>
                <AppDialogChromeFooter>
                  <Button variant="outline" onClick={() => setMfaStep('init')}>
                    Back
                  </Button>
                  <Button onClick={verifyMfaSetup} disabled={mfaTotpInputs.join('').length !== 6} className="bg-red-600 hover:bg-red-700 text-white">
                    Verify & Enable
                  </Button>
                </AppDialogChromeFooter>
              </>
            )}

            {/* ── STEP: success ── */}
            {(mfaStep === 'verify' || mfaStep === 'success') && (
              <>
                <AppDialogGradientHeader
                  title="MFA Enabled!"
                  description="Save these backup codes in a safe place"
                />
                <AppDialogBody className="space-y-6">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <Alert variant="destructive" className="bg-amber-50 border-amber-200">
                    <AlertDescription className="text-amber-800">
                      These codes can be used to recover your account if you lose access to your authenticator app. They will only be shown once!
                    </AlertDescription>
                  </Alert>
                  {mfaBackupCodes && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        {mfaBackupCodes.map((code, index) => (
                          <code key={index} className="bg-muted p-2 rounded text-center font-mono text-sm">
                            {code}
                          </code>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={copyMfaBackupCodes} variant="outline" className="flex-1 border-red-600 text-red-600 hover:bg-red-600 hover:text-white">
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                        <Button onClick={downloadMfaBackupCodes} variant="outline" className="flex-1 border-red-600 text-red-600 hover:bg-red-600 hover:text-white">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  )}
                </AppDialogBody>
                <AppDialogChromeFooter>
                  <Button onClick={() => setMfaDialogOpen(false)} className="bg-red-600 hover:bg-red-700 text-white">
                    Done
                  </Button>
                </AppDialogChromeFooter>
              </>
            )}

          </AppDialogFrame>
        </Dialog>

        {/* Disable MFA Confirmation Dialog */}
        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <AppDialogFrame className="sm:max-w-md">
            <AppDialogGradientHeader
              title={
                <span className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  Disable Two-Factor Authentication
                </span>
              }
              description="Are you sure you want to disable MFA? This will make your account less secure."
            />
            <AppDialogBody className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="disable-password">Enter your password to confirm</Label>
                <Input
                  id="disable-password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleDisableMFA();
                    }
                  }}
                />
              </div>
            </AppDialogBody>
            <AppDialogChromeFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDisableDialog(false);
                  setDisablePassword('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDisableMFA}
                disabled={isDisabling}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDisabling ? 'Disabling...' : 'Disable MFA'}
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        {/* Regenerate Backup Codes Confirmation Dialog */}
        <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
          <AppDialogFrame className="sm:max-w-md">
            <AppDialogGradientHeader
              title={
                <span className="flex items-center gap-3">
                  <div className="shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-white" />
                  </div>
                  Regenerate Backup Codes
                </span>
              }
              description="This will invalidate your current backup codes and generate new ones. Enter your password to confirm."
            />
            <AppDialogBody className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="regenerate-password">Enter your password to confirm</Label>
                <Input
                  id="regenerate-password"
                  type="password"
                  value={regeneratePassword}
                  onChange={(e) => setRegeneratePassword(e.target.value)}
                  placeholder="Enter your password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmRegenerate();
                    }
                  }}
                />
              </div>
            </AppDialogBody>
            <AppDialogChromeFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRegenerateDialog(false);
                  setRegeneratePassword('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRegenerate}
                disabled={isRegenerating}
                className="bg-red-600 hover:bg-red-700"
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>

        <Separator className="bg-gray-300" />

        <div className="flex flex-col gap-3 cursor-not-allowed opacity-50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Email Notifications</p>
            <p className="text-sm text-gray-600">
              Payslips, approvals, announcements
            </p>
          </div>
          <AnimatedSwitch
            checked={true}
            onCheckedChange={() => {}}
            icon={Mail}
            disabled
          />
        </div>
      </CardContent>
    </Card>
  );
}
