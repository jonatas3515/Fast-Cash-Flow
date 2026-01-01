import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

interface LoginWelcomeMessageProps {
  visible: boolean;
  onHide: () => void;
}

export default function LoginWelcomeMessage({ visible, onHide }: LoginWelcomeMessageProps) {
  const { theme } = useThemeCtx();
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(-50);

  useEffect(() => {
    if (visible) {
      // Buscar informações do usuário/empresa
      const loadUserInfo = async () => {
        try {
          // Buscar nome da empresa
          let name = '';
          if (Platform.OS === 'web') {
            name = window.localStorage.getItem('auth_name') || '';
          } else {
            // Para mobile, buscar do Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.company_name) {
              name = user.user_metadata.company_name;
            }
          }

          setCompanyName(name);

          // Definir nome do usuário baseado no tipo de login
          if (name.toLowerCase() === 'fastsavorys') {
            setUserName('Jéssica');
          } else if (name.toLowerCase() === 'admin') {
            setUserName('Administrador');
          } else {
            setUserName('Bem-vindo(a)');
          }
        } catch (error) {
          console.error('Erro ao carregar informações do usuário:', error);
          setUserName('Bem-vindo(a)');
        }
      };

      loadUserInfo();

      // Animar entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-esconder após 4 segundos
      const timer = setTimeout(() => {
        hideMessage();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideMessage = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.messageBox, { backgroundColor: theme.card }]}>
        <Text style={[styles.emoji, { fontSize: 40 }]}>🎉</Text>
        <Text style={[styles.welcomeText, { color: theme.text }]}>
          {userName}!
        </Text>
        <Text style={[styles.companyText, { color: theme.textSecondary }]}>
          {companyName ? `${companyName}` : 'Ao Fast Cash Flow'}
        </Text>
        <Text style={[styles.subText, { color: theme.textSecondary }]}>
          Login realizado com sucesso
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  messageBox: {
    paddingVertical: 32,
    paddingHorizontal: 40,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 10,
    // @ts-ignore - boxShadow for web compatibility (replaces deprecated shadow* props)
    boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.25)',
    minWidth: 280,
    maxWidth: Dimensions.get('window').width * 0.8,
  },
  emoji: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  companyText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});
