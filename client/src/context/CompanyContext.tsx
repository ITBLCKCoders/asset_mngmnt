'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getAuthUserIdFromPayload } from '@/hooks/useCurrentUser';
import { CompanyResponseDto } from '../../../shared/types/dtos';

interface CompanyContextType {
  companies: CompanyResponseDto[];
  activeCompany: CompanyResponseDto | null;
  loading: boolean;
  fetchCompanies: () => Promise<void>;
  fetchActiveCompany: () => Promise<void>;
  setActiveCompany: (companyId: string) => Promise<void>;
  clearActiveCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const SELECTED_COMPANY_KEY = 'selectedCompanyId';

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user: authPayload, isAuthenticated } = useAuth();
  const authUserId = getAuthUserIdFromPayload(authPayload);
  const [companies, setCompanies] = useState<CompanyResponseDto[]>([]);
  const [activeCompany, setActiveCompanyState] = useState<CompanyResponseDto | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await api.get<{ companies: CompanyResponseDto[] }>('/companies');
      setCompanies(response.companies || []);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  }, []);

  const fetchActiveCompany = useCallback(async () => {
    try {
      const response = await api.get<{ data: CompanyResponseDto[] }>('/companies/active');
      const companyData = response.data?.[0] || null;
      setActiveCompanyState(companyData);
    } catch (error) {
      console.error('Failed to fetch active company:', error);
    }
  }, []);

  const setActiveCompany = useCallback(async (companyId: string) => {
    try {
      const response = await api.patch(`/companies/${companyId}/active`);
      
      if (response && response.success !== false) {
        localStorage.setItem(SELECTED_COMPANY_KEY, companyId);
        await Promise.all([fetchActiveCompany(), fetchCompanies()]);
      } else {
        throw new Error('Failed to set active company');
      }
    } catch (error) {
      console.error('Failed to set active company:', error);
      throw error;
    }
  }, [fetchActiveCompany, fetchCompanies]);

  const clearActiveCompany = useCallback(async () => {
    localStorage.setItem(SELECTED_COMPANY_KEY, 'all');
    setActiveCompanyState(null);
    await fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if (!isAuthenticated || !authUserId) {
      setCompanies([]);
      setActiveCompanyState(null);
      setLoading(false);
      return;
    }

    const initialize = async () => {
      setLoading(true);

      try {
        await fetchCompanies();

        const selectedCompanyId = localStorage.getItem(SELECTED_COMPANY_KEY);

        if (selectedCompanyId === 'all') {
          setActiveCompanyState(null);
        } else {
          await fetchActiveCompany();
        }
      } catch (error) {
        console.error('Failed to initialize company context:', error);
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [isAuthenticated, authUserId, fetchCompanies, fetchActiveCompany]);

  const value = useMemo(
    () => ({
      companies,
      activeCompany,
      loading,
      fetchCompanies,
      fetchActiveCompany,
      setActiveCompany,
      clearActiveCompany,
    }),
    [
      companies,
      activeCompany,
      loading,
      fetchCompanies,
      fetchActiveCompany,
      setActiveCompany,
      clearActiveCompany,
    ]
  );

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

export function useCompanyContext() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
}
