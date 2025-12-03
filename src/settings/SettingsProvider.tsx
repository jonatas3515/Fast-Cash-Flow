import React from 'react';
import * as SecureStore from 'expo-secure-store';

export type Settings = {
  logoUrl: string | null;
};

const DEFAULTS: Settings = {
  logoUrl: null,
};

const SettingsContext = React.createContext<{
  settings: Settings;
  setLogoUrl: (url: string | null) => Promise<void>;
} | null>(null);

const KEY_LOGO = 'settings.logoUrl';

async function getCompanyId(): Promise<string | null> {
  try {
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem('auth_company_id');
    }
    return await SecureStore.getItemAsync('auth_company_id');
  } catch {
    return null;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<Settings>(DEFAULTS);

  React.useEffect(() => {
    (async () => {
      try {
        const cid = await getCompanyId();
        const k = cid ? `${KEY_LOGO}.${cid}` : KEY_LOGO;
        const v = await SecureStore.getItemAsync(k);
        if (v != null) { setSettings(s => ({ ...s, logoUrl: v })); return; }
      } catch {}
      try {
        const cid = await getCompanyId();
        const k = cid ? `${KEY_LOGO}.${cid}` : KEY_LOGO;
        const v2 = typeof window !== 'undefined' ? window.localStorage.getItem(k) : null;
        if (v2 != null) setSettings(s => ({ ...s, logoUrl: v2 }));
      } catch {}
    })();
  }, []);

  const setLogoUrl = React.useCallback(async (url: string | null) => {
    const cid = await getCompanyId();
    const k = cid ? `${KEY_LOGO}.${cid}` : KEY_LOGO;
    try {
      if (url) await SecureStore.setItemAsync(k, url);
      else await SecureStore.deleteItemAsync(k);
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        if (url) window.localStorage.setItem(k, url);
        else window.localStorage.removeItem(k);
      }
    } catch {}
    setSettings(s => ({ ...s, logoUrl: url }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setLogoUrl }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error('SettingsContext not found');
  return ctx;
}
