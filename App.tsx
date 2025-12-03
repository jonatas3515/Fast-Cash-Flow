import React from 'react';
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
import { ensureAnonAuth, syncAll, subscribeRealtime } from './src/lib/sync';
import SyncIndicator from './src/ui/SyncIndicator';
import LoginGate from './src/auth/LoginGate';
import RegisterScreen from './src/auth/RegisterScreen';
import { ScrollbarStyles } from './src/components/ScrollbarStyles';

const queryClient = new QueryClient();

function AppInner() {
  const [ready, setReady] = React.useState(false);
  const [authed, setAuthed] = React.useState(false);
  const [role, setRole] = React.useState<'admin'|'user'>('user');
  const { navTheme } = useThemeCtx();

  React.useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        await migrate();
        await ensureAnonAuth();
        await syncAll();
      } catch (e) {
        console.warn('DB migrate error', e);
      } finally {
        setReady(true);
      }
    })();
  }, [authed]);

  React.useEffect(() => {
    // periodic sync every 30s
    if (!authed) return;
    const id = setInterval(() => {
      syncAll().catch(() => {});
    }, 5000);
    const unsubscribe = subscribeRealtime();
    return () => { clearInterval(id); unsubscribe(); };
  }, [authed]);

  // Listen for Supabase auth sign-out to return to login
  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
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
    return (
      <NavigationContainer theme={navTheme as any}>
        <AuthStack.Navigator>
          <AuthStack.Screen name="Login" options={{ headerShown: false }}>
            {() => <LoginGate onOk={(r) => { setRole(r); setAuthed(true); }} />}
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
      <NavigationContainer theme={navTheme as any}>
        <StatusBar style="auto" />
        {role === 'admin' ? <AdminTabs /> : <Tabs />}
        <SyncIndicator />
      </NavigationContainer>
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
