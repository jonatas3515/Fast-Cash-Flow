import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Get the current company ID from storage
 * Uses localStorage on web (persiste entre refreshes) and SecureStore on native
 */
export async function getCurrentCompanyId(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem('auth_company_id');
    }
    return await SecureStore.getItemAsync('auth_company_id');
  } catch (error) {
    console.warn('[Company] Error getting company ID:', error);
    return null;
  }
}

/**
 * Get the admin app company ID (for admin panel viewing specific company)
 * Falls back to getCurrentCompanyId if not set
 */
export async function getAdminAppCompanyId(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const adminCompanyId = window.localStorage.getItem('admin_viewing_company_id');
      if (adminCompanyId) return adminCompanyId;
      return window.localStorage.getItem('auth_company_id');
    }
    const adminCompanyId = await SecureStore.getItemAsync('admin_viewing_company_id');
    if (adminCompanyId) return adminCompanyId;
    return await SecureStore.getItemAsync('auth_company_id');
  } catch (error) {
    console.warn('[Company] Error getting admin company ID:', error);
    return null;
  }
}

/**
 * Set the current company ID in storage
 */
export async function setCurrentCompanyId(companyId: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      window.localStorage.setItem('auth_company_id', companyId);
      return;
    }
    await SecureStore.setItemAsync('auth_company_id', companyId);
  } catch (error) {
    console.warn('[Company] Error setting company ID:', error);
  }
}

/**
 * Set the admin viewing company ID (for admin panel)
 */
export async function setAdminViewingCompanyId(companyId: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (companyId) {
        window.localStorage.setItem('admin_viewing_company_id', companyId);
      } else {
        window.localStorage.removeItem('admin_viewing_company_id');
      }
      return;
    }
    if (companyId) {
      await SecureStore.setItemAsync('admin_viewing_company_id', companyId);
    } else {
      await SecureStore.deleteItemAsync('admin_viewing_company_id');
    }
  } catch (error) {
    console.warn('[Company] Error setting admin company ID:', error);
  }
}

/**
 * Clear all company-related data from storage
 */
export async function clearCompanyData(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem('auth_company_id');
      window.localStorage.removeItem('admin_viewing_company_id');
      return;
    }
    await SecureStore.deleteItemAsync('auth_company_id');
    await SecureStore.deleteItemAsync('admin_viewing_company_id');
  } catch (error) {
    console.warn('[Company] Error clearing company data:', error);
  }
}
