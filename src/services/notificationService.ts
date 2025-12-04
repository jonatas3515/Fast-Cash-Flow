import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurar comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  trigger: Date;
  data?: any;
}

class NotificationService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366f1',
        });

        // Canal para alertas urgentes (dívidas vencendo)
        await Notifications.setNotificationChannelAsync('urgent', {
          name: 'Alertas Urgentes',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 500, 500],
          lightColor: '#ef4444',
          sound: 'default',
        });

        // Canal para lembretes
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Lembretes',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10b981',
        });
      }

      this.initialized = true;
    } catch (error) {
      console.error('Erro ao inicializar notificações:', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Notificações não funcionam em simulador/emulador');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permissão de notificação negada');
      return false;
    }

    return true;
  }

  async scheduleNotification(
    title: string,
    body: string,
    trigger: Date,
    data?: any,
    channelId: string = 'default'
  ): Promise<string | null> {
    try {
      await this.initialize();
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          badge: 1,
        },
        trigger: {
          channelId,
          date: trigger,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
      return null;
    }
  }

  async scheduleDebtReminder(debtName: string, amount: number, dueDate: Date): Promise<void> {
    // Notificar 1 dia antes
    const oneDayBefore = new Date(dueDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(9, 0, 0, 0); // 9h da manhã

    if (oneDayBefore > new Date()) {
      await this.scheduleNotification(
        '⚠️ Dívida Vencendo Amanhã',
        `${debtName} - R$ ${amount.toFixed(2)} vence amanhã!`,
        oneDayBefore,
        { type: 'debt_reminder', debtName },
        'urgent'
      );
    }

    // Notificar no dia do vencimento
    const dueDateTime = new Date(dueDate);
    dueDateTime.setHours(8, 0, 0, 0); // 8h da manhã

    if (dueDateTime > new Date()) {
      await this.scheduleNotification(
        '🔴 DÍVIDA VENCE HOJE',
        `${debtName} - R$ ${amount.toFixed(2)} vence hoje!`,
        dueDateTime,
        { type: 'debt_due', debtName },
        'urgent'
      );
    }
  }

  async scheduleGoalReminder(goalName: string, currentProgress: number, target: number): Promise<void> {
    // Se está próximo de atingir (90%+)
    if (currentProgress / target >= 0.9) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      await this.scheduleNotification(
        '🏆 Quase Lá! Meta Próxima',
        `Faltam apenas R$ ${(target - currentProgress).toFixed(2)} para atingir "${goalName}"!`,
        tomorrow,
        { type: 'goal_progress', goalName },
        'reminders'
      );
    }
  }

  async scheduleTrialEndingReminder(companyName: string, daysRemaining: number): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    await this.scheduleNotification(
      '⏰ Seu Trial Está Acabando',
      `Restam ${daysRemaining} dias de trial para ${companyName}. Ative sua assinatura!`,
      tomorrow,
      { type: 'trial_ending', companyName },
      'urgent'
    );
  }

  async scheduleBackupReadyNotification(): Promise<void> {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 2); // 2 minutos depois

    await this.scheduleNotification(
      '💾 Backup Automático Concluído',
      'Seu backup foi criado com sucesso. Toque para acessar.',
      now,
      { type: 'backup_ready' },
      'reminders'
    );
  }

  async scheduleDailyRecap(time: { hour: number; minute: number }): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(time.hour, time.minute, 0, 0);

    await this.scheduleNotification(
      '📊 Resumo do Dia',
      'Confira o resumo financeiro do dia e não esqueça de lançar despesas pendentes.',
      tomorrow,
      { type: 'daily_recap' },
      'reminders'
    );
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Erro ao cancelar notificação:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Erro ao cancelar todas as notificações:', error);
    }
  }

  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Erro ao buscar notificações agendadas:', error);
      return [];
    }
  }

  async sendImmediateNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await this.initialize();
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Enviar imediatamente
      });
    } catch (error) {
      console.error('Erro ao enviar notificação imediata:', error);
    }
  }

  // Salvar preferências de notificação
  async saveNotificationPreferences(preferences: {
    debts: boolean;
    goals: boolean;
    dailyRecap: boolean;
    recapTime?: { hour: number; minute: number };
  }): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    }
  }

  async getNotificationPreferences(): Promise<any> {
    try {
      const stored = await AsyncStorage.getItem('notification_preferences');
      if (stored) {
        return JSON.parse(stored);
      }
      return {
        debts: true,
        goals: true,
        dailyRecap: false,
        recapTime: { hour: 20, minute: 0 },
      };
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
      return null;
    }
  }
}

export default new NotificationService();
