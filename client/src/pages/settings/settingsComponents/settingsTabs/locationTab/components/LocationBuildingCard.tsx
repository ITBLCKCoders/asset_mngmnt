import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogBody,
  AppDialogChromeFooter,
  AppDialogFrame,
  AppDialogGradientHeader,
  AppAlertDialogChromeFooter,
  AppAlertDialogFrame,
  AppAlertDialogGradientHeader,
  AppAlertDialogMessage,
} from '@/components/common/appDialogChrome';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import React from 'react';

interface LocationBuilding {
  buildingID: string;
  name: string;
  description: string;
  location_count: number;
}

const LocationBuildingCard = () => {
  const { hasPermission } = useUserPermissions();
  const [buildings, setBuildings] = useState<LocationBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(
    new Set()
  );
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<LocationBuilding | null>(null);
  const [deleting, setDeleting] = useState<LocationBuilding | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [initialForm, setInitialForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ buildings: LocationBuilding[] }>(
        '/buildings'
      );
      setBuildings(response.buildings || []);
    } catch (error: any) {
      console.error('Failed to fetch buildings:', error);
      toast.error(error.message || 'Failed to load buildings');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    return (
      form.name !== initialForm.name ||
      form.description !== initialForm.description
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editing) {
        const response = await api.patch<{
          message: string;
          building: LocationBuilding;
        }>(`/buildings/${editing.buildingID}`, form);
        setBuildings(prev =>
          prev.map(b =>
            b.buildingID === editing.buildingID ? response.building : b
          )
        );
        toast.success(response.message);
      } else {
        const response = await api.post<{
          message: string;
          building: LocationBuilding;
        }>('/buildings', form);
        setBuildings(prev => [...prev, response.building]);
        toast.success(response.message);
      }
      setIsOpen(false);
      setEditing(null);
      setForm({ name: '', description: '' });
      setShowCancelAlert(false);
    } catch (error: any) {
      console.error('Failed to save building:', error);
      toast.error(error.message || 'Failed to save building');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await api.delete<{ message: string }>(
        `/buildings/${deleting?.buildingID}`
      );
      setBuildings(prev =>
        prev.filter(b => b.buildingID !== deleting?.buildingID)
      );
      toast.success(response.message);
      setDeleting(null);
    } catch (error: any) {
      console.error('Failed to delete building:', error);
      toast.error(error.message || 'Failed to delete building');
      setDeleting(null);
    }
  };

  const openEdit = (building: LocationBuilding) => {
    setEditing(building);
    const formData = {
      name: building.name,
      description: building.description || '',
    };
    setForm(formData);
    setInitialForm(formData);
    setIsOpen(true);
  };

  const toggleExpanded = (buildingId: string) => {
    const newExpanded = new Set(expandedBuildings);
    if (newExpanded.has(buildingId)) {
      newExpanded.delete(buildingId);
    } else {
      newExpanded.add(buildingId);
    }
    setExpandedBuildings(newExpanded);
  };

  return (
    <Card className="shadow-lg border-0 rounded-2xl overflow-hidden mb-10 bg-card/95 backdrop-blur">
      <CardHeader className="bg-blue-600 rounded-t-2xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Location Buildings
            </CardTitle>
            <p className="text-white/80 mt-2">
              Define and manage buildings for your locations
            </p>
          </div>
          <Button
            size="lg"
            className="shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!hasPermission('Buildings', 'create')}
            onClick={() => {
              setEditing(null);
              setForm({ name: '', description: '' });
              setInitialForm({ name: '', description: '' });
              setIsOpen(true);
            }}
          >
            <Plus className="mr-2 h-5 w-5" />
            Add New Building
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 border-b flex items-center space-x-4 p-4"
              >
                <div className="bg-gray-200 rounded h-6 w-32 animate-shimmer"></div>
                <div className="bg-gray-200 rounded h-6 w-20 animate-shimmer"></div>
                <div className="bg-gray-200 rounded h-6 w-48 animate-shimmer"></div>
                <div className="bg-gray-200 rounded h-6 w-64 animate-shimmer"></div>
                <div className="bg-gray-200 rounded h-6 w-32 animate-shimmer"></div>
                <div className="flex space-x-2 ml-auto">
                  <div className="bg-gray-200 rounded h-8 w-8 animate-shimmer"></div>
                  <div className="bg-gray-200 rounded h-8 w-8 animate-shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        ) : buildings.length === 0 ? (
          <div className="py-20 text-center">
            <Building2 className="mx-auto mb-6 h-20 w-20 text-muted-foreground" />
            <p className="mb-8 text-xl text-muted-foreground">
              No buildings yet
            </p>
            <Button
              size="lg"
              onClick={() => {
                setEditing(null);
                setForm({ name: '', description: '' });
                setInitialForm({ name: '', description: '' });
                setIsOpen(true);
              }}
              disabled={!hasPermission('Buildings', 'create')}
              className="bg-blue-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="mr-3 h-6 w-6" /> Add Your First Building
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 hover:bg-muted/70 transition-colors">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="font-bold text-foreground">
                    Building Name
                  </TableHead>
                  <TableHead className="font-bold text-foreground">
                    Location Count
                  </TableHead>
                  <TableHead className="font-bold text-foreground">
                    Description
                  </TableHead>
                  <TableHead className="text-right font-bold text-foreground">
                    Actions
                  </TableHead>
                </tr>
              </thead>
              <tbody>
                {buildings.map((building, index) => {
                  const isExpanded = expandedBuildings.has(building.buildingID);

                  return (
                    <React.Fragment key={building.buildingID}>
                      <tr
                        key={building.buildingID}
                        className={cn(
                          'h-20 border-b transition-all hover:bg-muted/60 cursor-pointer',
                          index % 2 === 0 && 'bg-muted/20'
                        )}
                      >
                        <TableCell className="w-10"></TableCell>
                        <TableCell className="font-semibold text-foreground/90 text-base">
                          {building.name}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div
                            className="truncate text-sm text-muted-foreground"
                            title={building.location_count.toString()}
                          >
                            {building.location_count}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div
                            className="truncate text-sm text-muted-foreground"
                            title={building.description}
                          >
                            {building.description || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="hover:bg-primary/10 hover:text-primary transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={!hasPermission('Buildings', 'edit')}
                              onClick={e => {
                                e.stopPropagation();
                                openEdit(building);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={!hasPermission('Buildings', 'delete')}
                              onClick={e => {
                                e.stopPropagation();
                                setDeleting(building);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Building Form Dialog */}
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <AppDialogFrame className="sm:max-w-md max-h-[80vh] overflow-hidden !flex !flex-col">
            <AppDialogGradientHeader
              title={editing ? 'Edit Building' : 'Create New Building'}
              description={
                editing ? 'Update building details.' : 'Add a new building.'
              }
            />
            <AppDialogBody className="grid max-h-[60vh] gap-6 overflow-y-auto px-8 py-6 pr-2">
              <div className="space-y-2">
                <Label className="text-base font-medium">Building Name</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Main Building, Annex A"
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">
                  Description (Optional)
                </Label>
                <Textarea
                  value={form.description}
                  onChange={e =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Additional details about this building"
                  className="text-base min-h-[60px]"
                />
              </div>
            </AppDialogBody>
            <AppDialogChromeFooter className="justify-end gap-3 px-8 py-5">
              <Button
                variant="outline"
                onClick={() => {
                  if (hasChanges()) {
                    setShowCancelAlert(true);
                  } else {
                    setIsOpen(false);
                  }
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges()}
                className="rounded-xl px-6 shadow-md"
              >
                {saving
                  ? 'Saving...'
                  : editing
                    ? 'Update Building'
                    : 'Create Building'}
              </Button>
            </AppDialogChromeFooter>
          </AppDialogFrame>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleting}
        onOpenChange={open => !open && setDeleting(null)}
      >
        <AppAlertDialogFrame className="max-w-md">
          <AppAlertDialogGradientHeader
            title={
              <span className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 shrink-0 text-white" />
                Permanently Delete Building?
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
                Existing locations will retain their current building
                assignment.
              </span>
            </AlertDialogDescription>
          </AppAlertDialogMessage>
          <AppAlertDialogChromeFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-medium"
            >
              Yes, Delete Building
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
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
    </Card>
  );
};

export default LocationBuildingCard;
