import { useState, useEffect, useRef } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import {
  AppAlertDialogChromeFooter,
  AppAlertDialogFrame,
  AppAlertDialogGradientHeader,
  AppAlertDialogMessage,
} from '@/components/common/appDialogChrome';
import { SettingsLocationsTabSkeleton } from '@/components/common/pageSkeletons';
import { MapPin, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Location } from '@/types/assets';
import { api } from '@/lib/api';
import LocationForm from './components/LocationForm';
import LocationTable from './components/LocationTable';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export function LocationsTab({
  isActive,
  action,
}: {
  isActive?: boolean;
  action?: string;
}) {
  const { hasPermission } = useUserPermissions();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [deleting, setDeleting] = useState<Location | null>(null);
  const [form, setForm] = useState({
    name: '',
    floor_unit: '',
    building: '',
    room_areas: [] as { roomID?: string; room_name: string }[],
    department_id: '',
    description: '',
  });
  const [initialForm, setInitialForm] = useState({
    name: '',
    floor_unit: '',
    building: '',
    room_areas: [] as { roomID?: string; room_name: string }[],
    department_id: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isTabLoading, setIsTabLoading] = useState(true);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(
    new Set()
  );
  const [activeCompany, setActiveCompany] = useState<any>(null);
  const [copyingSettings, setCopyingSettings] = useState(false);
  const hasOpenedAdd = useRef(false);

  useEffect(() => {
    if (isActive) {
      setIsTabLoading(true);
      const timer = setTimeout(() => setIsTabLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive) fetchLocations();
  }, [isActive]);

  useEffect(() => {
    if (isActive) fetchActiveCompany();
  }, [isActive]);

  useEffect(() => {
    if (isActive && action === 'add' && !isOpen && !hasOpenedAdd.current) {
      setIsOpen(true);
      hasOpenedAdd.current = true;
    }
  }, [isActive, action, isOpen]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ locations: Location[] }>('/locations');
      setLocations(response.locations);
    } catch (error: any) {
      console.error('Failed to fetch locations:', error);
      toast.error(error.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveCompany = async () => {
    try {
      const data = await api.get('/companies/active');
      setActiveCompany(data?.data?.[0] || null);
    } catch (error) {
      console.error('Failed to fetch active company:', error);
    }
  };

  const copyMainCompanySettings = async () => {
    if (!activeCompany) {
      toast.error('No active company selected');
      return;
    }

    try {
      setCopyingSettings(true);
      await api.post('/settings/copy-main-company-locations');
      toast.success('Successfully copied location settings from main company');
      setIsTabLoading(true);
      await fetchLocations();
      setIsTabLoading(false);
    } catch (error: any) {
      console.error('Failed to copy settings:', error);
      toast.error(error.message || 'Failed to copy settings from main company');
    } finally {
      setCopyingSettings(false);
    }
  };

  const hasChanges = () => {
    return (
      form.name !== initialForm.name ||
      form.floor_unit !== initialForm.floor_unit ||
      form.building !== initialForm.building ||
      form.department_id !== initialForm.department_id ||
      JSON.stringify(form.room_areas.map(r => r.room_name)) !==
        JSON.stringify(initialForm.room_areas.map(r => r.room_name)) ||
      form.description !== initialForm.description
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editing) {
        const response = await api.patch<{
          message: string;
          location: Location;
        }>(`/locations/${editing.locationID}`, form);
        setLocations(prev =>
          prev.map(loc =>
            loc.locationID === editing.locationID ? response.location : loc
          )
        );
        toast.success(response.message);
      } else {
        const response = await api.post<{
          message: string;
          location: Location;
        }>('/locations', form);
        setLocations(prev => [...prev, response.location]);
        toast.success(response.message);
      }
      setIsOpen(false);
      setEditing(null);
      setForm({
        name: '',
        floor_unit: '',
        building: '',
        room_areas: [],
        department_id: '',
        description: '',
      });
      setShowCancelAlert(false);
    } catch (error: any) {
      console.error('Failed to save location:', error);
      toast.error(error.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await api.delete<{ message: string }>(
        `/locations/${deleting?.locationID}`
      );
      setLocations(prev =>
        prev.filter(loc => loc.locationID !== deleting?.locationID)
      );
      toast.success(response.message);
      setDeleting(null);
    } catch (error: any) {
      console.error('Failed to delete location:', error);
      toast.error(error.message || 'Failed to delete location');
      setDeleting(null);
    }
  };

  const openEdit = (location: Location) => {
    setEditing(location);
    const formData = {
      name: location.name,
      floor_unit: location.floor_unit || '',
      building: location.building || '',
      room_areas: location.room_areas
        .filter(r => r && r.room_name)
        .map(r => ({ roomID: r.roomID, room_name: r.room_name })),
      department_id: location.department_id || '',
      description: location.description || '',
    };
    setForm(formData);
    setInitialForm(formData);
    setIsOpen(true);
  };

  const toggleExpanded = (locationId: string) => {
    const newExpanded = new Set(expandedLocations);
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId);
    } else {
      newExpanded.add(locationId);
    }
    setExpandedLocations(newExpanded);
  };

  if (isTabLoading) {
    return <SettingsLocationsTabSkeleton />;
  }

  return (
    <TabsContent value="locations" className="mt-0">
      {/* Copy from Main Company Button - Only show for non-main companies that have no existing data */}
      {activeCompany && !activeCompany.is_main && locations.length === 0 && (
        <div className="mb-6">
          <Button
            onClick={copyMainCompanySettings}
            disabled={copyingSettings}
            variant="outline"
            className="w-full sm:w-auto bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 text-blue-700 hover:text-blue-800 font-medium rounded-xl shadow-sm"
          >
            {copyingSettings ? (
              <>
                <div className="mr-2 h-4 w-20 animate-pulse rounded bg-blue-100"></div>
                Copying Settings...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Use the same location settings as the main company
              </>
            )}
          </Button>
        </div>
      )}

      <section className="mb-10">
        <div className="bg-red-600 rounded-t-2xl p-6 mb-0">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Asset Locations
              </h2>
              <p className="text-white/80 mt-2">
                Define and manage physical locations for your assets
              </p>
            </div>

            <LocationForm
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              editing={editing}
              setEditing={setEditing}
              form={form}
              setForm={setForm}
              initialForm={initialForm}
              setInitialForm={setInitialForm}
              hasChanges={hasChanges}
              handleSave={handleSave}
              saving={saving}
              showCancelAlert={showCancelAlert}
              setShowCancelAlert={setShowCancelAlert}
              canCreate={hasPermission('Locations', 'create')}
            />
          </div>
        </div>

        <div className="border border-t-0 border-gray-200 rounded-b-2xl bg-card">
          <LocationTable
            loading={loading}
            locations={locations}
            expandedLocations={expandedLocations}
            toggleExpanded={toggleExpanded}
            openEdit={openEdit}
            setDeleting={setDeleting}
            setIsOpen={setIsOpen}
            setEditing={setEditing}
            setForm={setForm}
            setInitialForm={setInitialForm}
          />
        </div>
      </section>

      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AppAlertDialogFrame>
          <AppAlertDialogGradientHeader title="Cancel Edit?" />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              All changes will be discarded.
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter>
            <AlertDialogCancel onClick={e => e.stopPropagation()}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.stopPropagation();
                setShowCancelAlert(false);
                setIsOpen(false);
                toast.info('Changes discarded');
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
      >
        <AppAlertDialogFrame className="max-w-md">
          <AppAlertDialogGradientHeader
            title={
              <span className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 shrink-0 text-white" />
                Permanently Delete Location?
              </span>
            }
          />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600">
              This action will remove{' '}
              <strong className="text-foreground">{deleting?.name}</strong> from
              the system.
              <br />
              <span className="text-sm text-muted-foreground">
                Existing assets will retain their current location assignment.
              </span>
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-medium"
            >
              Yes, Delete Location
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>
    </TabsContent>
  );
}
