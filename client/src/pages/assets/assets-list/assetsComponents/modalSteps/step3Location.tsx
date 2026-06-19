import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, MapPin, Users, Building, Home, Plus } from 'lucide-react';
import { AssetFormData, UpdateFormHandler } from '../assetTypes/assetFormTypes';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Location, Department } from '@/types/assets';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCompanyContext } from '@/context/CompanyContext';
import { LocationFormDialog } from '@/components/common/LocationFormDialog';

interface Step3LocationProps {
  formData: AssetFormData;
  updateForm: UpdateFormHandler;
  canAddLocation?: boolean;
  canAddBuilding?: boolean;
  /**
   * Optional callback supplied by the parent modal so it can open its own
   * "Add Location" dialog. Step3Location currently embeds its own
   * `LocationFormDialog` and ignores this prop, but accepting it here keeps
   * the parent's call signature valid until the parent's dialog is removed.
   */
  onOpenAddLocation?: () => void;
}

export function Step3Location({
  formData,
  updateForm,
  canAddLocation = true,
  canAddBuilding = true,
}: Step3LocationProps) {
  const navigate = useNavigate();
  const { roleCustodian, loading: permissionsLoading } = useUserPermissions();
  const { user } = useCurrentUser();
  const { activeCompany } = useCompanyContext();
  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isBuildingDropdownOpen, setIsBuildingDropdownOpen] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  // Check if user is Super Admin or Admin (can select any company)
  const isSuperAdminOrAdmin = Boolean(
    user?.role?.name?.toLowerCase() === 'super admin' ||
      user?.role?.name?.toLowerCase() === 'admin'
  );

  // Check if user has special role that requires company scoping
  // IT asset, Admin asset, IT Asset Manager, and Admin Asset Manager roles are restricted to their company
  // overallManager can change companies (show all companies)
  // Super Admin and Admin can also change companies (show all companies)
  const hasSpecialRole = Boolean(
    !isSuperAdminOrAdmin &&
      (roleCustodian?.assetType === 'it' ||
        roleCustodian?.assetType === 'admin' ||
        roleCustodian?.managerRole === 'itManager' ||
        roleCustodian?.managerRole === 'adminManager') &&
      roleCustodian?.managerRole !== 'overallManager'
  );

  // Get company ID from selected company name
  // For IT asset and Admin asset users, the company is automatically set via hasSpecialRole logic
  const selectedCompanyId = companies.find(
    c => c.name === formData.company
  )?.id;

  const filteredLocations = locations.filter(loc => {
    const buildingMatch =
      !formData.locationBuilding || loc.building === formData.locationBuilding;
    const companyMatch = !selectedCompanyId || loc.company_id === selectedCompanyId;
    const departmentId = departments.find(d => d.name === formData.department && d.company_id === selectedCompanyId)?.departmentID;
    const departmentMatch =
      !formData.department || loc.department_id === departmentId;
    return buildingMatch && companyMatch && departmentMatch;
  });

  const availableRooms = formData.locationSite
    ? locations
        .find(loc => loc.locationID === formData.locationSite)
        ?.room_areas?.filter(r => r)
        ?.map(r => r.room_name) || []
    : [];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchCompanies(),
          fetchLocations(),
          fetchDepartments(),
        ]);
      } finally {
        setLoading(false);
      }
    };

    // Wait for permissions to load before fetching companies
    if (!permissionsLoading) {
      loadData();
    }
  }, [permissionsLoading, roleCustodian]);

  const fetchCompanies = async () => {
    try {
      let data;
      if (hasSpecialRole) {
        // For users with special roles, fetch only their company
        data = await api.get('/companies/my');
        const userCompany = data?.data?.[0] || data?.companies?.[0] || null;
        if (userCompany) {
          setCompanies([userCompany]);
          // Force update to user's company to override active company
          updateForm('company', userCompany.name);
        } else {
          setCompanies([]);
        }
      } else if (isSuperAdminOrAdmin && activeCompany) {
        // For Super Admin and Admin, show only the active company from global context
        setCompanies([activeCompany]);
        // Update form to use active company if not already set
        if (!formData.company) {
          updateForm('company', activeCompany.name);
        }
      } else {
        // Fallback: fetch all companies (should not happen with global context)
        data = await api.get('/companies');
        setCompanies(data?.companies || data?.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompanies([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      const locs: Location[] = response.locations || [];
      setLocations(locs);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      let companyId: string | undefined;
      if (hasSpecialRole) {
        companyId = user?.company_id ?? undefined;
      } else if (isSuperAdminOrAdmin && activeCompany) {
        companyId = activeCompany.id;
      }
      const url = companyId ? `/departments?companyId=${companyId}` : '/departments';
      const response = await api.get(url);
      setDepartments(response.departments);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  // Filter buildings based on selected company
  // This works for all users including IT asset and Admin asset users
  // since their company is automatically set via hasSpecialRole logic
  const filteredBuildings = formData.company
    ? [
        ...new Set(
          locations
            .filter(loc => {
              const companyId = companies.find(
                c => c.name === formData.company
              )?.id;
              return companyId && loc.company_id === companyId;
            })
            .map(loc => loc.building)
            .filter(Boolean)
        ),
      ]
    : [];

  // Loading skeleton component for select fields
  const SelectSkeleton = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="h-3 w-3 rounded-full bg-red-500" />
      </div>
      <Skeleton className="h-12 w-full rounded-md border border-gray-300" />
    </div>
  );

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <SelectSkeleton />
          <SelectSkeleton />
          <SelectSkeleton />
          <SelectSkeleton />
          <SelectSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2 text-gray-800">
              <Building className="h-5 w-5 text-indigo-600" />
              Company / Business Unit
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              value={formData.company || ''}
              onValueChange={v => {
                updateForm('company', v);
                // Reset building and department when company changes
                updateForm('locationBuilding', '');
                updateForm('department', '');
                updateForm('locationSite', '');
                updateForm('locationSiteName', '');
                updateForm('locationRoom', '');
              }}
              disabled={hasSpecialRole}
            >
              <SelectTrigger className="h-12 text-base border-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent className="bg-white z-[200]">
                {companies.length === 0 ? (
                  <SelectItem
                    value="no-companies"
                    disabled
                    className="text-gray-500"
                  >
                    No companies available
                  </SelectItem>
                ) : (
                  companies.map(c => (
                    <SelectItem
                      key={c.id || c.name}
                      value={c.name}
                      className="hover:bg-gray-200"
                    >
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2 text-gray-800">
              <Building2 className="h-5 w-5 text-indigo-600" />
              Building
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              value={formData.locationBuilding || ''}
              open={isBuildingDropdownOpen}
              onOpenChange={setIsBuildingDropdownOpen}
              onValueChange={v => {
                updateForm('locationBuilding', v);
                updateForm('department', '');
                updateForm('locationSite', '');
                updateForm('locationSiteName', '');
                updateForm('locationRoom', '');
              }}
            >
              <SelectTrigger className="h-12 text-base border-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
                <SelectValue placeholder="Select building" />
              </SelectTrigger>
              <SelectContent className="bg-white z-[200]">
                {filteredBuildings.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto">
                    {filteredBuildings.map((b: string) => (
                      <SelectItem
                        key={b}
                        value={b}
                        className="hover:bg-gray-200"
                      >
                        {b}
                      </SelectItem>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-gray-500">
                    <Building2 className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p>{formData.company ? `No buildings available for ${formData.company}` : 'No buildings available'}</p>
                    <p className="text-xs mt-1">{formData.company ? 'Add a building for this company' : 'Select a company first'}</p>
                  </div>
                )}
                {canAddBuilding && formData.company && (
                  <div className="p-2 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={e => {
                        e.stopPropagation();
                        setIsBuildingDropdownOpen(false);
                        setIsLocationDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Building
                    </Button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2 text-gray-800">
              <Users className="h-5 w-5 text-indigo-600" />
              Department
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              value={formData.department || ''}
              onValueChange={v => {
                updateForm('department', v);
                updateForm('locationSite', '');
                updateForm('locationSiteName', '');
                updateForm('locationRoom', '');
              }}
            >
              <SelectTrigger className="h-12 text-base border-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent className="bg-white z-[200] max-h-60">
                {/* Search input */}
                <div className="px-3 py-2 border-b">
                  <div className="relative">
                    <svg
                      className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <Input
                      placeholder="Search departments..."
                      value={formData.departmentSearch || ''}
                      onChange={e =>
                        updateForm('departmentSearch', e.target.value)
                      }
                      className="pl-8 border-gray-300 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Department list */}
                <div className="max-h-48 overflow-y-auto">
                  {departments
                    .filter(
                      dept =>
                        dept.name
                          .toLowerCase()
                          .includes(
                            (formData.departmentSearch || '').toLowerCase()
                          ) ||
                        dept.code
                          .toLowerCase()
                          .includes(
                            (formData.departmentSearch || '').toLowerCase()
                          )
                    )
                    .filter(dept => {
                      const companyId = companies.find(
                        c => c.name === formData.company
                      )?.id;
                      // Only show departments that belong to the selected company
                      const matches = !formData.company || !companyId || dept.company_id === companyId;
                      return matches;
                    })
                    .map(d => (
                      <SelectItem
                        key={d.departmentID}
                        value={d.name}
                        className="hover:bg-gray-200"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{d.name}</span>
                          <span className="text-sm text-gray-500">
                            ({d.code})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  {departments
                    .filter(
                      dept =>
                        dept.name
                          .toLowerCase()
                          .includes(
                            (formData.departmentSearch || '').toLowerCase()
                          ) ||
                        dept.code
                          .toLowerCase()
                          .includes(
                            (formData.departmentSearch || '').toLowerCase()
                          )
                    )
                    .filter(dept => {
                      const companyId = companies.find(
                        c => c.name === formData.company
                      )?.id;
                      return !formData.company || !companyId || dept.company_id === companyId;
                    }).length === 0 && (
                    <div className="px-2 py-2 text-sm text-gray-500 text-center">
                      No departments found
                    </div>
                  )}
                </div>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2 text-gray-800">
              <MapPin className="h-5 w-5 text-indigo-600" />
              Location
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              value={formData.locationSite || ''}
              open={isLocationDropdownOpen}
              onOpenChange={setIsLocationDropdownOpen}
              onValueChange={v => {
                updateForm('locationSite', v);
                const selectedLocation = locations.find(
                  loc => loc.locationID === v
                );
                if (selectedLocation) {
                  updateForm('locationSiteName', selectedLocation.name);
                  updateForm('locationBuilding', selectedLocation.building);
                  updateForm('locationRoom', '');
                }
              }}
              disabled={!formData.department}
            >
              <SelectTrigger
                className={cn(
                  'h-12 text-base border-gray-300 focus:border-indigo-500 focus:ring-indigo-500',
                  !formData.department && 'text-muted-foreground'
                )}
              >
                <SelectValue
                  placeholder={
                    formData.department
                      ? 'Select location'
                      : 'First select a department'
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-white z-[200]">
                {filteredLocations.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto">
                    {filteredLocations.map(loc => (
                      <SelectItem
                        key={loc.locationID}
                        value={loc.locationID}
                        className="hover:bg-gray-200"
                      >
                        {loc.name}
                      </SelectItem>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-gray-500">
                    <MapPin className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p>No locations available</p>
                    <p className="text-xs mt-1">{formData.department ? `Add a location for ${formData.department}` : 'First select a department'}</p>
                  </div>
                )}
                {canAddLocation && (
                  <div className="p-2 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={e => {
                        e.stopPropagation();
                        setIsLocationDropdownOpen(false);
                        setIsLocationDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Location
                    </Button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2 text-gray-800">
              <MapPin className="h-5 w-5 text-indigo-600" />
              Room / Area
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              value={formData.locationRoom || ''}
              onValueChange={v => updateForm('locationRoom', v)}
              disabled={!formData.locationSite}
            >
              <SelectTrigger
                className={cn(
                  'h-12 text-base',
                  !formData.locationSite && 'text-muted-foreground'
                )}
              >
                <SelectValue
                  placeholder={
                    formData.locationSite
                      ? 'Select room / area'
                      : 'First select a location'
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-white z-[200]">
                {availableRooms.length > 0 ? (
                  availableRooms.map(room => (
                    <SelectItem
                      key={room}
                      value={room}
                      className="hover:bg-gray-200"
                    >
                      {room}
                    </SelectItem>
                  ))
                ) : (
                  <div className="py-6 text-center text-sm text-gray-500">
                    <Home className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p>No rooms available</p>
                    <p className="text-xs mt-1">Select a location first</p>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2 text-gray-800">
              <MapPin className="h-5 w-5 text-indigo-600" />
              Location Notes
            </Label>
            <textarea
              value={formData.locationNotes || ''}
              onChange={e => updateForm('locationNotes', e.target.value)}
              placeholder="Additional notes about the location (e.g., specific instructions, access requirements)"
              className="w-full h-24 px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-vertical"
            />
          </div>
        </div>
      )}
      
      {/* Add Location Dialog */}
      <LocationFormDialog
        isOpen={isLocationDialogOpen}
        setIsOpen={setIsLocationDialogOpen}
        companyId={selectedCompanyId}
        departmentId={departments.find(d => d.name === formData.department)?.departmentID}
        onSuccess={() => {
          fetchLocations();
        }}
      />
    </div>
  );
}
