import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Plus,
  Edit,
  CheckCircle2,
  Trash2,
  Loader2,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Company } from './utils/companyTypes';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface AllCompaniesListProps {
  companies: Company[];
  activatingId: string | null;
  settingMainId: string | null;
  onCreateModal: () => void;
  onEditModal: (company: Company) => void;
  onSetActive: (company: Company) => void;
  onSetMain: (company: Company) => void;
  onDelete: (company: Company) => void;
}

export function AllCompaniesList({
  companies,
  activatingId,
  settingMainId,
  onCreateModal,
  onEditModal,
  onSetActive,
  onSetMain,
  onDelete,
}: AllCompaniesListProps) {
  const { hasPermission } = useUserPermissions();
  return (
    <Card>
      <CardHeader className=" bg-red-600 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl text-white">
            All Companies & Subsidiaries
          </CardTitle>
          <Button
            size="lg"
            onClick={onCreateModal}
            disabled={!hasPermission('Companies', 'create')}
            className="text-white shadow-xl border border-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="mr-2 h-5 w-5 text-white" /> Add New Company
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {companies.length === 0 ? (
          <div className="py-20 text-center">
            <Building2 className="mx-auto mb-6 h-20 w-20 text-muted-foreground" />
            <p className="mb-8 text-xl text-muted-foreground">
              No companies yet
            </p>
            <Button
              size="lg"
              onClick={onCreateModal}
              disabled={!hasPermission('Companies', 'create')}
              className="bg-red-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="mr-3 h-6 w-6" /> Add Your First Company
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {companies.map((company, index) => {
              const isActive = !!company.is_active;
              const isMain = !!company.is_main;
              const isActivating = activatingId === company.id;
              const isSettingMain = settingMainId === company.id;
              const hasMainCompany = companies.some(c => c.is_main);

              return (
                <div
                  key={`${company.id}-${index}`}
                  className={cn(
                    'rounded-2xl border-2 p-8 transition-all duration-300 relative',
                    isActive
                      ? 'border-red-500 bg-red-50/60 shadow-xl ring-4 ring-red-500/20'
                      : 'border-border hover:border-primary/40 hover:shadow-lg'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div
                        className={cn(
                          'h-20 w-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center',
                          isActive && 'ring-4 ring-red-500/30'
                        )}
                      >
                        {company.logo_url ? (
                          <img
                            src={company.logo_url}
                            alt={`${company.name} logo`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div
                            className={cn(
                              'text-2xl font-bold',
                              isActive ? 'bg-red-100 text-red-700' : 'bg-muted'
                            )}
                          >
                            {company.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-4">
                          <h3 className="text-2xl font-bold">{company.name}</h3>
                          <code className="text-lg font-bold bg-muted px-4 py-2 rounded-lg">
                            {company.code}
                          </code>
                          {company.prefix && (
                            <span className="text-sm text-muted-foreground">
                              ({company.prefix})
                            </span>
                          )}
                          {isActive && (
                            <Badge
                              variant="default"
                              className="text-lg px-5 py-2 bg-red-600 text-white"
                            >
                              <CheckCircle2 className="mr-2 h-5 w-5" />
                              ACTIVE COMPANY
                            </Badge>
                          )}
                          {isMain && (
                            <Badge
                              variant="default"
                              className="text-lg px-5 py-2 bg-red-600 text-white"
                            >
                              <Building2 className="mr-2 h-5 w-5" />
                              MAIN COMPANY
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 space-y-2">
                          <p className="text-muted-foreground text-sm">{company.email}</p>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                            {company.phone && <span>Phone: {company.phone}</span>}
                            {company.taxId && <span>Tax ID: {company.taxId}</span>}
                          </div>
                          {company.building_street && (
                            <p className="text-sm text-muted-foreground">
                              {company.building_street}
                              {company.unit_no && `, Unit ${company.unit_no}`}
                            </p>
                          )}
                          {company.barangay_name && (
                            <p className="text-sm text-muted-foreground">
                              Barangay: {company.barangay_name}
                            </p>
                          )}
                          {(company.city_name || company.region_name || company.zipcode) && (
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {company.city_name && company.city_name}
                              {company.city_name && company.region_name && ', '}
                              {company.region_name && company.region_name}
                              {company.zipcode && ` • ${company.zipcode}`}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                            {company.website && (
                              <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
                                Website
                              </a>
                            )}
                            {company.industry && <span>Industry: {company.industry}</span>}
                            {company.size && <span>Size: {company.size}</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isMain && !hasMainCompany && (
                        <Button
                          size="lg"
                          onClick={() => onSetMain(company)}
                          disabled={isSettingMain}
                          className="font-medium bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isSettingMain ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Setting...
                            </>
                          ) : (
                            <>
                              <Building2 className="mr-2 h-5 w-5" />
                              Set as Main
                            </>
                          )}
                        </Button>
                      )}
                      {!isActive && companies.length > 1 && (
                        <Button
                          size="lg"
                          onClick={() => onSetActive(company)}
                          disabled={isActivating}
                          className="font-medium"
                        >
                          {isActivating ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Switching...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-5 w-5" />
                              Set as Active
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => onEditModal(company)}
                        disabled={
                          isActive || !hasPermission('Companies', 'edit')
                        }
                      >
                        <Edit className="h-5 w-5" />
                      </Button>
                      {companies.length > 1 && !isActive && !isMain && (
                        <Button
                          size="lg"
                          variant="ghost"
                          onClick={() => onDelete(company)}
                          disabled={!hasPermission('Companies', 'delete')}
                          className="text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
