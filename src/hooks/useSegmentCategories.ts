import React from 'react';
import { useSettings } from '../settings/SettingsProvider';
import { getExpenseCategories, getIncomeCategories } from '../repositories/company_profile';
import { type BusinessType } from '../config/businessProfiles';
import { ensureOutros, resolveBusinessTypeFromCompanySegment } from '../utils/segment';

export function useResolvedBusinessType(): BusinessType {
  const { settings } = useSettings();

  return React.useMemo(
    () => resolveBusinessTypeFromCompanySegment(settings.companySegment, settings.companyProfile?.business_type ?? null),
    [settings.companySegment, settings.companyProfile?.business_type]
  );
}

export function useSegmentCategories(): {
  businessType: BusinessType;
  incomeOptions: string[];
  expenseOptions: string[];
} {
  const businessType = useResolvedBusinessType();

  const incomeOptions = React.useMemo(() => ensureOutros(getIncomeCategories(businessType)), [businessType]);
  const expenseOptions = React.useMemo(() => ensureOutros(getExpenseCategories(businessType)), [businessType]);

  return { businessType, incomeOptions, expenseOptions };
}
