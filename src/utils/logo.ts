import React from 'react';
import * as FileSystem from 'expo-file-system';
import { useSettings } from '../settings/SettingsProvider';

async function toDataUriFromFile(uri: string) {
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
    return `data:image/png;base64,${b64}`;
  } catch {
    return uri;
  }
}

export async function resolveLogoDataUri(raw?: string | null) {
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;
  if (raw.startsWith('file://')) return await toDataUriFromFile(raw);
  try {
    // Web-safe: fetch and embed base64 to avoid CORS/print issues
    const res = await fetch(raw);
    const blob = await res.blob();
    const reader = new FileReader();
    const p = new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
    });
    reader.readAsDataURL(blob);
    return await p;
  } catch {
    return raw;
  }
}

// Logo padrão do sistema Fast Cash Flow
const DEFAULT_LOGO_URL = 'https://i.im.ge/2025/11/03/nH0whJ.Logo-Black.png';

export function useLogoUri() {
  const { settings } = useSettings();
  const [uri, setUri] = React.useState<string | null>(DEFAULT_LOGO_URL);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      // Se não houver logo personalizada, usa a logo padrão do sistema
      const logoToUse = settings.logoUrl || DEFAULT_LOGO_URL;
      const data = await resolveLogoDataUri(logoToUse);
      if (!cancelled) setUri(data || DEFAULT_LOGO_URL);
    })();
    return () => { cancelled = true; };
  }, [settings.logoUrl]);
  return uri;
}
