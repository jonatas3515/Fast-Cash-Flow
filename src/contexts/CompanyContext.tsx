import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentCompanyId } from '../lib/company';
import { setupRealtimeSync, cleanupRealtimeSync } from '../lib/sync';

interface CompanyContextData {
  companyId: string | null;
  isLoading: boolean;
  refreshCompanyId: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextData>({
  companyId: null,
  isLoading: true,
  refreshCompanyId: async () => {},
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const loadCompanyId = useCallback(async () => {
    try {
      const id = await getCurrentCompanyId();
      setCompanyId(id);
      return id;
    } catch (error) {
      console.error('[CompanyContext] Error loading company ID:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshCompanyId = useCallback(async () => {
    setIsLoading(true);
    await loadCompanyId();
  }, [loadCompanyId]);

  // Load company ID on mount
  useEffect(() => {
    loadCompanyId();
  }, [loadCompanyId]);

  // Setup realtime sync when company ID is available
  useEffect(() => {
    if (!companyId) return;

    console.log('[CompanyContext] Setting up realtime sync for company:', companyId);
    
    // Setup realtime sync
    setupRealtimeSync(queryClient, companyId).catch((error) => {
      console.error('[CompanyContext] Error setting up realtime sync:', error);
    });

    // Cleanup on unmount or company change
    return () => {
      console.log('[CompanyContext] Cleaning up realtime sync');
      cleanupRealtimeSync().catch((error) => {
        console.warn('[CompanyContext] Error cleaning up realtime sync:', error);
      });
    };
  }, [companyId, queryClient]);

  return (
    <CompanyContext.Provider
      value={{
        companyId,
        isLoading,
        refreshCompanyId,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

export default CompanyContext;
