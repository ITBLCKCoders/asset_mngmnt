'use client';

import { useEffect, useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useCompanyContext } from '@/context/CompanyContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

const SELECTED_COMPANY_KEY = 'selectedCompanyId';

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn('animate-shimmer rounded bg-gray-200/80', className)} />
);

export function CompanyFilter() {
  const { companies, activeCompany, setActiveCompany, loading } =
    useCompanyContext();
  const { user } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const isLocalLoading = loading;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.company-filter-dropdown') && !target.closest('.company-filter-button')) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  // Check if user has Super Admin or Admin role
  const normalizedRoleName = user?.role?.name?.trim().toLowerCase() || '';
  const isSuperAdmin = normalizedRoleName === 'super admin';
  const isAdmin = normalizedRoleName === 'admin';
  const canShowFilter = isSuperAdmin || isAdmin;

  // Don't render if user doesn't have permission
  if (!canShowFilter) {
    return null;
  }

  if (isLocalLoading || loading) {
    return (
      <div className="w-48 h-14 rounded-full border border-white/20 bg-white/10 backdrop-blur shadow-lg flex items-center justify-center gap-3 px-4">
        <div className="w-5 h-5 rounded-full bg-gray-300/50" />
        <div className="h-4 w-24 rounded bg-gray-300/50" />
      </div>
    );
  }

  const handleCompanySelect = async (companyId: string) => {
    setIsOpen(false);
    
    if (companyId === 'all') {
      // Handle "All Companies" selection
      localStorage.setItem(SELECTED_COMPANY_KEY, 'all');
      window.location.reload();
      return;
    }
    
    if (companyId && companyId !== activeCompany?.id) {
      try {
        await setActiveCompany(companyId);
      } catch (error) {
        console.error('Failed to change company:', error);
        alert('Failed to change company. Please check the server logs.');
      }
    }
  };

  const displayValue = activeCompany ? activeCompany.name : (localStorage.getItem(SELECTED_COMPANY_KEY) === 'all' ? 'All Companies' : 'Select company');

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="company-filter-button h-14 w-48 md:w-56 px-4 rounded-full border border-white/20 bg-white/10 backdrop-blur hover:bg-white/20 transition-all duration-300 shadow-lg focus:ring-4 focus:ring-[#EE1D25]/20 focus:border-[#EE1D25] cursor-pointer text-sm font-medium text-gray-800 flex items-center gap-2"
      >
        <Building2 className="h-5 w-5 text-gray-700 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{displayValue}</span>
        <ChevronDown className={cn('h-4 w-4 text-gray-600 transition-transform', isOpen && 'rotate-180')} />
      </button>
      
      {isOpen && (
        <div className="company-filter-dropdown absolute top-full left-0 mt-2 w-56 md:w-64 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
          <div className="p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('All Companies button clicked');
                handleCompanySelect('all');
              }}
              className={cn(
                'w-full px-3 py-2 text-left rounded-md flex items-center gap-2 hover:bg-gray-100 transition-colors cursor-pointer',
                localStorage.getItem(SELECTED_COMPANY_KEY) === 'all' && 'bg-gray-100'
              )}
            >
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="flex-1 text-sm font-medium">All Companies</span>
              {localStorage.getItem(SELECTED_COMPANY_KEY) === 'all' && <Check className="h-4 w-4 text-[#EE1D25]" />}
            </button>
            {companies.map(company => (
              <button
                key={company.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Company button clicked:', company.id, company.name);
                  handleCompanySelect(company.id);
                }}
                className={cn(
                  'w-full px-3 py-2 text-left rounded-md flex items-center gap-2 hover:bg-gray-100 transition-colors cursor-pointer',
                  activeCompany?.id === company.id && localStorage.getItem(SELECTED_COMPANY_KEY) !== 'all' && 'bg-gray-100'
                )}
              >
                <Building2 className="h-4 w-4 text-gray-500" />
                <span className="flex-1 text-sm">{company.name}</span>
                {activeCompany?.id === company.id && localStorage.getItem(SELECTED_COMPANY_KEY) !== 'all' && <Check className="h-4 w-4 text-[#EE1D25]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
