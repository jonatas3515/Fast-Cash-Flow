import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import NotificationService from '../services/notificationService';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function NotificationSettingsScreen() {
  const { theme, mode } = useThemeCtx();
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Preferências
  const [debtReminders, setDebtReminders] = useState(true);
  const [goalReminders, setGoalReminders] = useState(true);
  const [dailyRecap, setDailyRecap] = useState(false);
  const [recapTime, setRecapTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const preferences = await NotificationService.getNotificationPreferences();
      if (preferences) {
        setDebtReminders(preferences.debts);
        setGoalReminders(preferences.goals);
        setDailyRecap(preferences.dailyRecap);
        
        if (preferences.recapTime) {
          const time = new Date();
          time.setHours(preferences.recapTime.hour, preferences.recapTime.minute);
          setRecapTime(time);
        }
      }

      // Verificar se notificações estão habilitadas
      const hasPermission = await NotificationService.requestPermissions();
      setNotificationsEnabled(hasPermission);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      await NotificationService.saveNotificationPreferences({
        debts: debtReminders,
        goals: goalReminders,
        dailyRecap,
        recapTime: {
          hour: recapTime.getHours(),
          minute: recapTime.getMinutes(),
        },
      });

      // Reagendar notificações diárias se ativado
      if (dailyRecap) {
        await NotificationService.scheduleDailyRecap({
          hour: recapTime.getHours(),
          minute: recapTime.getMinutes(),
        });
      }

      Alert.alert('Sucesso', 'Preferências de notificações salvas!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar as preferências.');
    }
  };

  const testNotification = async () => {
    await NotificationService.sendImmediateNotification(
      '🔔 Notificação de Teste',
      'As notificações estão funcionando perfeitamente!',
      { type: 'test' }
    );
  };

  const requestPermission = async () => {
    const granted = await NotificationService.requestPermissions();
    setNotificationsEnabled(granted);
    
    if (!granted) {
      Alert.alert(
        'Permissão Negada',
        'Para receber notificações, ative nas configurações do dispositivo.'
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { alignItems: 'center' }]}>
        <Text style={[styles.title, { color: mode === 'dark' ? theme.primary : theme.negative, textAlign: 'center' }]}>Configurações de Notificação</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'center' }]}>
          Gerencie alertas e lembretes financeiros
        </Text>
      </View>

      {/* Status das Notificações */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              Notificações Ativadas
            </Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              {notificationsEnabled 
                ? 'As notificações estão habilitadas' 
                : 'Ative as notificações para receber alertas'
              }
            </Text>
          </View>
          {notificationsEnabled ? (
            <Ionicons name="checkmark-circle" size={24} color={theme.positive} />
          ) : (
            <TouchableOpacity 
              style={[styles.enableButton, { backgroundColor: theme.primary }]}
              onPress={requestPermission}
            >
              <Text style={[styles.enableButtonText, { color: '#fff' }]}>
                Ativar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tipos de Notificação */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Tipos de Alerta</Text>
        
        {/* Lembretes de Dívidas */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                Lembretes de Dívidas
              </Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                Alertas 1 dia antes e no vencimento
              </Text>
            </View>
            <Switch
              value={debtReminders}
              onValueChange={setDebtReminders}
              disabled={!notificationsEnabled}
              trackColor={{ false: theme.border, true: theme.primary + '40' }}
              thumbColor={debtReminders ? theme.primary : theme.textSecondary}
            />
          </View>
        </View>

        {/* Lembretes de Metas */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                Lembretes de Metas
              </Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                Alertas ao atingir 90% das metas
              </Text>
            </View>
            <Switch
              value={goalReminders}
              onValueChange={setGoalReminders}
              disabled={!notificationsEnabled}
              trackColor={{ false: theme.border, true: theme.primary + '40' }}
              thumbColor={goalReminders ? theme.primary : theme.textSecondary}
            />
          </View>
        </View>

        {/* Resumo Diário */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                Resumo Diário
              </Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                Resumo financeiro todo dia às {recapTime.getHours().toString().padStart(2, '0')}:{recapTime.getMinutes().toString().padStart(2, '0')}
              </Text>
            </View>
            <Switch
              value={dailyRecap}
              onValueChange={setDailyRecap}
              disabled={!notificationsEnabled}
              trackColor={{ false: theme.border, true: theme.primary + '40' }}
              thumbColor={dailyRecap ? theme.primary : theme.textSecondary}
            />
          </View>
          
          {dailyRecap && (
            <View style={styles.timePickerContainer}>
              <TouchableOpacity
                style={[styles.timeButton, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={theme.text} />
                <Text style={[styles.timeText, { color: theme.text }]}>
                  {recapTime.getHours().toString().padStart(2, '0')}:{recapTime.getMinutes().toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Ações */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Ações</Text>
        
        {/* Testar Notificação */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.card }]}
          onPress={testNotification}
          disabled={!notificationsEnabled}
        >
          <Ionicons name="notifications-outline" size={20} color={theme.primary} />
          <Text style={[styles.actionText, { color: theme.text }]}>
            Enviar Notificação de Teste
          </Text>
        </TouchableOpacity>

        {/* Cancelar Todas */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.card }]}
          onPress={() => {
            Alert.alert(
              'Cancelar Todas',
              'Deseja cancelar todas as notificações agendadas?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Confirmar',
                  style: 'destructive',
                  onPress: async () => {
                    await NotificationService.cancelAllNotifications();
                    Alert.alert('Sucesso', 'Todas as notificações foram canceladas');
                  }
                }
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={20} color={theme.negative} />
          <Text style={[styles.actionText, { color: theme.text }]}>
            Cancelar Todas as Notificações
          </Text>
        </TouchableOpacity>
      </View>

      {/* Salvar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          onPress={savePreferences}
        >
          <Text style={[styles.saveButtonText, { color: '#fff' }]}>
            Salvar Configurações
          </Text>
        </TouchableOpacity>
      </View>

      {/* DateTimePicker */}
      {showTimePicker && (
        <DateTimePicker
          value={recapTime}
          mode="time"
          display="default"
          onChange={(event, selectedDate) => {
            setShowTimePicker(false);
            if (selectedDate) {
              setRecapTime(selectedDate);
            }
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
  },
  enableButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enableButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timePickerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
