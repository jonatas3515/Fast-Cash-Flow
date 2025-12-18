import React from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useSettings } from '../settings/SettingsProvider';
import { useThemeCtx } from '../theme/ThemeProvider';
import { getCompanyLogo, saveCompanyLogo } from './companySettings';

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
  
  // On Web, return URL directly to avoid CORS issues with fetch/blob
  if (Platform.OS === 'web' && (raw.startsWith('http://') || raw.startsWith('https://'))) {
    return raw;
  }

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

// Logos oficiais do sistema Fast Cash Flow
export const LOGO_URL_LIGHT = 'https://i.im.ge/2025/11/03/nH0whJ.Logo-Black.png'; // Tema claro
export const LOGO_URL_DARK = 'https://i.im.ge/2025/11/02/nzgjAc.Logo-White.png';  // Tema escuro

// Retorna a logo padrão baseada no tema
export function getDefaultLogoUrl(isDark: boolean): string {
  return isDark ? LOGO_URL_DARK : LOGO_URL_LIGHT;
}

// Hook para buscar e gerenciar logo da empresa com persistência no Supabase
export function useLogoUri() {
  const { settings, setLogoUrl } = useSettings();
  const { mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const defaultLogo = getDefaultLogoUrl(isDark);
  
  const [uri, setUri] = React.useState<string | null>(defaultLogo);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    
    (async () => {
      try {
        // 1. Tentar buscar do Supabase primeiro
        const supabaseLogo = await getCompanyLogo();
        
        // 2. Se não encontrar no Supabase, usar do settings local
        const logoToUse = supabaseLogo || settings.logoUrl || defaultLogo;
        
        // 3. Se encontrou logo no Supabase mas não está no settings local, sincronizar
        if (supabaseLogo && supabaseLogo !== settings.logoUrl) {
          await setLogoUrl(supabaseLogo);
        }
        
        // 4. Se tem logo no settings local mas não no Supabase, salvar no Supabase
        if (settings.logoUrl && settings.logoUrl !== defaultLogo && !supabaseLogo) {
          await saveCompanyLogo(settings.logoUrl);
        }
        
        const data = await resolveLogoDataUri(logoToUse);
        if (!cancelled) {
          setUri(data || defaultLogo);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Erro ao carregar logo:', error);
        if (!cancelled) {
          setUri(defaultLogo);
          setIsLoading(false);
        }
      }
    })();
    
    return () => { cancelled = true; };
  }, [settings.logoUrl, defaultLogo, setLogoUrl]);
  
  return { uri, isLoading };
}

// Função para salvar logo e persistir no Supabase
export async function persistLogo(logoUrl: string): Promise<boolean> {
  try {
    // 1. Salvar no Supabase
    const saved = await saveCompanyLogo(logoUrl);
    
    // 2. Para salvar no settings local, use o hook useLogoUri dentro de um componente
    // e chame a função setLogoUrl disponível no contexto
    
    if (saved) {
      console.log('Logo persistido com sucesso no Supabase');
    } else {
      console.warn('Logo salvo apenas localmente (falha no Supabase)');
    }
    
    return saved;
  } catch (error) {
    console.error('Erro ao persistir logo:', error);
    return false;
  }
}
