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
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BackupWarning } from '../components/WarningBox';

export default function BackupScreen() {
  const { theme, mode } = useThemeCtx();
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBackupSettings();
  }, []);

  const loadBackupSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('backup_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setAutoBackupEnabled(parsed.enabled || false);
        setBackupFrequency(parsed.frequency || 'monthly');
        setLastBackupDate(parsed.lastBackup || null);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de backup:', error);
    }
  };

  const saveBackupSettings = async (enabled: boolean, frequency: 'weekly' | 'monthly') => {
    try {
      const settings = {
        enabled,
        frequency,
        lastBackup: lastBackupDate,
      };
      await AsyncStorage.setItem('backup_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Erro ao salvar configurações de backup:', error);
    }
  };

  const generateBackupData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar todos os dados da empresa
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', company.id)
        .order('date', { ascending: false });

      const { data: debts } = await supabase
        .from('debts')
        .select('*')
        .eq('company_id', company.id);

      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', company.id);

      const { data: recurringExpenses } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('company_id', company.id);

      const { data: goals } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('company_id', company.id);

      return {
        backupDate: new Date().toISOString(),
        company,
        transactions,
        debts,
        orders,
        recurringExpenses,
        goals,
        appVersion: '1.0.0',
      };
    } catch (error) {
      console.error('Erro ao gerar dados de backup:', error);
      throw error;
    }
  };

  const createBackupFile = async (format: 'json' | 'csv') => {
    setLoading(true);
    try {
      const backupData = await generateBackupData();
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `FastCashFlow_Backup_${timestamp}.${format}`;

      let fileContent: string;
      let mimeType: string;

      if (format === 'json') {
        fileContent = JSON.stringify(backupData, null, 2);
        mimeType = 'application/json';
      } else {
        // Gerar CSV simplificado das transações
        const csvHeader = 'Data,Tipo,Descrição,Valor,Categoria,Forma Pagamento\n';
        const csvRows = backupData.transactions?.map((t: any) =>
          `${t.date},${t.type === 'income' ? 'Receita' : 'Despesa'},${t.description},${t.amount},${t.category || ''},${t.payment_method || ''}`
        ).join('\n') || '';
        fileContent = csvHeader + csvRows;
        mimeType = 'text/csv';
      }

      if (Platform.OS === 'web') {
        // Download no navegador
        const blob = new Blob([fileContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Salvar e compartilhar no mobile
        const baseDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
        const fileUri = `${baseDir}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, fileContent, {
          encoding: 'utf8',
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType,
            dialogTitle: 'Compartilhar Backup',
            UTI: format === 'json' ? 'public.json' : 'public.comma-separated-values-text',
          });
        }
      }

      // Atualizar data do último backup
      const newLastBackup = new Date().toISOString();
      setLastBackupDate(newLastBackup);
      await AsyncStorage.setItem('backup_settings', JSON.stringify({
        enabled: autoBackupEnabled,
        frequency: backupFrequency,
        lastBackup: newLastBackup,
      }));

      Alert.alert('Sucesso', `Backup ${format.toUpperCase()} criado com sucesso!`);
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      Alert.alert('Erro', 'Não foi possível criar o backup. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoBackup = async (value: boolean) => {
    setAutoBackupEnabled(value);
    await saveBackupSettings(value, backupFrequency);

    if (value) {
      Alert.alert(
        'Backup Automático Ativado',
        `Seus dados serão salvos automaticamente ${backupFrequency === 'weekly' ? 'semanalmente' : 'mensalmente'}. Você receberá uma notificação quando o backup estiver pronto.`
      );
    }
  };

  const changeFrequency = async (frequency: 'weekly' | 'monthly') => {
    setBackupFrequency(frequency);
    await saveBackupSettings(autoBackupEnabled, frequency);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { alignItems: 'center' }]}>
        <Ionicons name="cloud-download-outline" size={48} color={mode === 'dark' ? theme.primary : theme.negative} />
        <Text style={[styles.title, { color: mode === 'dark' ? theme.primary : theme.negative, textAlign: 'center' }]}>Backup de Dados</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'center' }]}>
          Mantenha seus dados financeiros seguros com backups automáticos
        </Text>
      </View>

      {/* Warning Box */}
      <BackupWarning />

      {/* Backup Manual */}
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Backup Manual</Text>
        <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
          Crie um backup agora e salve no seu dispositivo ou compartilhe
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={() => createBackupFile('json')}
          disabled={loading}
        >
          <Ionicons name="document-text-outline" size={24} color="#FFF" />
          <Text style={styles.buttonText}>Backup Completo (JSON)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.positive, marginTop: 12 }]}
          onPress={() => createBackupFile('csv')}
          disabled={loading}
        >
          <Ionicons name="list-outline" size={24} color="#FFF" />
          <Text style={styles.buttonText}>Backup Simplificado (CSV)</Text>
        </TouchableOpacity>
      </View>

      {/* Backup Automático */}
      <View style={[styles.section, { backgroundColor: theme.card, marginTop: 20 }]}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Backup Automático</Text>
            <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
              Ative para receber backups periódicos automaticamente
            </Text>
          </View>
          <Switch
            value={autoBackupEnabled}
            onValueChange={toggleAutoBackup}
            trackColor={{ false: theme.border, true: theme.primary + '80' }}
            thumbColor={autoBackupEnabled ? theme.primary : theme.textSecondary}
          />
        </View>

        {autoBackupEnabled && (
          <View style={styles.frequencyContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Frequência:</Text>
            <View style={styles.frequencyButtons}>
              <TouchableOpacity
                style={[
                  styles.frequencyButton,
                  { backgroundColor: backupFrequency === 'weekly' ? theme.primary : theme.background },
                ]}
                onPress={() => changeFrequency('weekly')}
              >
                <Text style={[
                  styles.frequencyButtonText,
                  { color: backupFrequency === 'weekly' ? '#FFF' : theme.text }
                ]}>
                  Semanal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.frequencyButton,
                  { backgroundColor: backupFrequency === 'monthly' ? theme.primary : theme.background },
                ]}
                onPress={() => changeFrequency('monthly')}
              >
                <Text style={[
                  styles.frequencyButtonText,
                  { color: backupFrequency === 'monthly' ? '#FFF' : theme.text }
                ]}>
                  Mensal
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Último Backup */}
      {lastBackupDate && (
        <View style={[styles.infoBox, { backgroundColor: theme.card + '80', marginTop: 20 }]}>
          <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Último backup: {new Date(lastBackupDate).toLocaleDateString('pt-BR')} às{' '}
            {new Date(lastBackupDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}

      {/* Dicas */}
      <View style={[styles.tipsBox, { backgroundColor: theme.warning + '20', marginTop: 20 }]}>
        <Text style={[styles.tipsTitle, { color: theme.warning }]}>💡 Dicas Importantes:</Text>
        <Text style={[styles.tipsText, { color: theme.text }]}>
          • O backup JSON contém TODOS os seus dados e pode ser usado para restauração completa
        </Text>
        <Text style={[styles.tipsText, { color: theme.text }]}>
          • O backup CSV é simplificado e ideal para enviar ao contador ou abrir no Excel
        </Text>
        <Text style={[styles.tipsText, { color: theme.text }]}>
          • Guarde seus backups em local seguro (Google Drive, Dropbox, etc.)
        </Text>
        <Text style={[styles.tipsText, { color: theme.text }]}>
          • Faça backups antes de atualizações importantes do app
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  section: {
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    // @ts-ignore - boxShadow for web compatibility (replaces deprecated shadow* props)
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  frequencyContainer: {
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  frequencyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  tipsBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
});
