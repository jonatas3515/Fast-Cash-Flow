import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const LOGIN_MESSAGE_KEY = '@fast_cash_flow_login_message_shown';
const SESSION_START_KEY = '@fast_cash_flow_session_start';

export function useLoginMessage() {
  const [showMessage, setShowMessage] = useState(false);

  const checkAndShowMessage = useCallback(async () => {
    const now = Date.now();
    let shouldShow = false;
    let lastSessionStart = 0;

    try {
      if (Platform.OS === 'web') {
        const lastShown = window.sessionStorage.getItem(LOGIN_MESSAGE_KEY);
        const sessionStart = window.sessionStorage.getItem(SESSION_START_KEY);
        
        lastSessionStart = sessionStart ? parseInt(sessionStart, 10) : 0;
        
        // Mostrar mensagem se:
        // 1. Nunca foi mostrada nesta sessão, OU
        // 2. É um novo login (sessão começou há menos de 10 segundos)
        if (!lastShown || (lastSessionStart > 0 && (now - lastSessionStart) < 10000)) {
          shouldShow = true;
          window.sessionStorage.setItem(LOGIN_MESSAGE_KEY, 'true');
        }
      } else {
        const lastShown = await SecureStore.getItemAsync(LOGIN_MESSAGE_KEY);
        const sessionStart = await SecureStore.getItemAsync(SESSION_START_KEY);
        
        lastSessionStart = sessionStart ? parseInt(sessionStart, 10) : 0;
        
        if (!lastShown || (lastSessionStart > 0 && (now - lastSessionStart) < 10000)) {
          shouldShow = true;
          await SecureStore.setItemAsync(LOGIN_MESSAGE_KEY, 'true');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar mensagem de login:', error);
      // Em caso de erro, mostrar mensagem para não quebrar a experiência
      shouldShow = true;
    }

    if (shouldShow) {
      // Pequeno delay para garantir que a tela já carregou
      setTimeout(() => {
        setShowMessage(true);
      }, 500);
    }
  }, []);

  const hideMessage = useCallback(() => {
    setShowMessage(false);
  }, []);

  // Registrar início da sessão quando o hook é montado
  useEffect(() => {
    const registerSession = async () => {
      const now = Date.now().toString();
      
      try {
        if (Platform.OS === 'web') {
          // Se não há sessão ativa ou é uma nova sessão
          const currentSession = window.sessionStorage.getItem(SESSION_START_KEY);
          if (!currentSession) {
            window.sessionStorage.setItem(SESSION_START_KEY, now);
            checkAndShowMessage();
          }
        } else {
          const currentSession = await SecureStore.getItemAsync(SESSION_START_KEY);
          if (!currentSession) {
            await SecureStore.setItemAsync(SESSION_START_KEY, now);
            checkAndShowMessage();
          }
        }
      } catch (error) {
        console.error('Erro ao registrar início da sessão:', error);
        checkAndShowMessage();
      }
    };

    registerSession();
  }, [checkAndShowMessage]);

  return {
    showMessage,
    hideMessage,
  };
}
