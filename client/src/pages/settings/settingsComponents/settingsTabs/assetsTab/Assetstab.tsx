import { useState, useEffect, useMemo } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  segmentTabsListClassName,
  segmentTabsTriggerClassName,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { ActiveCompany } from './types';
import { useCategories } from './hooks/useCategories';
import { useDepartments } from './hooks/useDepartments';
import { useSuppliers } from './hooks/useSuppliers';
import { useAssetTypes } from './hooks/useAssetTypes';
import { useAssetBrands } from './hooks/useAssetBrands';
import { useIntangibleAssetTypes } from './hooks/useIntangibleAssetTypes';
import { useRiskLevels } from './hooks/useRiskLevels';
import { useSmartIdFormat } from './hooks/useSmartIdFormat';
import { AssetCategories } from './components/AssetCategories';
import { Suppliers } from './components/Suppliers';
import { AssetTypes } from './components/AssetTypes';
import { AssetBrands } from './components/AssetBrands';
import { IntangibleAssetTypes } from './components/IntangibleAssetTypes';
import { RiskLevels } from './components/RiskLevels';
import { SmartAssetIdFormat } from './components/SmartAssetIdFormat';
import { SettingsAssetsTabSkeleton } from '@/components/common/pageSkeletons';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { classifyDepartmentScopeByName } from '@/lib/assetScope';

export function AssetsTab({ isActive }: { isActive?: boolean }) {
  const { user } = useCurrentUser();
  const [isTabLoading, setIsTabLoading] = useState(true);
  const [activeCompany, setActiveCompany] = useState<ActiveCompany | null>(
    null
  );
  const [copyingSettings, setCopyingSettings] = useState(false);

  const {
    categories,
    loading: categoriesLoading,
    fetchCategories,
  } = useCategories();
  const { suppliers, loading: suppliersLoading, fetchSuppliers } = useSuppliers();
  const { types, loading: typesLoading, fetchTypes } = useAssetTypes();
  const { brands, loading: brandsLoading, fetchBrands } = useAssetBrands();
  const {
    types: intangibleAssetTypes,
    loading: intangibleTypesLoading,
    fetchTypes: fetchIntangibleAssetTypes,
  } = useIntangibleAssetTypes();
  const {
    riskLevels,
    loading: riskLevelsLoading,
    fetchRiskLevels,
  } = useRiskLevels();
  const smartIdFormatState = useSmartIdFormat(activeCompany);
  const { fetchAssetIdFormatSettings } = smartIdFormatState;

  // Determine user's role scope
  const userRoleScope = useMemo(() => {
    const normalizedRoleName = (user?.role?.name ?? '').trim().toLowerCase();
    if (normalizedRoleName === 'it asset') return 'IT';
    if (normalizedRoleName === 'admin asset') return 'Admin';
    return null;
  }, [user?.role?.name]);

  // Filter categories based on user's role scope
  const filteredCategories = useMemo(() => {
    if (!userRoleScope) return categories;
    return categories.filter(cat => {
      const deptName = cat.department?.name || null;
      const scope = classifyDepartmentScopeByName(deptName);
      return scope === userRoleScope;
    });
  }, [categories, userRoleScope]);

  // Filter types based on filtered categories
  const filteredTypes = useMemo(() => {
    if (!userRoleScope) return types;
    const filteredCategoryIds = new Set(filteredCategories.map(c => c.id));
    return types.filter(type => filteredCategoryIds.has(type.categoryId || type.category_id || 0));
  }, [types, filteredCategories, userRoleScope]);

  // Filter brands based on filtered types
  const filteredBrands = useMemo(() => {
    if (!userRoleScope) return brands;
    const filteredTypeIds = new Set(filteredTypes.map(t => t.id));
    return brands.filter(brand => filteredTypeIds.has(brand.typeId || brand.type_id || 0));
  }, [brands, filteredTypes, userRoleScope]);

  useEffect(() => {
    if (isActive) {
      setIsTabLoading(true);
      const timer = setTimeout(() => setIsTabLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Skeleton stays until the minimum display time passes AND all real
  // section fetches have resolved — avoids the flash where the skeleton
  // vanishes while tables are still loading their own shimmers.
  const isFetchingSections =
    categoriesLoading ||
    suppliersLoading ||
    typesLoading ||
    brandsLoading ||
    intangibleTypesLoading ||
    riskLevelsLoading ||
    smartIdFormatState.settingsLoading;
  const showSkeleton = isTabLoading || isFetchingSections;

  useEffect(() => {
    if (isActive) fetchCategories();
  }, [isActive, activeCompany]);

  useEffect(() => {
    if (isActive) fetchSuppliers();
  }, [isActive, activeCompany]);

  useEffect(() => {
    if (isActive) fetchTypes();
  }, [isActive, activeCompany]);

  useEffect(() => {
    if (isActive) fetchBrands();
  }, [isActive, activeCompany]);

  useEffect(() => {
    if (isActive) fetchIntangibleAssetTypes();
  }, [isActive, activeCompany]);

  useEffect(() => {
    if (isActive) fetchRiskLevels();
  }, [isActive, activeCompany]);

  useEffect(() => {
    if (isActive) fetchActiveCompany();
  }, [isActive]);

  const fetchActiveCompany = async () => {
    try {
      // Align with server getScopedActiveCompany: user's company first, then global active.
      const myData = await api.get('/companies/my');
      let company = myData?.data?.[0] || null;
      if (!company) {
        const activeData = await api.get('/companies/active');
        company = activeData?.data?.[0] || null;
      }
      setActiveCompany(company);
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
      await api.post('/settings/copy-main-company-assets');
      toast.success('Successfully copied asset settings from main company');
      // Refresh all data
      setIsTabLoading(true);
      await Promise.all([
        fetchCategories(),
        fetchSuppliers(),
        fetchTypes(),
        fetchBrands(),
        fetchAssetIdFormatSettings(),
      ]);
      setIsTabLoading(false);
    } catch (error: any) {
      console.error('Failed to copy settings:', error);
      toast.error(error.message || 'Failed to copy settings from main company');
    } finally {
      setCopyingSettings(false);
    }
  };

  if (showSkeleton) {
    return <SettingsAssetsTabSkeleton />;
  }

  return (
    <TabsContent value="assets" className="mt-0">
      {/* Copy from Main Company Button - Only show for non-main companies that have no existing data */}
      {activeCompany &&
        !activeCompany.is_main &&
        filteredCategories.length === 0 &&
        suppliers.length === 0 &&
        filteredTypes.length === 0 &&
        filteredBrands.length === 0 &&
        intangibleAssetTypes.length === 0 &&
        riskLevels.length === 0 && (
          <div className="mb-6">
            <Button
              onClick={copyMainCompanySettings}
              disabled={copyingSettings}
              variant="outline"
              className="w-full sm:w-auto bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 text-blue-700 hover:text-blue-800 font-medium rounded-xl shadow-sm"
            >
              {copyingSettings ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Copying Settings...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Use same asset settings as the main company
                </>
              )}
            </Button>
          </div>
        )}

      {/* Nested sub-tabs — one section per tab, Intangibles groups two inner tabs (same pattern as FormsTab) */}
      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList
          className={segmentTabsListClassName + ' flex w-full overflow-x-auto scrollbar-hide'}
        >
          <TabsTrigger
            value="categories"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Categories
          </TabsTrigger>
          <TabsTrigger
            value="suppliers"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Suppliers
          </TabsTrigger>
          <TabsTrigger
            value="types"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Types
          </TabsTrigger>
          <TabsTrigger
            value="brands"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Brands
          </TabsTrigger>
          <TabsTrigger
            value="intangibles"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            Intangibles
          </TabsTrigger>
          <TabsTrigger
            value="id-format"
            className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
          >
            ID Format
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-0">
          <AssetCategories
            onAfterSave={fetchCategories}
            categories={filteredCategories}
          />
        </TabsContent>

        <TabsContent value="suppliers" className="mt-0">
          <Suppliers
            categories={filteredCategories}
            categoriesLoading={categoriesLoading}
          />
        </TabsContent>

        <TabsContent value="types" className="mt-0">
          <AssetTypes
            categories={filteredCategories}
            onAfterSave={fetchTypes}
          />
        </TabsContent>

        <TabsContent value="brands" className="mt-0">
          <AssetBrands types={filteredTypes} />
        </TabsContent>

        <TabsContent value="intangibles" className="mt-0">
          {/* Nested inner tabs — Intangible Types / Risk Levels */}
          <Tabs defaultValue="intangible-types" className="space-y-6">
            <TabsList
              className={segmentTabsListClassName + ' flex w-full overflow-x-auto scrollbar-hide'}
            >
              <TabsTrigger
                value="intangible-types"
                className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
              >
                Intangible Types
              </TabsTrigger>
              <TabsTrigger
                value="risk-levels"
                className={segmentTabsTriggerClassName + ' flex-1 whitespace-nowrap'}
              >
                Risk Levels
              </TabsTrigger>
            </TabsList>

            <TabsContent value="intangible-types" className="mt-0">
              <IntangibleAssetTypes onAfterSave={fetchIntangibleAssetTypes} />
            </TabsContent>

            <TabsContent value="risk-levels" className="mt-0">
              <RiskLevels onAfterSave={fetchRiskLevels} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="id-format" className="mt-0">
          <SmartAssetIdFormat
            activeCompany={activeCompany}
            smartIdFormat={smartIdFormatState.smartIdFormat}
            setSmartIdFormat={smartIdFormatState.setSmartIdFormat}
            settingsLoading={smartIdFormatState.settingsLoading}
            hasUnsavedChanges={smartIdFormatState.hasUnsavedChanges}
            save={smartIdFormatState.save}
            cancel={smartIdFormatState.cancel}
          />
        </TabsContent>
      </Tabs>
    </TabsContent>
  );
}
