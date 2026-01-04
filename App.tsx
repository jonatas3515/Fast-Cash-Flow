import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Tabs from './src/navigation/Tabs';
import AdminTabs from './src/navigation/AdminTabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { migrate } from './src/lib/db';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useThemeCtx } from './src/theme/ThemeProvider';
import { supabase } from './src/lib/supabase';
import { SettingsProvider } from './src/settings/SettingsProvider';
import { ToastProvider } from './src/ui/ToastProvider';
import { I18nProvider } from './src/i18n/I18nProvider';
import { ensureAnonAuth, syncAll } from './src/lib/sync';
// getCurrentCompanyId removido - CompanyContext gerencia o Realtime
import SyncIndicator from './src/ui/SyncIndicator';
import { CompanyProvider } from './src/contexts/CompanyContext';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import SyncMonitor from './src/lib/syncMonitor';
import LoginGate from './src/auth/LoginGate';
import RegisterScreen from './src/auth/RegisterScreen';
import LandingPage from './src/auth/LandingPage';
import { ScrollbarStyles } from './src/components/ScrollbarStyles';
import NotificationService from './src/services/notificationService';
import { useWebAutoLogout, useAndroidInactivityLogout } from './src/hooks/useWebAutoLogout';
import LogoutWarningBanner from './src/components/LogoutWarningBanner';
import OrderAlertModal from './src/components/OrderAlertModal';
import * as SecureStore from 'expo-secure-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetch automático quando a janela ganha foco
      refetchOnWindowFocus: true,
      // Refetch quando reconecta à internet
      refetchOnReconnect: true,
      // Manter dados frescos - stale após 0ms (sempre refetch)
      staleTime: 0,
      // Cache por 5 minutos
      gcTime: 5 * 60 * 1000,
      // Retry automático em caso de erro
      retry: 2,
      retryDelay: 1000,
    },
  },
});

function AppInner() {
  const [authBootstrapped, setAuthBootstrapped] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [authed, setAuthed] = React.useState(false);
  const [role, setRole] = React.useState<'admin' | 'user'>('user');
  const { navTheme } = useThemeCtx();

  // Usar hooks de logout automático
  const { showWarning, timeLeft, extendSession } = useWebAutoLogout();
  useAndroidInactivityLogout();

  // Bootstrap session from local storage / secure store (so returning users don't need to open Login first)
  React.useEffect(() => {
    (async () => {
      try {
        let ok: string | null = null;
        let storedRole: 'admin' | 'user' = 'user';

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          ok = window.localStorage.getItem('auth_ok');
          storedRole = (window.localStorage.getItem('auth_role') as 'admin' | 'user') || 'user';
        } else {
          ok = await SecureStore.getItemAsync('auth_ok');
          storedRole = (await SecureStore.getItemAsync('auth_role') as 'admin' | 'user') || 'user';
        }

        if (ok === '1') {
          setRole(storedRole);
          setAuthed(true);
        }
      } catch {
        // ignore
      } finally {
        setAuthBootstrapped(true);
      }
    })();
  }, []);

  // Helper para aguardar company_id estar disponível antes de sincronizar
  const waitForCompanyIdAndSync = React.useCallback(async (maxWaitMs = 5000): Promise<boolean> => {
    const checkInterval = 200; // Verificar a cada 200ms
    let elapsed = 0;

    while (elapsed < maxWaitMs) {
      const companyId = window.localStorage?.getItem?.('auth_company_id');
      if (companyId) {
        console.log('[✅ APP] Company ID encontrado:', companyId);
        await syncAll();
        return true;
      }
      await new Promise(r => setTimeout(r, checkInterval));
      elapsed += checkInterval;
    }

    console.warn('[⚠️ APP] Company ID não encontrado após', maxWaitMs, 'ms - sync ignorado');
    return false;
  }, []);

  React.useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        await migrate();
        await ensureAnonAuth();
        await NotificationService.initialize(); // Inicializar notificações
        await SyncMonitor.loadLogs(); // Carregar logs de sincronização
        // Aguardar company_id antes de sincronizar
        await waitForCompanyIdAndSync(5000);
      } catch (e) {
        console.warn('DB migrate error', e);
      } finally {
        setReady(true);
      }
    })();
  }, [authed, waitForCompanyIdAndSync]);

  React.useEffect(() => {
    // periodic sync every 3s para garantir sincronização MUITO rápida
    if (!authed) return;

    // Sync imediato ao autenticar - aguardar company_id
    console.log('[🚀 APP] Sync inicial ao autenticar...');
    waitForCompanyIdAndSync(3000).catch(() => { });

    const id = setInterval(() => {
      // Para sync periódico, verificar company_id imediatamente
      const companyId = window.localStorage?.getItem?.('auth_company_id');
      if (companyId) {
        console.log('[⏰ APP] Sync periódico a cada 3s...');
        syncAll().catch((e) => console.warn('[⚠️ APP] Sync periódico falhou:', e));
      } else {
        console.log('[⏳ APP] Sync periódico ignorado - aguardando company_id...');
      }
    }, 3000); // 3 segundos para sincronização mais agressiva
    return () => { clearInterval(id); };
  }, [authed, waitForCompanyIdAndSync]);

  // Realtime Sync é gerenciado pelo CompanyContext
  // Não duplicar aqui para evitar conflitos de canais

  // Listen for Supabase auth sign-out to return to login
  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      console.log('🔐 Auth event:', event);
      if (event === 'SIGNED_OUT') {
        console.log('🚪 Logout detectado, limpando estado...');
        // Limpar sincronização
        try {
          const { cleanupRealtimeSync, clearCompanyIdCache } = await import('./src/lib/sync');
          await cleanupRealtimeSync();
          clearCompanyIdCache();
        } catch (e) {
          console.warn('Erro ao limpar sync:', e);
        }
        // Limpar QueryClient
        queryClient.clear();
        // Resetar estado
        setAuthed(false);
        setReady(false);
      }
    });
    return () => { sub.subscription?.unsubscribe(); };
  }, []);

  // Keep session across refresh; only sync when tab becomes visible
  React.useEffect(() => {
    if (!authed || typeof document === 'undefined') return;
    const vis = () => {
      if (document.visibilityState === 'visible') {
        import('./src/lib/sync').then(m => m.quickSync());
      }
    };
    document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); };
  }, [authed]);

  const AuthStack = createNativeStackNavigator();
  if (!authed) {
    if (!authBootstrapped) return null;

    function LandingScreen({ navigation }: any) {
      const [trialDays, setTrialDays] = React.useState(30);

      React.useEffect(() => {
        if (typeof window !== 'undefined') {
          try {
            const saved = window.localStorage.getItem('fastcashflow_admin_settings');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.trialDays) setTrialDays(parseInt(parsed.trialDays, 10) || 30);
            }
          } catch { }
        }
      }, []);

      return (
        <LandingPage
          trialDays={trialDays}
          onRegister={() => navigation.navigate('Cadastro')}
          onLogin={() => navigation.navigate('Login')}
        />
      );
    }

    return (
      <NavigationContainer theme={navTheme as any}>
        <AuthStack.Navigator id={undefined}>
          <AuthStack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
          <AuthStack.Screen name="Login" options={{ headerShown: false }}>
            {({ navigation }) => <LoginGate onOk={(r) => { setRole(r); setAuthed(true); }} onBack={() => navigation.navigate('Landing')} />}
          </AuthStack.Screen>
          <AuthStack.Screen name="Cadastro" component={RegisterScreen} options={{ title: 'Cadastro' }} />
        </AuthStack.Navigator>
      </NavigationContainer>
    );
  }

  if (!ready) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CompanyProvider>
        <OnboardingProvider>
          <NavigationContainer theme={navTheme as any}>
            <StatusBar style="auto" />
            {role === 'admin' ? <AdminTabs /> : <Tabs />}
            {/* Order Alert Modal - mostra alertas de encomendas próximas */}
            {role !== 'admin' && <OrderAlertModal />}
          </NavigationContainer>
          {/* Logout warning banner - shows 2min before auto logout */}
          <LogoutWarningBanner
            showWarning={showWarning}
            timeLeft={timeLeft}
            extendSession={extendSession}
          />
        </OnboardingProvider>
      </CompanyProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <SettingsProvider>
        <ThemeProvider>
          <ToastProvider>
            <ScrollbarStyles>
              <AppInner />
            </ScrollbarStyles>
          </ToastProvider>
        </ThemeProvider>
      </SettingsProvider>
    </I18nProvider>
  );
}
