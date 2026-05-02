import { useState, useEffect } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Shield, Lock, Clock, AlertTriangle, Sparkles, Smartphone, ShieldCheck, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Shimmer } from '@/components/ui/shimmer';
import { api } from '@/lib/api';

export function SecurityTab({ isActive }: { isActive?: boolean }) {
  const navigate = useNavigate();
  const [isTabLoading, setIsTabLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    passwordMinLength: '8',
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecial: false,
    passwordExpirationDays: '90',
    maxLoginAttempts: '5',
    lockoutDurationMinutes: '30',
    sessionTimeoutMinutes: '60',
    enableTwoFactor: false,
    enableAuditLogging: true,
    otpExpirySeconds: '300',
  });
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [globalMFAEnabled, setGlobalMFAEnabled] = useState(true);
  const [checkingMFA, setCheckingMFA] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [mfaResponse, securityResponse, userMfaResponse] = await Promise.all([
          api.get<{ mfaEnabled: boolean }>('/settings/mfa'),
          api.get<{ settings: Record<string, any> }>('/settings/security'),
          api.get<{ mfaEnabled: boolean; userMFAEnabled?: boolean }>('/auth/mfa/status'),
        ]);

        setGlobalMFAEnabled(!!mfaResponse?.mfaEnabled);
        setMfaEnabled(!!(userMfaResponse?.mfaEnabled ?? userMfaResponse?.userMFAEnabled));

        if (securityResponse?.settings) {
          const s = securityResponse.settings;
          setSettings({
            passwordMinLength: s.passwordMinLength?.toString() || '8',
            passwordRequireUppercase: s.passwordRequireUppercase ?? true,
            passwordRequireLowercase: s.passwordRequireLowercase ?? true,
            passwordRequireNumbers: s.passwordRequireNumbers ?? true,
            passwordRequireSpecial: s.passwordRequireSpecial ?? false,
            passwordExpirationDays: s.passwordExpirationDays?.toString() || '90',
            maxLoginAttempts: s.maxLoginAttempts?.toString() || '5',
            lockoutDurationMinutes: s.lockoutDurationMinutes?.toString() || '30',
            sessionTimeoutMinutes: s.sessionTimeoutMinutes?.toString() || '60',
            enableTwoFactor: false,
            enableAuditLogging: s.auditLoggingEnabled ?? true,
            otpExpirySeconds: s.otpExpirySeconds?.toString() || '300',
          });
        }
      } catch (err: any) {
        console.error('Failed to fetch settings:', err);
        toast.error('Failed to load security settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleGlobalMFAChange = async (checked: boolean) => {
    try {
      await api.put('/settings/mfa', { mfaEnabled: checked });
      setGlobalMFAEnabled(checked);
      toast.success(checked ? 'MFA enabled globally' : 'MFA disabled globally');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update MFA setting');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/settings/security', {
        passwordMinLength: parseInt(settings.passwordMinLength),
        passwordRequireUppercase: settings.passwordRequireUppercase,
        passwordRequireLowercase: settings.passwordRequireLowercase,
        passwordRequireNumbers: settings.passwordRequireNumbers,
        passwordRequireSpecial: settings.passwordRequireSpecial,
        passwordExpirationDays: parseInt(settings.passwordExpirationDays),
        maxLoginAttempts: parseInt(settings.maxLoginAttempts),
        lockoutDurationMinutes: parseInt(settings.lockoutDurationMinutes),
        sessionTimeoutMinutes: parseInt(settings.sessionTimeoutMinutes),
        auditLoggingEnabled: settings.enableAuditLogging,
        otpExpirySeconds: parseInt(settings.otpExpirySeconds),
      });
      toast.success('Security settings saved successfully');
    } catch (err: any) {
      console.error('Failed to save security settings:', err);
      toast.error(err.response?.data?.error || 'Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      setIsTabLoading(true);
      const timer = setTimeout(() => setIsTabLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  if (isTabLoading) {
    return (
      <TabsContent value="security" className="mt-0">
        {/* Main Card */}
        <Card className="shadow-lg border-0 rounded-2xl overflow-hidden mb-10 bg-card/95 backdrop-blur">
          <CardHeader className="bg-red-600 rounded-t-2xl">
            <div className="flex items-start justify-between gap-6">
              <div>
                <Shimmer className="h-8 w-48 rounded bg-white/20" />
                <Shimmer className="h-5 w-80 rounded mt-2 bg-white/20" />
              </div>
              <Shimmer className="h-12 w-40 rounded-xl bg-white/20" />
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-8">
            {/* Password Policy */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Shimmer className="h-6 w-6 rounded" />
                <Shimmer className="h-7 w-32" />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Shimmer className="h-5 w-40" />
                    <Shimmer className="h-10 w-full rounded" />
                  </div>
                ))}
              </div>
              <div className="grid gap-6">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border rounded-xl"
                  >
                    <div className="space-y-1">
                      <Shimmer className="h-5 w-40" />
                      <Shimmer className="h-4 w-64" />
                    </div>
                    <Shimmer className="h-6 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Account Security */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Shimmer className="h-6 w-6 rounded" />
                <Shimmer className="h-7 w-32" />
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Shimmer className="h-5 w-32" />
                    <Shimmer className="h-10 w-full rounded" />
                  </div>
                ))}
              </div>
              <div className="grid gap-6">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border rounded-xl"
                  >
                    <div className="space-y-1">
                      <Shimmer className="h-5 w-40" />
                      <Shimmer className="h-4 w-64" />
                    </div>
                    <Shimmer className="h-6 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid Cards Shimmer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card className="relative overflow-hidden border-2 border-red-500/30 bg-gradient-to-br from-red-50 to-white shadow-xl rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Shimmer className="h-10 w-10 rounded-xl" />
                <Shimmer className="h-8 w-48" />
              </div>
            </CardHeader>
            <CardContent>
              <Shimmer className="h-5 w-full mb-6" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-card border rounded-lg"
                  >
                    <Shimmer className="h-5 w-5 rounded" />
                    <Shimmer className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 border-red-500/30 bg-gradient-to-br from-red-50 to-white shadow-xl rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Shimmer className="h-10 w-10 rounded-xl" />
                <Shimmer className="h-8 w-48" />
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div className="space-y-2">
                  <Shimmer className="h-5 w-32" />
                  <Shimmer className="h-4 w-48" />
                </div>
                <div className="w-12 h-6 bg-red-500/20 rounded-full flex items-center justify-end px-1">
                  <div className="w-5 h-5 bg-red-600 rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div className="space-y-2">
                  <Shimmer className="h-5 w-32" />
                  <Shimmer className="h-4 w-48" />
                </div>
                <div className="w-12 h-6 bg-red-500/20 rounded-full flex items-center justify-end px-1">
                  <div className="w-5 h-5 bg-red-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="security" className="mt-0">
      <Card className="shadow-lg border-0 rounded-2xl overflow-hidden mb-10 bg-card/95 backdrop-blur">
        <CardHeader className="bg-red-600 rounded-t-2xl">
          <div className="flex items-start justify-between gap-6">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-white">
                Security Settings
              </CardTitle>
              <p className="text-white/80 mt-2">
                Configure password policies and security measures for super
                admin
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={saving}
              className="shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground text-white font-medium rounded-xl"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-8">
          {/* Password Policy */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Lock className="h-6 w-6 text-red-600" />
              <h3 className="text-xl font-semibold">Password Policy</h3>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-base font-medium">
                  Minimum Password Length
                </Label>
                <Select
                  value={settings.passwordMinLength}
                  onValueChange={value =>
                    setSettings({ ...settings, passwordMinLength: value })
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 characters</SelectItem>
                    <SelectItem value="8">8 characters</SelectItem>
                    <SelectItem value="10">10 characters</SelectItem>
                    <SelectItem value="12">12 characters</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">
                  Password Expiration (days)
                </Label>
                <Select
                  value={settings.passwordExpirationDays}
                  onValueChange={value =>
                    setSettings({ ...settings, passwordExpirationDays: value })
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="0">Never expires</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Require Uppercase Letters
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Passwords must contain at least one uppercase letter
                  </p>
                </div>
                <Switch
                  checked={settings.passwordRequireUppercase}
                  onCheckedChange={checked =>
                    setSettings({
                      ...settings,
                      passwordRequireUppercase: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Require Lowercase Letters
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Passwords must contain at least one lowercase letter
                  </p>
                </div>
                <Switch
                  checked={settings.passwordRequireLowercase}
                  onCheckedChange={checked =>
                    setSettings({
                      ...settings,
                      passwordRequireLowercase: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Require Numbers
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Passwords must contain at least one number
                  </p>
                </div>
                <Switch
                  checked={settings.passwordRequireNumbers}
                  onCheckedChange={checked =>
                    setSettings({
                      ...settings,
                      passwordRequireNumbers: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Require Special Characters
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Passwords must contain special characters (!@#$%^&*)
                  </p>
                </div>
                <Switch
                  checked={settings.passwordRequireSpecial}
                  onCheckedChange={checked =>
                    setSettings({
                      ...settings,
                      passwordRequireSpecial: checked,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Security */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-red-600" />
              <h3 className="text-xl font-semibold">Account Security</h3>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-base font-medium">
                  Max Login Attempts
                </Label>
                <Select
                  value={settings.maxLoginAttempts}
                  onValueChange={value =>
                    setSettings({ ...settings, maxLoginAttempts: value })
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 attempts</SelectItem>
                    <SelectItem value="5">5 attempts</SelectItem>
                    <SelectItem value="10">10 attempts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">
                  Lockout Duration (minutes)
                </Label>
                <Select
                  value={settings.lockoutDurationMinutes}
                  onValueChange={value =>
                    setSettings({ ...settings, lockoutDurationMinutes: value })
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="1440">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">
                  Session Timeout (minutes)
                </Label>
                <Select
                  value={settings.sessionTimeoutMinutes}
                  onValueChange={value =>
                    setSettings({ ...settings, sessionTimeoutMinutes: value })
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-base font-medium">
                  OTP Expiry Time (seconds)
                </Label>
                <Select
                  value={settings.otpExpirySeconds}
                  onValueChange={value =>
                    setSettings({ ...settings, otpExpirySeconds: value })
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="180">3 minutes</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                    <SelectItem value="900">15 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Enable Audit Logging
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Log all security-related events and user actions
                  </p>
                </div>
                <Switch
                  checked={settings.enableAuditLogging}
                  onCheckedChange={checked =>
                    setSettings({ ...settings, enableAuditLogging: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors bg-red-50/50">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Enable Global MFA
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to set up Two-Factor Authentication. When disabled, users cannot add MFA.
                  </p>
                </div>
                <Switch
                  checked={globalMFAEnabled}
                  onCheckedChange={handleGlobalMFAChange}
                />
              </div>

              {/* Require 2FA for Admin toggle - placeholder for future admin requirement feature */}
              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors opacity-50">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Require 2FA for Admin Accounts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for all admin accounts (coming soon)
                  </p>
                </div>
                <Switch
                  checked={settings.enableTwoFactor}
                  onCheckedChange={checked =>
                    setSettings({ ...settings, enableTwoFactor: checked })
                  }
                  disabled
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </TabsContent>
  );
}
