import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentCompanyId } from '../lib/company';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  sent_at: string;
  read_at?: string;
}

interface TrialNotificationsProps {
  navigation?: any;
}

export default function TrialNotifications({ navigation }: TrialNotificationsProps) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const queryClient = useQueryClient();
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [slideAnim] = useState(new Animated.Value(-100));

  // Usar cores do tema diretamente
  const colors = {
    background: theme.card,
    border: theme.border,
    text: theme.text,
    textSecondary: theme.textSecondary,
  };

  // Query para buscar notificações não lidas
  const { data: notifications } = useQuery({
    queryKey: ['trial-notifications'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return [];

      // Buscar dados da empresa para gerar notificações
      const { data: company } = await supabase
        .from('companies')
        .select('status, trial_end, created_at')
        .eq('id', companyId)
        .single();

      if (!company || company.status === 'active') return [];

      // Calcular dias no trial
      const createdAt = new Date(company.created_at);
      const today = new Date();
      const daysInTrial = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Calcular dias restantes
      const trialEnd = new Date(company.trial_end);
      const daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Contar transações
      const { count: transactionCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Gerar notificações baseadas no dia do trial
      const generatedNotifications: Notification[] = [];

      // Dia 1: Boas-vindas
      if (daysInTrial === 1) {
        generatedNotifications.push({
          id: 'welcome',
          notification_type: 'welcome',
          title: '🎉 Bem-vindo ao Fast Cash Flow!',
          message: 'Comece registrando seu primeiro lançamento e veja a mágica acontecer!',
          action_url: '/dashboard',
          action_label: 'Começar Agora',
          sent_at: new Date().toISOString(),
        });
      }

      // Dia 7: Meio do trial
      if (daysInTrial === 7 && (transactionCount ?? 0) > 0) {
        generatedNotifications.push({
          id: 'mid_trial',
          notification_type: 'mid_trial',
          title: '📊 Você está indo muito bem!',
          message: `Você já tem ${transactionCount} lançamentos! Veja seu relatório completo.`,
          action_url: '/reports',
          action_label: 'Ver Relatório',
          sent_at: new Date().toISOString(),
        });
      }

      // 5 dias antes de expirar
      if (daysLeft === 5) {
        generatedNotifications.push({
          id: 'five_days',
          notification_type: 'five_days_left',
          title: '⏰ Seu trial termina em 5 dias!',
          message: 'Não perca acesso aos seus dados. Ative agora por R$ 9,99/mês!',
          action_url: '/upgrade',
          action_label: 'Ativar Agora',
          sent_at: new Date().toISOString(),
        });
      }

      // 2 dias antes de expirar
      if (daysLeft === 2) {
        generatedNotifications.push({
          id: 'two_days',
          notification_type: 'two_days_left',
          title: '🚨 URGENTE: Apenas 2 dias restantes!',
          message: 'Seu período de teste está acabando. Garanta seu acesso agora!',
          action_url: '/upgrade',
          action_label: 'Garantir Acesso',
          sent_at: new Date().toISOString(),
        });
      }

      // Trial expirado
      if (daysLeft <= 0) {
        generatedNotifications.push({
          id: 'expired',
          notification_type: 'trial_expired',
          title: '❌ Seu trial expirou',
          message: 'Sentimos sua falta! Reative agora e volte de onde parou.',
          action_url: '/upgrade',
          action_label: 'Reativar Conta',
          sent_at: new Date().toISOString(),
        });
      }

      return generatedNotifications;
    },
    refetchInterval: 60000,
  });

  // Mostrar notificação quando disponível
  useEffect(() => {
    if (notifications && notifications.length > 0 && !currentNotification) {
      // Verificar se já foi vista nesta sessão
      const viewedKey = `notification_viewed_${notifications[0].id}`;
      if (Platform.OS === 'web') {
        try {
          if (sessionStorage.getItem(viewedKey)) return;
        } catch {}
      }

      setCurrentNotification(notifications[0]);
      
      // Animar entrada
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [notifications]);

  // Fechar notificação
  const dismissNotification = () => {
    if (currentNotification) {
      // Marcar como vista
      const viewedKey = `notification_viewed_${currentNotification.id}`;
      if (Platform.OS === 'web') {
        try {
          sessionStorage.setItem(viewedKey, 'true');
        } catch {}
      }
    }

    // Animar saída
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentNotification(null);
    });
  };

  // Executar ação
  const handleAction = () => {
    if (currentNotification?.action_url && navigation) {
      // Mapear URLs para telas
      const urlToScreen: Record<string, string> = {
        '/dashboard': 'Dashboard',
        '/reports': 'Reports',
        '/upgrade': 'Settings',
      };
      
      const screen = urlToScreen[currentNotification.action_url];
      if (screen) {
        navigation.navigate(screen);
      }
    }
    dismissNotification();
  };

  if (!currentNotification) {
    return null;
  }

  // Determinar cor baseada no tipo
  const typeColors: Record<string, string> = {
    welcome: '#3B82F6',
    mid_trial: '#10B981',
    five_days_left: '#F59E0B',
    two_days_left: '#EF4444',
    trial_expired: '#DC2626',
  };
  const notificationColor = typeColors[currentNotification.notification_type] || '#3B82F6';

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          backgroundColor: colors.background,
          borderColor: notificationColor,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <View style={[styles.colorBar, { backgroundColor: notificationColor }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {currentNotification.title}
          </Text>
          <TouchableOpacity onPress={dismissNotification} style={styles.closeButton}>
            <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {currentNotification.message}
        </Text>
        
        {currentNotification.action_label && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: notificationColor }]}
            onPress={handleAction}
          >
            <Text style={styles.actionButtonText}>
              {currentNotification.action_label}
            </Text>
          </TouchableOpacity>
        )}
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
    flexDirection: 'row',
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  colorBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 16,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
