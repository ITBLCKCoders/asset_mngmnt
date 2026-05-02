import { useState, useEffect } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Archive, Clock, ShieldCheck, AlertTriangle, Database, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn('animate-shimmer rounded bg-gray-200/80', className)} />
);

interface RetentionSettings {
  id: string;
  company_id: string;
  retention_months: number;
  is_active: boolean;
  last_archived_at: string | null;
  archived_count: number;
  created_at: string;
  updated_at: string;
}

interface SystemDefaults {
  default_months: number;
  minimum_months: number;
}

export function AuditRetentionTab({ isActive }: { isActive?: boolean }) {
  const { user: currentUser } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [settings, setSettings] = useState<RetentionSettings | null>(null);
  const [systemDefaults, setSystemDefaults] = useState<SystemDefaults | null>(null);
  const [formData, setFormData] = useState({
    retention_months: 36,
    is_active: true,
  });
  const [defaultsForm, setDefaultsForm] = useState({
    default_months: 36,
    minimum_months: 12,
  });

  const isSuperAdmin = currentUser?.role?.name === 'Super Admin';

  useEffect(() => {
    if (isActive) {
      setIsTabLoading(true);
      const timer = setTimeout(() => setIsTabLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      fetchSettings();
      if (isSuperAdmin) {
        fetchSystemDefaults();
      }
    }
  }, [isActive, isSuperAdmin]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/audit-retention/settings');
      if (response.success && response.data) {
        setSettings(response.data);
        setFormData({
          retention_months: response.data.retention_months,
          is_active: response.data.is_active,
        });
      } else {
        // If no settings exist yet, keep the default form data
        setSettings(null);
      }
    } catch (error: any) {
      console.error('Failed to fetch retention settings:', error);
      // Don't show toast on 404 - settings might not exist yet
      if (error?.response?.status !== 404) {
        toast.error('Failed to load retention settings');
      }
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSystemDefaults = async () => {
    try {
      const response = await api.get('/audit-retention/defaults');
      if (response.success && response.data) {
        setSystemDefaults(response.data);
        setDefaultsForm({
          default_months: response.data.default_months,
          minimum_months: response.data.minimum_months,
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch system defaults:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await api.put('/audit-retention/settings', formData);
      if (response.success) {
        toast.success('Retention settings saved successfully');
        fetchSettings();
      } else {
        toast.error(response.error || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Failed to save retention settings:', error);
      toast.error('Failed to save retention settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDefaults = async () => {
    try {
      setIsSaving(true);
      const response = await api.put('/audit-retention/defaults', defaultsForm);
      if (response.success) {
        toast.success('System defaults updated successfully');
        fetchSystemDefaults();
      } else {
        toast.error(response.error || 'Failed to update defaults');
      }
    } catch (error: any) {
      console.error('Failed to save system defaults:', error);
      toast.error('Failed to update system defaults');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerArchive = async () => {
    try {
      setIsArchiving(true);
      const response = await api.post('/audit-retention/archive');
      if (response.success) {
        toast.success(`Archived ${response.data.archivedCount} audit logs`);
        fetchSettings();
      } else {
        toast.error(response.error || 'Failed to trigger archive');
      }
    } catch (error: any) {
      console.error('Failed to trigger archive:', error);
      toast.error('Failed to trigger archive');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <TabsContent value="audit-retention" className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          Audit Log Retention
        </h2>
        <p className="text-muted-foreground">
          Configure how long audit logs are retained and manage automatic archival.
        </p>
      </div>

      <Card className="border-2 shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 text-xl text-white font-bold">
            <Clock className="h-6 w-6 text-white" />
            Retention Settings
          </CardTitle>
          <CardDescription className="text-base text-white">
            Set how long audit logs are kept before being archived.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {isLoading ? (
            <>
              <div className="space-y-3">
                <Shimmer className="h-5 w-48 rounded" />
                <div className="flex items-center gap-2">
                  <Shimmer className="h-10 w-10 rounded" />
                  <Shimmer className="h-10 flex-1 rounded" />
                  <Shimmer className="h-10 w-10 rounded" />
                </div>
                <Shimmer className="h-4 w-80 rounded" />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-0.5">
                  <Shimmer className="h-5 w-56 rounded" />
                  <Shimmer className="h-4 w-64 rounded" />
                </div>
                <Shimmer className="h-8 w-16 rounded-full" />
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm gap-2">
                  <Shimmer className="h-4 w-32 rounded" />
                  <Shimmer className="h-4 w-24 rounded" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm gap-2">
                  <Shimmer className="h-4 w-28 rounded" />
                  <Shimmer className="h-4 w-20 rounded" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Shimmer className="h-10 w-32 rounded" />
                <Shimmer className="h-10 w-32 rounded" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <Label htmlFor="retention_months" className="text-base font-semibold">Retention Period (Months)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => {
                      const newValue = Math.max(6, formData.retention_months - 6);
                      setFormData({ ...formData, retention_months: newValue });
                    }}
                    disabled={isSaving || formData.retention_months <= 6}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Select
                    value={String(formData.retention_months)}
                    onValueChange={(value) => setFormData({ ...formData, retention_months: parseInt(value) })}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="flex-1 min-w-[120px]">
                      <SelectValue placeholder="Select retention period" />
                    </SelectTrigger>
                    <SelectContent>
                      {[6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120].map((months) => (
                        <SelectItem key={months} value={String(months)}>
                          {months} months
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => {
                      const newValue = Math.min(120, formData.retention_months + 6);
                      setFormData({ ...formData, retention_months: newValue });
                    }}
                    disabled={isSaving || formData.retention_months >= 120}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Audit logs older than this period will be archived. Range: 6-120 months.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active" className="text-base font-semibold">Enable Automatic Archival</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically archive logs when they exceed the retention period.
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  disabled={isSaving}
                />
              </div>

              {settings && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm gap-2">
                    <span className="text-muted-foreground font-medium">Last Archived:</span>
                    <span className="font-semibold">
                      {settings.last_archived_at
                        ? new Date(settings.last_archived_at).toLocaleString()
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm gap-2">
                    <span className="text-muted-foreground font-medium">Total Archived:</span>
                    <span className="font-semibold">{settings.archived_count} logs</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTriggerArchive}
                  disabled={isArchiving || !formData.is_active}
                  className="w-full sm:w-auto"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {isArchiving ? 'Archiving...' : 'Archive Now'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <>
          <Separator />
          <Card className="border-2 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 rounded-t-2xl">
              <CardTitle className="flex items-center gap-2 text-xl text-white font-bold">
                <Database className="h-6 w-6 text-white" />
                System Defaults
              </CardTitle>
              <CardDescription className="text-base text-white">
                Configure default retention settings for new companies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {isTabLoading ? (
                <>
                  <div className="space-y-3">
                    <Shimmer className="h-5 w-48 rounded" />
                    <Shimmer className="h-10 w-full rounded" />
                  </div>

                  <div className="space-y-3">
                    <Shimmer className="h-5 w-48 rounded" />
                    <Shimmer className="h-10 w-full rounded" />
                    <Shimmer className="h-4 w-80 rounded" />
                  </div>

                  <Shimmer className="h-10 w-32 rounded" />
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label htmlFor="default_months" className="text-base font-semibold">Default Retention (Months)</Label>
                    <Input
                      id="default_months"
                      type="number"
                      min="6"
                      max="120"
                      value={defaultsForm.default_months}
                      onChange={(e) =>
                        setDefaultsForm({ ...defaultsForm, default_months: parseInt(e.target.value) || 36 })
                      }
                      disabled={isSaving}
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="minimum_months" className="text-base font-semibold">Minimum Retention (Months)</Label>
                    <Input
                      id="minimum_months"
                      type="number"
                      min="6"
                      max="120"
                      value={defaultsForm.minimum_months}
                      onChange={(e) =>
                        setDefaultsForm({ ...defaultsForm, minimum_months: parseInt(e.target.value) || 12 })
                      }
                      disabled={isSaving}
                      className="text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      System-wide floor for retention periods. Companies cannot set retention below this value.
                    </p>
                  </div>

                  <Button onClick={handleSaveDefaults} disabled={isSaving} className="w-full sm:w-auto">
                    {isSaving ? 'Saving...' : 'Update Defaults'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card className="border-red-500 bg-gradient-to-br from-red-600 to-red-700 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white font-bold">
            <AlertTriangle className="h-6 w-6" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-white space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white mt-2 flex-shrink-0" />
            <p className="leading-relaxed">
              Archived logs are moved to a separate table and can still be accessed for compliance purposes.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white mt-2 flex-shrink-0" />
            <p className="leading-relaxed">
              Setting retention too low may impact compliance requirements and audit trail integrity.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white mt-2 flex-shrink-0" />
            <p className="leading-relaxed">
              Archival is triggered manually or via scheduled job. Consider setting up a cron job for automatic archival.
            </p>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
