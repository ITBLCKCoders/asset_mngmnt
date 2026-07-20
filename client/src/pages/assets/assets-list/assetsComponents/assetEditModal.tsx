'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Package,
  Wrench,
  MapPin,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Users } from 'lucide-react';

import { Step1AssetInfo } from './modalSteps/step1AssetsInfo';
import { Step2Lifecycle } from './modalSteps/step2AssetsLifeCycle';
import { Step3Location } from './modalSteps/step3Location';
import { Step4Review } from './modalSteps/step4AssetsReview';

import {
  AssetFormData,
  UpdateFormHandler,
  initialAssetFormData,
  mapApiMaintenanceScheduleToForm,
} from '../assetsComponents/assetTypes/assetFormTypes';
import { Asset } from './assetTable/assetData';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCompanyContext } from '@/context/CompanyContext';

interface EditAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onSubmit: (assetId: string, data: AssetFormData) => Promise<void>;
}

const steps = [
  { title: 'Asset Info', icon: Package },
  { title: 'Lifecycle', icon: Wrench },
  { title: 'Location', icon: MapPin },
  { title: 'Review', icon: CheckCircle2 },
] as const;

const stepTitles = [
  'Asset Information',
  'Financial & Lifecycle Information',
  'Location & Assignment',
  '',
] as const;

const isStepValid = (step: number, data: AssetFormData) => {
  if (step === 0) {
    return !!(
      data.name &&
      data.categoryId &&
      data.supplier &&
      data.typeId &&
      data.brand &&
      data.model &&
      data.serial
    );
  }
  if (step === 1) {
    if (data.isOldUnit) {
      return !!(data.condition && data.status && data.maintenanceSchedule);
    } else {
      return !!(
        data.purchaseDate &&
        data.assetValue &&
        data.usefulLifeYears &&
        data.condition &&
        data.status
      );
    }
  }
  if (step === 2) {
    return !!(
      data.company &&
      data.locationBuilding &&
      data.department &&
      data.locationSite &&
      data.locationRoom
    );
  }
  return true;
};

export function EditAssetModal({
  isOpen,
  onClose,
  asset,
  onSubmit,
}: EditAssetModalProps) {
  const { user } = useCurrentUser();
  const { activeCompany: contextActiveCompany } = useCompanyContext();
  const activeCompany = useMemo(() => {
    const isSuperAdminOrAdmin =
      user?.role?.name === 'Global Admin' || user?.role?.name === 'Admin';
    if (isSuperAdminOrAdmin) return contextActiveCompany;
    if (user?.company_id) return { id: user.company_id, name: user.company || '' };
    return contextActiveCompany;
  }, [user, contextActiveCompany]);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<AssetFormData>(initialAssetFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add dialogs state
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [isAddBrandOpen, setIsAddBrandOpen] = useState(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);

  // Form states for add dialogs
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    prefix: '',
    gl_code: '',
    departmentId: '',
  });
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    categoryId: '',
    contact: '',
    email: '',
  });
  const [typeForm, setTypeForm] = useState({
    name: '',
    categoryId: '',
    prefix: '',
  });
  const [brandForm, setBrandForm] = useState({
    name: '',
    typeId: '',
    prefix: '',
  });
  const [locationForm, setLocationForm] = useState({
    name: '',
    floor_unit: '',
    building: '',
    room_areas: [{ room_name: '' }],
    department_id: '',
    description: '',
  });

  // Data states for dropdowns
  const [categories, setCategories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Saving states
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  const { roleCustodian } = useUserPermissions();

  const categoriesForStep1 = useMemo(() => {
    if (!roleCustodian || categories.length === 0) return categories;
    const deptName = (c: any) =>
      (typeof c.department === 'object' && c.department?.name
        ? c.department.name
        : ''
      )
        .toString()
        .toLowerCase();
    const isIT = (n: string) =>
      n.includes('it') || n.includes('information technology');
    const isAdmin = (n: string) =>
      n.includes('admin') || n.includes('administration');
    const scope =
      roleCustodian.managerRole === 'overallManager'
        ? null
        : roleCustodian.managerRole === 'itManager' ||
            roleCustodian.assetType === 'it'
          ? 'it'
          : roleCustodian.managerRole === 'adminManager' ||
              roleCustodian.assetType === 'admin'
            ? 'admin'
            : null;
    let filtered = categories;
    if (scope === 'it') filtered = categories.filter(c => isIT(deptName(c)));
    else if (scope === 'admin')
      filtered = categories.filter(c => isAdmin(deptName(c)));
    return [...filtered].sort((a, b) => {
      const aIT = isIT(deptName(a));
      const bIT = isIT(deptName(b));
      if (aIT && !bIT) return -1;
      if (!aIT && bIT) return 1;
      const aAdmin = isAdmin(deptName(a));
      const bAdmin = isAdmin(deptName(b));
      if (aAdmin && !bAdmin) return 1;
      if (!aAdmin && bAdmin) return -1;
      return 0;
    });
  }, [categories, roleCustodian]);

  const typesForStep1 = useMemo(() => {
    const scopedIds = new Set(
      categoriesForStep1.map((c: any) => c.id?.toString())
    );
    if (scopedIds.size === 0) return types;
    return types.filter(
      (t: any) =>
        scopedIds.has(t.categoryId?.toString()) ||
        scopedIds.has(t.category_id?.toString()) ||
        t.categoryId === null ||
        t.category_id === null
    );
  }, [types, categoriesForStep1]);

  const suppliersForStep1 = useMemo(() => {
    const scopedIds = new Set(
      categoriesForStep1.map((c: any) => c.id?.toString())
    );
    if (scopedIds.size === 0) return suppliers;
    return suppliers.filter(
      (s: any) =>
        scopedIds.has(s.categoryId?.toString()) ||
        scopedIds.has(s.category_id?.toString()) ||
        s.categoryId === null ||
        s.category_id === null
    );
  }, [suppliers, categoriesForStep1]);

  const canAddLocation = useMemo(() => {
    if (user?.role?.name === 'Global Admin' || user?.role?.name === 'Admin')
      return true;
    if (
      roleCustodian &&
      (roleCustodian.assetType === 'it' ||
        roleCustodian.assetType === 'admin' ||
        ['itManager', 'adminManager', 'overallManager'].includes(
          roleCustodian.managerRole
        ))
    )
      return true;
    return false;
  }, [user?.role?.name, roleCustodian]);

  // Convert Asset to AssetFormData format
  const convertAssetToFormData = (
    asset: Asset,
    categories: any[],
    types: any[],
    brands: any[],
    locations: any[]
  ): AssetFormData => {
    // Map status from Asset to AssetFormData
    const mapStatus = (status: string): AssetFormData['status'] => {
      switch (status) {
        case 'In Maintenance':
          return 'Repairing';
        case 'Assigned':
          return 'Assigned';
        case 'Available':
          return 'Available';
        case 'For Investigation':
          return 'For Investigation';
        case 'For Disposal':
          return 'For Disposal';
        case 'Borrowed':
          return 'Borrowed';
        case 'Service Unit':
          return 'Service Unit';
        case 'For Isolation':
          return 'For Isolation';
        default:
          return 'Available';
      }
    };

    // Map depreciation method
    const mapDepreciationMethod = (
      method: string
    ): AssetFormData['depreciationMethod'] => {
      switch (method.toLowerCase()) {
        case 'straight line':
          return 'straight-line';
        case 'declining balance':
          return 'declining-balance';
        case 'double declining':
          return 'double-declining';
        case 'units of production':
          return 'units-of-production';
        default:
          return 'straight-line';
      }
    };

    // Map condition from Asset to AssetFormData
    const mapCondition = (condition: string): AssetFormData['condition'] => {
      switch (condition) {
        case 'Excellent':
          return 'Excellent';
        case 'Good':
          return 'Good';
        case 'Needs Repair':
          return 'Needs Repair';
        case 'Damaged':
          return 'Damaged';
        case 'Obsolete':
          return 'Obsolete';
        case 'New':
          return 'New';
        case 'Bad':
          return 'Bad';
        default:
          return 'Good';
      }
    };

    // Parse location to separate site and room
    const parseLocation = (location: string) => {
      const parts = location.split(' - ');
      if (parts.length > 1) {
        return { site: parts[0], room: parts.slice(1).join(' - ') };
      } else {
        return { site: '', room: location };
      }
    };

    const { site, room } = parseLocation(asset.location);

    // Try to match the site with actual locations from the API
    let matchedLocation = null;
    if (locations.length > 0 && site) {
      // First try exact name match
      matchedLocation = locations.find(
        loc => loc.name.toLowerCase() === site.toLowerCase()
      );

      // If no exact match, try partial match (site contains location name or vice versa)
      if (!matchedLocation) {
        matchedLocation = locations.find(
          loc =>
            site.toLowerCase().includes(loc.name.toLowerCase()) ||
            loc.name.toLowerCase().includes(site.toLowerCase())
        );
      }
    }

    // Prefer stable IDs from the asset row, then fall back to name matching
    const matchedCategory =
      categories.length > 0
        ? (asset.categoryId
            ? categories.find(
                cat => String(cat.id) === String(asset.categoryId)
              )
            : null) ||
          categories.find(
            cat => cat.name.toLowerCase() === asset.category.toLowerCase()
          )
        : null;
    const matchedType =
      types.length > 0
        ? (asset.typeId
            ? types.find(type => String(type.id) === String(asset.typeId))
            : null) ||
          types.find(
            type => type.name.toLowerCase() === asset.type.toLowerCase()
          )
        : null;

    // Try to match brand by name with more robust matching
    let matchedBrand = null;
    if (brands.length > 0 && asset.brand) {
      const assetBrandName = asset.brand.trim();

      // First try exact match (case insensitive)
      matchedBrand = brands.find(
        brand =>
          brand.name.trim().toLowerCase() === assetBrandName.toLowerCase()
      );

      // If no exact match, try partial match
      if (!matchedBrand) {
        matchedBrand = brands.find(
          brand =>
            brand.name
              .trim()
              .toLowerCase()
              .includes(assetBrandName.toLowerCase()) ||
            assetBrandName
              .toLowerCase()
              .includes(brand.name.trim().toLowerCase())
        );
      }

      // If still no match, try to find by type and brand combination
      if (!matchedBrand && asset.type && matchedType) {
        matchedBrand = brands.find(
          brand =>
            (brand.typeId === matchedType?.id ||
              brand.type_id === matchedType?.id) &&
            brand.name
              .trim()
              .toLowerCase()
              .includes(assetBrandName.toLowerCase())
        );
      }

      // If still no match, just use the first brand as fallback
      if (!matchedBrand && brands.length > 0) {
        matchedBrand = brands[0];
        console.log(
          'No exact brand match found, using first brand as fallback:',
          matchedBrand
        );
      }
    }

    return {
      name: asset.name,
      description: asset.description,
      category: asset.category,
      categoryId:
        asset.categoryId ||
        matchedCategory?.id?.toString() ||
        '',
      type: asset.type,
      typeId: asset.typeId || matchedType?.id?.toString() || '',
      brand: asset.brand || matchedBrand?.name || '',
      brandId: matchedBrand?.id?.toString() || '',
      model: asset.modelNo,
      serial: asset.serialNo,
      supplier: asset.supplier,
      purchaseDate: asset.purchaseDate
        ? asset.purchaseDate.toISOString()
        : undefined,
      assetValue: asset.purchasePrice,
      salvageValue: asset.salvageValue,
      depreciationMethod: mapDepreciationMethod(asset.depreciationMethod),
      usefulLifeYears: asset.usefulLifeYears,
      annualDepreciation: asset.annualDepreciation,
      depreciationStartDate: asset.depreciationStartDate
        ? asset.depreciationStartDate.toISOString()
        : undefined,
      company: asset.company || activeCompany?.name || '',
      companyId: asset.company_id || activeCompany?.id || '',
      locationSite: matchedLocation?.locationID || matchedLocation?.id || '', // Use matched location ID or empty string
      locationSiteName: matchedLocation?.name || site,
      locationBuilding: asset.building,
      locationRoom: room,
      department: asset.department,
      locationNotes: asset.location || '',
      warrantyMonths: asset.warranty
        ? parseInt(asset.warranty.split(' ')[0])
        : undefined,
      condition: mapCondition(asset.condition),
      maintenanceSchedule: mapApiMaintenanceScheduleToForm(
        asset.maintenanceSchedule
      ),
      status: mapStatus(asset.status),
      isOldUnit: Boolean(
        asset.isOldUnit ||
        asset.is_old_unit ||
        (asset.purchaseDate &&
          asset.purchaseDate.getFullYear() === 2000 &&
          asset.purchaseDate.getMonth() === 0 &&
          asset.purchaseDate.getDate() === 1) ||
        // Fallback: detect old unit from asset code pattern (contains "OU")
        (asset.id && (asset.id.includes('-OU-') || asset.id.includes('OU-')))
      ),

      imageUrl: asset.image,
      documents: [], // Asset documents are not File objects, so we'll leave empty for now
      assetId: asset.id,
    };
  };

  const updateForm: UpdateFormHandler = (key, value) => {
    setFormData(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      return { ...prev, [key]: newValue };
    });
  };

  const fetchDepartments = async () => {
    try {
      const companyId = activeCompany?.id;
      const url = companyId ? `/departments?companyId=${companyId}` : '/departments';
      const response = await api.get(url);
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  const fetchCategories = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get('/categories');
      setCategories(
        data.map((cat: any) => ({ ...cat, id: cat.categoryID || cat.id }))
      );
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchTypes = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get('/types');
      setTypes(
        data.map((type: any) => ({ ...type, id: type.typeID || type.id }))
      );
    } catch (error) {
      console.error('Failed to fetch types:', error);
    }
  };

  const fetchSuppliers = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get('/suppliers');
      setSuppliers(
        data.map((supplier: any) => ({
          ...supplier,
          id: supplier.supplierID || supplier.id,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchBrands = async () => {
    if (!activeCompany) return;
    try {
      const data = await api.get('/brands');
      setBrands(
        data.map((brand: any) => ({ ...brand, id: brand.brandID || brand.id }))
      );
    } catch (error) {
      console.error('Failed to fetch brands:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      setLocations(response.locations || []);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
    }
  };

  useEffect(() => {
    if (isOpen && asset) {
      fetchUsers();
      setCurrentStep(0);
    }
  }, [isOpen, asset]);

  // Convert asset data when all required data is available
  useEffect(() => {
    if (
      isOpen &&
      asset &&
      categories.length > 0 &&
      types.length > 0 &&
      brands.length > 0
    ) {
      const convertedData = convertAssetToFormData(
        asset,
        categories,
        types,
        brands,
        locations
      );
      setFormData(convertedData);
    }
  }, [isOpen, asset, categories, types, brands, locations]);

  // Debug: Log brands and form data to understand the issue
  useEffect(() => {
    if (isOpen && asset) {
      console.log('Asset being edited:', asset);
      console.log('isOldUnit from asset:', asset.isOldUnit);
      console.log('is_old_unit from asset:', asset.is_old_unit);
      console.log('Purchase date:', asset.purchaseDate);
      console.log('Purchase date to ISO:', asset.purchaseDate?.toISOString());
      console.log('Available brands:', brands);
      console.log('Current form data:', formData);

      // Debug the isOldUnit conversion logic
      const isOldUnitValue = Boolean(
        asset.isOldUnit ||
        asset.is_old_unit ||
        (asset.purchaseDate &&
          asset.purchaseDate.getFullYear() === 2000 &&
          asset.purchaseDate.getMonth() === 0 &&
          asset.purchaseDate.getDate() === 1)
      );
      console.log('Calculated isOldUnit value:', isOldUnitValue);
      console.log('asset.isOldUnit:', asset.isOldUnit);
      console.log('asset.is_old_unit:', asset.is_old_unit);
      if (asset.purchaseDate) {
        console.log('Purchase date details:', {
          year: asset.purchaseDate.getFullYear(),
          month: asset.purchaseDate.getMonth(),
          date: asset.purchaseDate.getDate(),
          is2000Jan1:
            asset.purchaseDate.getFullYear() === 2000 &&
            asset.purchaseDate.getMonth() === 0 &&
            asset.purchaseDate.getDate() === 1,
        });
      }

      // Log all asset properties to see what's actually available
      console.log('All asset properties:', Object.keys(asset));
      console.log(
        'Asset property values:',
        Object.entries(asset).filter(
          ([key]) =>
            key.toLowerCase().includes('old') ||
            key.toLowerCase().includes('unit')
        )
      );
    }
  }, [isOpen, asset, brands, formData]);

  useEffect(() => {
    if (activeCompany) {
      fetchCategories();
      fetchTypes();
      fetchSuppliers();
      fetchBrands();
      fetchDepartments();
      fetchLocations();
    }
  }, [activeCompany]);

  useEffect(() => {
    if (isOpen && asset) {
      setFormData(prev => ({
        ...prev,
        company: asset.company || activeCompany?.name || prev.company || '',
        companyId:
          asset.company_id || activeCompany?.id || prev.companyId || '',
      }));
    }
  }, [isOpen, asset, activeCompany?.id, activeCompany?.name]);

  // Function to check if any changes were made to the asset
  const checkForChanges = (
    originalAsset: Asset,
    newData: AssetFormData
  ): boolean => {
    // Compare key fields to see if any changes were made
    const changes = {
      name: originalAsset.name !== newData.name,
      description: originalAsset.description !== newData.description,
      category: originalAsset.category !== newData.category,
      type: originalAsset.type !== newData.type,
      brand: originalAsset.brand !== newData.brand,
      model: originalAsset.modelNo !== newData.model,
      serial: originalAsset.serialNo !== newData.serial,
      supplier: originalAsset.supplier !== newData.supplier,
      purchaseDate:
        originalAsset.purchaseDate?.toISOString() !== newData.purchaseDate,
      assetValue: originalAsset.purchasePrice !== newData.assetValue,
      salvageValue: originalAsset.salvageValue !== newData.salvageValue,
      depreciationMethod:
        originalAsset.depreciationMethod !== newData.depreciationMethod,
      usefulLifeYears:
        originalAsset.usefulLifeYears !== newData.usefulLifeYears,
      annualDepreciation:
        originalAsset.annualDepreciation !== newData.annualDepreciation,
      depreciationStartDate:
        originalAsset.depreciationStartDate?.toISOString() !==
        newData.depreciationStartDate,
      company: originalAsset.company !== newData.company,
      locationBuilding: originalAsset.building !== newData.locationBuilding,
      department: originalAsset.department !== newData.department,
      warrantyMonths:
        originalAsset.warranty !== `${newData.warrantyMonths} months`,
      condition: originalAsset.condition !== newData.condition,
      maintenanceSchedule:
        originalAsset.maintenanceSchedule !== newData.maintenanceSchedule,
      status: originalAsset.status !== newData.status,
      image: originalAsset.image !== newData.imageUrl,
    };

    // Return true if any field has changed
    return Object.values(changes).some(change => change);
  };

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      setIsSubmitting(true);
      try {
        if (asset) {
          // Check if any changes were made
          const hasChanges = checkForChanges(asset, formData);

          if (hasChanges) {
            await onSubmit(asset.id, formData);
          } else {
            // No changes made, just close the modal
            toast.info('No changes detected. Closing edit modal.');
          }

          setCurrentStep(0);
          setFormData(initialAssetFormData);
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleClose = () => {
    setCurrentStep(0);
    setFormData(initialAssetFormData);
    onClose();
  };

  // Modified handleNext to check for changes before submitting
  const handleNextWithChangeCheck = async () => {
    if (currentStep === steps.length - 1) {
      setIsSubmitting(true);
      try {
        if (asset) {
          // Debug: Log the form data being submitted
          console.log(
            'handleNextWithChangeCheck - Submitting form data:',
            formData
          );
          console.log(
            'handleNextWithChangeCheck - formData.name:',
            formData.name
          );
          console.log(
            'handleNextWithChangeCheck - formData.categoryId:',
            formData.categoryId
          );

          // Prepare the data for submission with proper data types
          const submissionData = {
            ...formData,
            // Only map "Assigned" to "Available" if server doesn't support "Assigned"
            // For now, keep the original status to preserve user intent
            status: formData.status
              ? (formData.status
                  .toString()
                  .substring(0, 20) as AssetFormData['status'])
              : 'Available',
            // Ensure other numeric fields are properly typed (undefined instead of null)
            assetValue: formData.assetValue
              ? Number(formData.assetValue)
              : undefined,
            salvageValue: formData.salvageValue
              ? Number(formData.salvageValue)
              : undefined,
            usefulLifeYears: formData.usefulLifeYears
              ? Number(formData.usefulLifeYears)
              : undefined,
            annualDepreciation: formData.annualDepreciation
              ? Number(formData.annualDepreciation)
              : undefined,
            warrantyMonths: formData.warrantyMonths
              ? Number(formData.warrantyMonths)
              : undefined,
          };

          // Debug: Log the actual status value being sent
          console.log('handleNextWithChangeCheck - Status value being sent:', {
            original: formData.status,
            processed: submissionData.status,
            type: typeof submissionData.status,
            length: submissionData.status ? submissionData.status.length : 0,
          });

          console.log(
            'handleNextWithChangeCheck - Prepared submission data:',
            submissionData
          );

          // Check if any changes were made
          const hasChanges = checkForChanges(asset, submissionData);
          console.log('handleNextWithChangeCheck - Has changes:', hasChanges);

          if (hasChanges) {
            try {
              await onSubmit(asset.id, submissionData);
              // The onSubmit function will handle showing success/error toasts
              // Close the modal after successful update
              handleClose();
            } catch (error) {
              // Error is already handled by onSubmit, no need to show additional error
              console.error('Update failed:', error);
              // Don't close the modal on error
            }
          } else {
            // No changes made, just close the modal
            toast.info('No changes detected. Closing edit modal.');
            handleClose();
            return;
          }

          setCurrentStep(0);
          setFormData(initialAssetFormData);
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  // Save functions for add dialogs
  const handleSaveCategory = async () => {
    try {
      setSavingCategory(true);
      const response = await api.post('/categories', categoryForm);
      const newCategory = {
        ...categoryForm,
        id: response.id || response.categoryID || `temp-${Date.now()}`,
      };
      setCategories(prev => [...prev, newCategory]); // Optimistic update
      updateForm('categoryId', newCategory.id.toString()); // Pre-select the new category
      updateForm('category', newCategory.name); // Set category name
      toast.success('Category created successfully');
      setIsAddCategoryOpen(false);
      setCategoryForm({ name: '', prefix: '', gl_code: '', departmentId: '' });
      fetchCategories(); // Refetch to get correct data
    } catch (error: any) {
      console.error('Failed to save category:', error);
      toast.error(error.message || 'Failed to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSaveSupplier = async () => {
    try {
      setSavingSupplier(true);
      const response = await api.post('/suppliers', supplierForm);
      const newSupplier = {
        ...supplierForm,
        id: response.id || response.supplierID || `temp-${Date.now()}`,
      };
      setSuppliers(prev => [...prev, newSupplier]); // Optimistic update
      updateForm('supplier', newSupplier.name); // Pre-select the new supplier
      toast.success('Supplier created successfully');
      setIsAddSupplierOpen(false);
      setSupplierForm({ name: '', categoryId: '', contact: '', email: '' });
      fetchSuppliers(); // Refetch to get correct data
    } catch (error: any) {
      console.error('Failed to save supplier:', error);
      toast.error(error.message || 'Failed to save supplier');
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleSaveType = async () => {
    try {
      setSavingType(true);
      const response = await api.post('/types', typeForm);
      const newType = {
        ...typeForm,
        id: response.id || response.typeID || `temp-${Date.now()}`,
      };
      setTypes(prev => [...prev, newType]); // Optimistic update
      updateForm('typeId', newType.id.toString()); // Pre-select the new type
      updateForm('type', newType.name); // Set type name
      toast.success('Type created successfully');
      setIsAddTypeOpen(false);
      setTypeForm({ name: '', categoryId: '', prefix: '' });
      fetchTypes(); // Refetch to get correct data
      // Also try to open the brand dialog if it was open
      if (isAddBrandOpen) {
        setBrandForm({ ...brandForm, typeId: newType.id.toString() });
      }
    } catch (error: any) {
      console.error('Failed to save type:', error);
      toast.error(error.message || 'Failed to save type');
    } finally {
      setSavingType(false);
    }
  };

  const handleSaveBrand = async () => {
    try {
      setSavingBrand(true);
      const response = await api.post('/brands', brandForm);
      const newBrand = {
        ...brandForm,
        id: response.id || response.brandID || `temp-${Date.now()}`,
      };
      setBrands(prev => [...prev, newBrand]); // Optimistic update
      updateForm('brandId', newBrand.id.toString()); // Pre-select the new brand
      updateForm('brand', newBrand.name); // Set brand name
      toast.success('Brand created successfully');
      setIsAddBrandOpen(false);
      setBrandForm({ name: '', typeId: '', prefix: '' });
      fetchBrands(); // Refetch to get correct data
    } catch (error: any) {
      console.error('Failed to save brand:', error);
      toast.error(error.message || 'Failed to save brand');
    } finally {
      setSavingBrand(false);
    }
  };

  // Save functions for add dialogs
  const handleSaveLocation = async () => {
    try {
      setSavingLocation(true);
      const response = await api.post('/locations', {
        name: locationForm.name,
        floor_unit: locationForm.floor_unit,
        building: locationForm.building,
        room_areas: locationForm.room_areas.filter(r => r.room_name.trim()),
        department_id: locationForm.department_id,
        description: locationForm.description,
      });
      const newLocation = {
        ...locationForm,
        locationID: response.locationID || response.id || `temp-${Date.now()}`,
      };
      // Update locations list
      setLocations(prev => [...prev, newLocation]);
      // Pre-select the new location
      updateForm('locationSite', newLocation.locationID.toString());
      updateForm('locationSiteName', newLocation.name);
      updateForm('locationBuilding', newLocation.building);
      toast.success('Location created successfully');
      setIsAddLocationOpen(false);
      setLocationForm({
        name: '',
        floor_unit: '',
        building: '',
        room_areas: [{ room_name: '' }],
        department_id: '',
        description: '',
      });
      // Refetch locations to get correct data
      const locationResponse = await api.get('/locations');
      setLocations(locationResponse.locations || []);
    } catch (error: any) {
      console.error('Failed to save location:', error);
      toast.error(error.message || 'Failed to save location');
    } finally {
      setSavingLocation(false);
    }
  };

  // Dialog openers with pre-filled data
  const openAddSupplierDialog = () => {
    setSupplierForm({ ...supplierForm, categoryId: formData.categoryId || '' });
    setIsAddSupplierOpen(true);
  };

  const openAddTypeDialog = () => {
    setTypeForm({ ...typeForm, categoryId: formData.categoryId || '' });
    setIsAddTypeOpen(true);
  };

  const openAddBrandDialog = () => {
    if (types.length === 0) {
      toast.error('Please create an asset type first before creating a brand.');
      return;
    }
    setBrandForm({ ...brandForm, typeId: formData.typeId || '' });
    setIsAddBrandOpen(true);
  };

  const openAddLocationDialog = () => {
    setIsAddLocationOpen(true);
  };

  if (!isOpen || !asset) return null;

  return (
    <>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={handleClose} />

        <Card className="relative z-[140] w-full max-w-4xl bg-white rounded-2xl overflow-hidden flex flex-col h-[88dvh] max-h-[840px] min-h-[520px] sm:min-h-[660px] mx-2 sm:mx-4 border-none shadow-2xl ">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white pb-8 sm:pb-12 pt-6 sm:pt-8 px-4 sm:px-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl sm:text-3xl font-bold">Edit Asset</h2>
                <p className="text-blue-100 mt-2 text-sm sm:text-base">
                  Step {currentStep + 1} of {steps.length}
                </p>
                <p className="text-blue-100 text-sm mt-1">
                  Asset: {asset.id} - {asset.name}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </CardHeader>

          <div className="relative -mt-4 sm:-mt-6 md:-mt-8 px-2 md:px-4 flex-shrink-0">
            <div className="flex justify-center overflow-x-auto scrollbar-hide">
              <div className="flex items-center bg-white rounded-full shadow-xl px-2 py-2 sm:px-3 md:px-5 sm:py-3 md:py-4 border-2 md:border-4 border-red-100">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;

                  return (
                    <div key={index} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-6 h-6 sm:w-8 sm:h-8 md:w-11 md:h-11 rounded-full flex items-center justify-center border-2 md:border-4 transition-all ${
                            isCompleted
                              ? 'bg-green-500 text-white border-green-300'
                              : isActive
                                ? 'bg-red-600 text-white border-red-300 ring-2 md:ring-4 ring-red-100'
                                : 'bg-gray-100 text-gray-400 border-gray-300'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 md:h-6 md:w-6" />
                          ) : (
                            <Icon className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                          )}
                        </div>
                        <p
                          className={`mt-1 md:mt-2 text-[10px] sm:text-xs font-medium whitespace-nowrap ${isActive || isCompleted ? 'text-red-700' : 'text-gray-500'}`}
                        >
                          {step.title}
                        </p>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`w-3 sm:w-6 md:w-12 lg:w-16 h-1 mx-1 md:mx-3 ${index < currentStep ? 'bg-green-500' : 'bg-gray-300'}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <CardContent className="flex-1 overflow-y-auto px-4 sm:px-6 pt-5 sm:pt-6 pb-4 min-h-0">
            <h3 className="text-xl sm:text-2xl font-bold text-red-700 mb-6 sm:mb-8 text-center sm:text-left">
              {stepTitles[currentStep]}
            </h3>

            {currentStep === 0 && (
              <Step1AssetInfo
                formData={formData}
                updateForm={updateForm}
                categories={categoriesForStep1}
                types={typesForStep1}
                suppliers={suppliersForStep1}
                brands={brands}
                onOpenAddCategory={() => setIsAddCategoryOpen(true)}
                onOpenAddSupplier={openAddSupplierDialog}
                onOpenAddType={openAddTypeDialog}
                onOpenAddBrand={openAddBrandDialog}
              />
            )}
            {currentStep === 1 && (
              <Step2Lifecycle formData={formData} updateForm={updateForm} />
            )}
            {currentStep === 2 && (
              <Step3Location
                formData={formData}
                updateForm={updateForm}
                onOpenAddLocation={openAddLocationDialog}
                canAddLocation={canAddLocation}
              />
            )}
            {currentStep === 3 && (
              <Step4Review formData={formData} users={users} />
            )}
          </CardContent>

          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 bg-gray-50 border-t">
            <Button
              variant="outline"
              size="lg"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              <ChevronLeft className="mr-2 h-5 w-5" /> Back
            </Button>

            <div className="flex gap-3 w-full sm:w-auto order-1 sm:order-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleClose}
                className="w-full sm:w-auto font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="lg"
                onClick={handleNextWithChangeCheck}
                disabled={isSubmitting}
                className={`w-full sm:w-auto font-semibold ${
                  currentStep === steps.length - 1
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white shadow-lg`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Updating Asset...
                  </>
                ) : currentStep === steps.length - 1 ? (
                  <>
                    Complete & Update Asset{' '}
                    <CheckCircle2 className="ml-2 h-5 w-5" />
                  </>
                ) : (
                  <>
                    Next <ChevronRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <AppDialogFrame className="sm:max-w-md z-[200]">
          <AppDialogGradientHeader
            title="Create New Category"
            description="Add a new asset category to organize your assets."
          />
          <AppDialogBody className="grid gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={categoryForm.name}
                onChange={e =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="e.g., Vehicles, Machinery"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Asset Prefix <span className="text-red-500">*</span>
              </Label>
              <Input
                value={categoryForm.prefix}
                onChange={e =>
                  setCategoryForm({
                    ...categoryForm,
                    prefix: e.target.value.toUpperCase(),
                  })
                }
                maxLength={8}
                placeholder="VEH"
                className="font-mono text-base tracking-wider"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Code <span className="text-red-500">*</span>
              </Label>
              <Input
                value={categoryForm.gl_code}
                onChange={e =>
                  setCategoryForm({ ...categoryForm, gl_code: e.target.value })
                }
                className="font-mono text-base"
                placeholder="2003"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Department <span className="text-red-500">*</span>
              </Label>
              <Select
                value={categoryForm.departmentId || ''}
                onValueChange={value =>
                  setCategoryForm({ ...categoryForm, departmentId: value })
                }
                required
              >
                <SelectTrigger className="w-full bg-white border-gray-300 hover:border-gray-400 focus:border-primary">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 max-h-60 z-[9999]">
                  {departments.map(dept => (
                    <SelectItem
                      key={dept.departmentID}
                      value={dept.departmentID}
                      className="hover:bg-gray-200 cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{dept.name}</span>
                        <span className="text-sm text-gray-500">
                          ({dept.code})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddCategoryOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={
                savingCategory ||
                !categoryForm.name ||
                !categoryForm.prefix ||
                !categoryForm.gl_code ||
                !categoryForm.departmentId
              }
              className="rounded-xl px-6 shadow-md"
            >
              {savingCategory ? 'Saving...' : 'Create Category'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      {/* Add Supplier Dialog */}
      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <AppDialogFrame className="sm:max-w-md z-[200]">
          <AppDialogGradientHeader
            title="Create New Supplier"
            description="Add a new supplier for your assets."
          />
          <AppDialogBody className="grid gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Supplier Name</Label>
              <Input
                value={supplierForm.name}
                onChange={e =>
                  setSupplierForm({ ...supplierForm, name: e.target.value })
                }
                placeholder="e.g., ABC Supplies"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Asset Category</Label>
              <Select
                value={supplierForm.categoryId}
                onValueChange={value =>
                  setSupplierForm({ ...supplierForm, categoryId: value })
                }
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select an asset category" />
                </SelectTrigger>
                <SelectContent className="bg-white z-[9999]">
                  {categories.length === 0 ? (
                    <div className="p-4 text-center space-y-2">
                      <div className="text-sm text-muted-foreground">
                        No categories available
                      </div>
                    </div>
                  ) : (
                    categories.map(cat => (
                      <SelectItem
                        key={cat.id}
                        value={cat.id.toString()}
                        className="hover:bg-gray-200"
                      >
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Contact Number</Label>
              <Input
                value={supplierForm.contact}
                onChange={e =>
                  setSupplierForm({ ...supplierForm, contact: e.target.value })
                }
                placeholder="e.g., +1-234-567-8900"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Email Address</Label>
              <Input
                value={supplierForm.email}
                onChange={e =>
                  setSupplierForm({ ...supplierForm, email: e.target.value })
                }
                type="email"
                placeholder="e.g., contact@abc.com"
                className="text-base"
              />
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddSupplierOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSupplier}
              disabled={savingSupplier || !supplierForm.name}
              className="rounded-xl px-6 shadow-md"
            >
              {savingSupplier ? 'Saving...' : 'Create Supplier'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      {/* Add Type Dialog */}
      <Dialog open={isAddTypeOpen} onOpenChange={setIsAddTypeOpen}>
        <AppDialogFrame className="sm:max-w-md z-[200]">
          <AppDialogGradientHeader
            title="Create New Type"
            description="Add a new asset type within the selected category."
          />
          <AppDialogBody className="grid gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Type Name</Label>
              <Input
                value={typeForm.name}
                onChange={e =>
                  setTypeForm({ ...typeForm, name: e.target.value })
                }
                placeholder="e.g., Laptop, Desktop"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Category</Label>
              <Select
                value={typeForm.categoryId}
                onValueChange={value =>
                  setTypeForm({ ...typeForm, categoryId: value })
                }
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-white z-[9999]">
                  {categories.length === 0 ? (
                    <div className="p-4 text-center space-y-2">
                      <div className="text-sm text-muted-foreground">
                        No categories available
                      </div>
                    </div>
                  ) : (
                    categories.map(cat => (
                      <SelectItem
                        key={cat.id}
                        value={cat.id.toString()}
                        className="hover:bg-gray-200"
                      >
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Type Prefix</Label>
              <Input
                value={typeForm.prefix}
                onChange={e =>
                  setTypeForm({
                    ...typeForm,
                    prefix: e.target.value.toUpperCase(),
                  })
                }
                maxLength={10}
                placeholder="LAP"
                className="font-mono text-base tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                Used in smart asset ID generation when Type format is set to
                'Prefix'
              </p>
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddTypeOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveType}
              disabled={savingType || !typeForm.name}
              className="rounded-xl px-6 shadow-md"
            >
              {savingType ? 'Saving...' : 'Create Type'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      {/* Add Brand Dialog */}
      <Dialog open={isAddBrandOpen} onOpenChange={setIsAddBrandOpen}>
        <AppDialogFrame className="sm:max-w-md z-[200]">
          <AppDialogGradientHeader
            title="Create New Brand"
            description="Add a new brand for the selected asset type."
          />
          <AppDialogBody className="grid gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Brand Name</Label>
              <Input
                value={brandForm.name}
                onChange={e =>
                  setBrandForm({ ...brandForm, name: e.target.value })
                }
                placeholder="e.g., Dell, HP"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Asset Type</Label>
              <Select
                value={brandForm.typeId}
                onValueChange={value =>
                  setBrandForm({ ...brandForm, typeId: value })
                }
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select an asset type" />
                </SelectTrigger>
                <SelectContent className="bg-white z-[9999]">
                  {types.length === 0 ? (
                    <div className="p-4 text-center space-y-2">
                      <div className="text-sm text-muted-foreground">
                        No asset types available
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Please create a type first
                      </div>
                    </div>
                  ) : (
                    types.map(type => (
                      <SelectItem
                        key={type.id}
                        value={type.id.toString()}
                        className="hover:bg-gray-200"
                      >
                        {type.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Brand Prefix</Label>
              <Input
                value={brandForm.prefix}
                onChange={e =>
                  setBrandForm({
                    ...brandForm,
                    prefix: e.target.value.toUpperCase(),
                  })
                }
                maxLength={8}
                placeholder="DEL"
                className="font-mono text-base tracking-wider"
              />
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddBrandOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveBrand}
              disabled={savingBrand || !brandForm.name}
              className="rounded-xl px-6 shadow-md"
            >
              {savingBrand ? 'Saving...' : 'Create Brand'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>

      {/* Add Location Dialog */}
      <Dialog open={isAddLocationOpen} onOpenChange={setIsAddLocationOpen}>
        <AppDialogFrame className="sm:max-w-md max-h-[80vh] z-[200]">
          <AppDialogGradientHeader
            title="Create New Location"
            description="Add a new location for your assets."
          />
          <AppDialogBody className="grid gap-6 pr-2 overflow-y-auto max-h-[60vh]">
            <div className="space-y-2">
              <Label className="text-base font-medium">Location Name</Label>
              <Input
                value={locationForm.name}
                onChange={e =>
                  setLocationForm({ ...locationForm, name: e.target.value })
                }
                placeholder="e.g., Main Office, Warehouse A"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Floor/Unit</Label>
              <Input
                value={locationForm.floor_unit}
                onChange={e =>
                  setLocationForm({
                    ...locationForm,
                    floor_unit: e.target.value,
                  })
                }
                placeholder="e.g., Floor 5, Unit 101"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Building</Label>
              <Input
                value={locationForm.building}
                onChange={e =>
                  setLocationForm({ ...locationForm, building: e.target.value })
                }
                placeholder="e.g., Main Building, Annex A"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Rooms/Areas</Label>
              <div className="space-y-2">
                {locationForm.room_areas.map((room, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={room.room_name}
                      onChange={e => {
                        const newRooms = [...locationForm.room_areas];
                        newRooms[index] = {
                          ...room,
                          room_name: e.target.value,
                        };
                        setLocationForm({
                          ...locationForm,
                          room_areas: newRooms,
                        });
                      }}
                      placeholder="e.g., Conference Room 101"
                      className="text-base"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newRooms = locationForm.room_areas.filter(
                          (_, i) => i !== index
                        );
                        setLocationForm({
                          ...locationForm,
                          room_areas: newRooms,
                        });
                      }}
                      className="px-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setLocationForm({
                      ...locationForm,
                      room_areas: [
                        ...locationForm.room_areas,
                        { room_name: '' },
                      ],
                    })
                  }
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Room/Area
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Department (Optional)
              </Label>
              <Select
                value={locationForm.department_id || 'none'}
                onValueChange={v =>
                  setLocationForm({
                    ...locationForm,
                    department_id: v === 'none' ? '' : v,
                  })
                }
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="none" className="hover:bg-gray-200">
                    No department
                  </SelectItem>
                  {departments.map(dept => (
                    <SelectItem
                      key={dept.departmentID}
                      value={dept.departmentID}
                      className="hover:bg-gray-200"
                    >
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Description (Optional)
              </Label>
              <Textarea
                value={locationForm.description}
                onChange={e =>
                  setLocationForm({
                    ...locationForm,
                    description: e.target.value,
                  })
                }
                placeholder="Additional details about this location"
                className="text-base min-h-[60px]"
              />
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddLocationOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLocation}
              disabled={savingLocation || !locationForm.name}
              className="rounded-xl px-6 shadow-md"
            >
              {savingLocation ? 'Saving...' : 'Create Location'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>
    </>
  );
}
