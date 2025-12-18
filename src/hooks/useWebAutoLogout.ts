import React from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';

// Constantes de timeout
const WEB_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos para web
const ANDROID_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos para Android

// Chave para armazenar último timestamp de atividade
const LAST_ACTIVITY_KEY = 'fastcashflow_last_activity';

/**
 * Hook para gerenciar logout por inatividade na WEB
 * - Logout apenas após 15 minutos de INATIVIDADE real (sem interação do usuário)
 * - Mostra aviso 2 minutos antes do logout
 * - Permite estender a sessão clicando no aviso
 * - NÃO faz logout ao trocar de aba, minimizar ou atualizar página
 * - Logout manual pelo botão "Sair" funciona normalmente
 */
export function useWebAutoLogout() {
  const lastActivityRef = React.useRef<number>(Date.now());
  const checkIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [showWarning, setShowWarning] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(0);

  // Warning threshold: 2 minutes before logout
  const WARNING_THRESHOLD_MS = 2 * 60 * 1000;

  React.useEffect(() => {
    // Apenas executar na web
    if (Platform.OS !== 'web') return;

    // Função para atualizar timestamp de atividade
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      setShowWarning(false);
      try {
        window.localStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivityRef.current));
      } catch { }
    };

    // IMPORTANTE: Ao carregar a página (mount), SEMPRE atualizar o timestamp primeiro
    // Isso evita logout imediato após um refresh da página
    updateActivity();
    console.log('[🔄 WEB-INACTIVITY] Página carregada, timestamp de atividade atualizado');

    // Função para verificar inatividade
    const checkInactivity = async () => {
      const now = Date.now();
      const inactiveTime = now - lastActivityRef.current;
      const timeUntilLogout = WEB_INACTIVITY_TIMEOUT_MS - inactiveTime;

      // Show warning 2 minutes before logout
      if (timeUntilLogout <= WARNING_THRESHOLD_MS && timeUntilLogout > 0) {
        setShowWarning(true);
        setTimeLeft(Math.ceil(timeUntilLogout / 1000));
      } else if (timeUntilLogout > WARNING_THRESHOLD_MS) {
        setShowWarning(false);
      }

      if (inactiveTime >= WEB_INACTIVITY_TIMEOUT_MS) {
        console.log(`[🚪 WEB-INACTIVITY] Usuário inativo por ${Math.round(inactiveTime / 60000)} minutos, fazendo logout...`);
        await performWebLogout();
      }
    };

    // Função para fazer logout na web
    const performWebLogout = async () => {
      try {
        // Limpar timestamp de atividade
        window.localStorage.removeItem(LAST_ACTIVITY_KEY);

        // Limpar localStorage (dados de autenticação) - NÃO sessionStorage
        window.localStorage.removeItem('auth_ok');
        window.localStorage.removeItem('auth_role');
        window.localStorage.removeItem('auth_company_id');
        window.localStorage.removeItem('auth_name');

        // Fazer logout do Supabase
        await supabase.auth.signOut();
        console.log('[✅ WEB-INACTIVITY] Logout por inatividade concluído');

        // Recarregar página para mostrar tela de login
        window.location.reload();
      } catch (error) {
        console.error('[❌ WEB-INACTIVITY] Erro no logout:', error);
      }
    };

    // Eventos que indicam atividade do usuário
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'keypress',
      'scroll',
      'touchstart',
      'touchmove',
      'click',
      'wheel',
      'resize'
    ];

    // Adicionar listeners de atividade
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Verificar inatividade a cada 10 segundos (mais frequente para aviso)
    checkIntervalRef.current = setInterval(checkInactivity, 10000);

    // Limpar ao desmontar
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // Função para estender a sessão
  const extendSession = React.useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    try {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivityRef.current));
    } catch { }
    console.log('[✅ WEB-INACTIVITY] Sessão estendida pelo usuário');
  }, []);

  return { showWarning, timeLeft, extendSession };
}

/**
 * Hook para gerenciar logout por inatividade no Android/iOS
 * - Logout apenas após 30 minutos de INATIVIDADE real
 * - NÃO faz logout ao minimizar app ou trocar de app
 * - Logout manual pelo botão "Sair" funciona normalmente
 */
export function useAndroidInactivityLogout() {
  const lastActivityRef = React.useRef<number>(Date.now());
  const checkIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const appStateRef = React.useRef<AppStateStatus>(AppState.currentState);

  React.useEffect(() => {
    // Apenas executar no mobile (não-web)
    if (Platform.OS === 'web') return;

    // Função para atualizar timestamp de atividade
    const updateActivity = async () => {
      lastActivityRef.current = Date.now();
      try {
        await SecureStore.setItemAsync(LAST_ACTIVITY_KEY, String(lastActivityRef.current));
      } catch { }
    };

    // Restaurar último timestamp de atividade
    const restoreLastActivity = async () => {
      try {
        const stored = await SecureStore.getItemAsync(LAST_ACTIVITY_KEY);
        if (stored) {
          const storedTime = parseInt(stored, 10);
          if (!isNaN(storedTime)) {
            lastActivityRef.current = storedTime;
          }
        }
      } catch { }
    };

    // Função para verificar inatividade
    const checkInactivity = async () => {
      const now = Date.now();
      const inactiveTime = now - lastActivityRef.current;

      if (inactiveTime >= ANDROID_INACTIVITY_TIMEOUT_MS) {
        console.log(`[🚪 ANDROID-INACTIVITY] Usuário inativo por ${Math.round(inactiveTime / 60000)} minutos, fazendo logout...`);
        await performMobileLogout();
      }
    };

    // Função para fazer logout no mobile
    const performMobileLogout = async () => {
      try {
        // Limpar timestamp de atividade
        await SecureStore.deleteItemAsync(LAST_ACTIVITY_KEY);

        // Limpar dados de autenticação
        await SecureStore.deleteItemAsync('auth_ok');
        await SecureStore.deleteItemAsync('auth_role');
        await SecureStore.deleteItemAsync('auth_company_id');

        // Fazer logout do Supabase
        await supabase.auth.signOut();
        console.log('[✅ ANDROID-INACTIVITY] Logout por inatividade concluído');
      } catch (error) {
        console.error('[❌ ANDROID-INACTIVITY] Erro no logout:', error);
      }
    };

    // Handler para mudanças de estado do app (foreground/background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Quando o app volta para foreground, verificar inatividade
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[📱 ANDROID] App voltou para foreground, verificando inatividade...');
        checkInactivity();
      }

      // Quando o app está ativo, atualizar atividade
      if (nextAppState === 'active') {
        updateActivity();
      }

      appStateRef.current = nextAppState;
    };

    // Inicializar
    restoreLastActivity();
    updateActivity();

    // Listener para mudanças de estado do app
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Verificar inatividade a cada minuto
    checkIntervalRef.current = setInterval(checkInactivity, 60000);

    return () => {
      subscription.remove();
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);
}
