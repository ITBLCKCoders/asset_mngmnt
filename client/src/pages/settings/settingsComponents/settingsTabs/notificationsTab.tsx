import { useState, useEffect } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Shimmer } from '@/components/ui/shimmer';

export function NotificationsTab({ isActive }: { isActive?: boolean }) {
  const [isTabLoading, setIsTabLoading] = useState(true);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    systemAlerts: true,
    assetRequests: true,
    maintenanceReminders: true,
    lowStockAlerts: true,
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPassword: '',
    adminEmail: '',
  });
  useEffect(() => {
    if (isActive) {
      setIsTabLoading(true);
      const timer = setTimeout(() => setIsTabLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const handleSave = async () => {
    // Notification settings save not yet implemented. Backend endpoints planned.
    toast.info('Notification settings save is coming soon.');
  };

  if (isTabLoading) {
    return (
      <TabsContent value="notifications" className="mt-0">
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
            {/* Notification Preferences */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Shimmer className="h-6 w-6 rounded" />
                <Shimmer className="h-7 w-48" />
              </div>
              <div className="grid gap-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border rounded-xl"
                  >
                    <div className="space-y-1">
                      <Shimmer className="h-5 w-32" />
                      <Shimmer className="h-4 w-48" />
                    </div>
                    <Shimmer className="h-6 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Email Configuration */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Shimmer className="h-6 w-6 rounded" />
                <Shimmer className="h-7 w-40" />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Shimmer className="h-5 w-24" />
                    <Shimmer className="h-10 w-full rounded" />
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
    <TabsContent value="notifications" className="mt-0">
      <Card className="shadow-lg border-0 rounded-2xl overflow-hidden mb-10 bg-card/95 backdrop-blur">
        <CardHeader className="bg-red-600 rounded-t-2xl">
          <div className="flex items-start justify-between gap-6">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-white">
                Notification Settings
              </CardTitle>
              <p className="text-white/80 mt-2">
                Configure system notifications and email settings for super
                admin
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleSave}
              title="Notification settings save is coming soon"
              className="shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground text-white font-medium rounded-xl"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Save Settings (Coming soon)
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-8">
          {/* Notification Preferences */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-red-600" />
              <h3 className="text-xl font-semibold">
                Notification Preferences
              </h3>
            </div>

            <div className="grid gap-6">
              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications via email to administrators
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={checked =>
                    setSettings({ ...settings, emailNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <Label className="text-base font-medium">System Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts for system events and errors
                  </p>
                </div>
                <Switch
                  checked={settings.systemAlerts}
                  onCheckedChange={checked =>
                    setSettings({ ...settings, systemAlerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Asset Requests
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when new asset requests are submitted
                  </p>
                </div>
                <Switch
                  checked={settings.assetRequests}
                  onCheckedChange={checked =>
                    setSettings({ ...settings, assetRequests: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Maintenance Reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminders for scheduled maintenance
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceReminders}
                  onCheckedChange={checked =>
                    setSettings({ ...settings, maintenanceReminders: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <Label className="text-base font-medium">
                    Low Stock Alerts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when asset stock levels are low
                  </p>
                </div>
                <Switch
                  checked={settings.lowStockAlerts}
                  onCheckedChange={checked =>
                    setSettings({ ...settings, lowStockAlerts: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Email Configuration */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Mail className="h-6 w-6 text-red-600" />
              <h3 className="text-xl font-semibold">Email Configuration</h3>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-base font-medium">SMTP Host</Label>
                <Input
                  value={settings.smtpHost}
                  onChange={e =>
                    setSettings({ ...settings, smtpHost: e.target.value })
                  }
                  placeholder="smtp.gmail.com"
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">SMTP Port</Label>
                <Input
                  value={settings.smtpPort}
                  onChange={e =>
                    setSettings({ ...settings, smtpPort: e.target.value })
                  }
                  placeholder="587"
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">SMTP Username</Label>
                <Input
                  value={settings.smtpUser}
                  onChange={e =>
                    setSettings({ ...settings, smtpUser: e.target.value })
                  }
                  placeholder="your-email@gmail.com"
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">SMTP Password</Label>
                <Input
                  type="password"
                  value={settings.smtpPassword}
                  onChange={e =>
                    setSettings({ ...settings, smtpPassword: e.target.value })
                  }
                  placeholder="App password"
                  className="text-base"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-base font-medium">Admin Email</Label>
                <Input
                  value={settings.adminEmail}
                  onChange={e =>
                    setSettings({ ...settings, adminEmail: e.target.value })
                  }
                  placeholder="admin@company.com"
                  className="text-base"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <Card className="relative overflow-hidden border-2 border-red-500/30 bg-gradient-to-br from-red-50 to-white shadow-xl rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <CheckCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Notification Types
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Configure different types of notifications to keep your team
              informed about important events.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="text-sm font-medium">System Alerts</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                <Bell className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium">Asset Requests</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                <Mail className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Email Notifications</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-red-500/30 bg-gradient-to-br from-red-50 to-white shadow-xl rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <Sparkles className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Email Setup</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div>
                <Label className="text-lg font-medium">
                  SMTP Configuration
                </Label>
                <p className="text-sm text-muted-foreground">
                  Configure outgoing mail server
                </p>
              </div>
              <div className="w-12 h-6 bg-red-500/20 rounded-full flex items-center justify-end px-1">
                <div className="w-5 h-5 bg-red-600 rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div>
                <Label className="text-lg font-medium">
                  Admin Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts to admin email
                </p>
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
