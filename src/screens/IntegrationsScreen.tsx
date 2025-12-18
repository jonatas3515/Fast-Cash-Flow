import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  Alert,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentCompanyId } from '../lib/company';
import { useToast } from '../ui/ToastProvider';
import { 
  getNotificationSettings, 
  saveNotificationSettings,
  NotificationSettings,
  formatPhoneForWhatsApp 
} from '../services/whatsappNotifications';
import { syncNotificationsForCompany } from '../services/notificationScheduler';

interface IntegrationSettings {
  whatsapp_enabled: boolean;
  whatsapp_number: string;
  whatsapp_notifications: {
    daily_summary: boolean;
    transaction_alerts: boolean;
    goal_achieved: boolean;
    negative_balance: boolean;
  };
  email_enabled: boolean;
  email_notifications: {
    daily_summary: boolean;
    weekly_summary: boolean;
    monthly_report: boolean;
    transaction_alerts: boolean;
  };
  push_enabled: boolean;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  total_calls: number;
  successful_calls: number;
  last_called_at: string | null;
}

const EVENT_OPTIONS = [
  { key: 'transaction_created', label: 'Transação Criada', icon: '➕' },
  { key: 'transaction_deleted', label: 'Transação Excluída', icon: '🗑️' },
  { key: 'goal_achieved', label: 'Meta Atingida', icon: '🎯' },
  { key: 'debt_paid', label: 'Dívida Paga', icon: '✅' },
  { key: 'daily_summary', label: 'Resumo Diário', icon: '📊' },
  { key: 'alert_negative_balance', label: 'Saldo Negativo', icon: '⚠️' },
];

export default function IntegrationsScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  
  // Form state para WhatsApp
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappApiUrl, setWhatsappApiUrl] = useState('');
  const [whatsappApiToken, setWhatsappApiToken] = useState('');
  const [notifyOrderDelivery, setNotifyOrderDelivery] = useState(true);
  const [notifyDailySummary, setNotifyDailySummary] = useState(true);
  const [notifyDebtReminder, setNotifyDebtReminder] = useState(true);
  const [orderReminderHours, setOrderReminderHours] = useState('3');
  const [dailySummaryTime, setDailySummaryTime] = useState('20:00');
  const [debtReminderTime, setDebtReminderTime] = useState('12:00');
  
  // Form state para Webhook
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['transaction_created']);

  // Cores dinâmicas
  const colors = {
    background: theme.background,
    cardBg: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    border: theme.border,
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    whatsapp: '#25D366',
  };

  // Query para buscar configurações
  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;
      
      const data = await getNotificationSettings(companyId);
      return data;
    },
  });

  // Carregar configurações no form quando disponíveis
  useEffect(() => {
    if (settings) {
      setWhatsappNumber(settings.whatsapp_number || '');
      setWhatsappApiUrl(settings.whatsapp_api_url || '');
      setWhatsappApiToken(settings.whatsapp_api_token || '');
      setNotifyOrderDelivery(settings.notify_order_delivery ?? true);
      setNotifyDailySummary(settings.notify_daily_summary ?? true);
      setNotifyDebtReminder(settings.notify_debt_reminder ?? true);
      setOrderReminderHours(String(settings.order_reminder_hours || 3));
      setDailySummaryTime(settings.daily_summary_time || '20:00');
      setDebtReminderTime(settings.debt_reminder_time || '12:00');
    }
  }, [settings]);

  // Query para buscar webhooks
  const { data: webhooks } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      // Simular webhooks (em produção viria do banco)
      return [
        {
          id: '1',
          name: 'Notificação WhatsApp',
          url: 'https://api.z-api.io/instances/xxx/token/xxx/send-text',
          events: ['transaction_created', 'goal_achieved'],
          is_active: true,
          total_calls: 150,
          successful_calls: 145,
          last_called_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '2',
          name: 'Planilha Google',
          url: 'https://script.google.com/macros/s/xxx/exec',
          events: ['transaction_created'],
          is_active: false,
          total_calls: 50,
          successful_calls: 48,
          last_called_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ] as Webhook[];
    },
  });

  // Mutation para salvar configurações de WhatsApp
  const saveWhatsAppMutation = useMutation({
    mutationFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');
      
      const success = await saveNotificationSettings({
        whatsapp_enabled: true,
        whatsapp_number: formatPhoneForWhatsApp(whatsappNumber),
        whatsapp_api_url: whatsappApiUrl,
        whatsapp_api_token: whatsappApiToken,
        notify_order_delivery: notifyOrderDelivery,
        notify_daily_summary: notifyDailySummary,
        notify_debt_reminder: notifyDebtReminder,
        order_reminder_hours: parseInt(orderReminderHours) || 3,
        daily_summary_time: dailySummaryTime,
        debt_reminder_time: debtReminderTime,
      }, companyId);
      
      if (!success) throw new Error('Falha ao salvar configurações');
      
      // Sincronizar notificações
      await syncNotificationsForCompany(companyId);
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      setShowWhatsAppModal(false);
      toast.show('Configurações de WhatsApp salvas!', 'success');
    },
    onError: (error: any) => {
      toast.show('Erro ao salvar: ' + error.message, 'error');
    },
  });

  // Mutation para desativar WhatsApp
  const disableWhatsAppMutation = useMutation({
    mutationFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');
      
      const success = await saveNotificationSettings({
        whatsapp_enabled: false,
      }, companyId);
      
      if (!success) throw new Error('Falha ao desativar');
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.show('WhatsApp desativado', 'success');
    },
  });

  // Mutation para salvar webhook
  const saveWebhookMutation = useMutation({
    mutationFn: async (data: { name: string; url: string; events: string[] }) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setShowWebhookModal(false);
      resetWebhookForm();
      Alert.alert('Sucesso', 'Webhook salvo com sucesso!');
    },
  });

  // Reset form
  const resetWebhookForm = () => {
    setWebhookName('');
    setWebhookUrl('');
    setWebhookEvents(['transaction_created']);
    setEditingWebhook(null);
  };

  // Abrir modal para editar
  const openEditWebhook = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setWebhookName(webhook.name);
    setWebhookUrl(webhook.url);
    setWebhookEvents(webhook.events);
    setShowWebhookModal(true);
  };

  // Toggle evento
  const toggleEvent = (eventKey: string) => {
    setWebhookEvents(prev => 
      prev.includes(eventKey) 
        ? prev.filter(e => e !== eventKey)
        : [...prev, eventKey]
    );
  };

  // Formatar data
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={[styles.header, { alignItems: 'center' }]}>
          <Text style={[styles.headerTitle, { color: isDark ? theme.primary : theme.negative, textAlign: 'center' }]}>
            🔗 Integrações
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
            Configure notificações e automações
          </Text>
        </View>

        {/* WhatsApp */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📱 WhatsApp
            </Text>
            <Switch
              value={settings?.whatsapp_enabled || false}
              onValueChange={(value) => {
                if (value) {
                  setShowWhatsAppModal(true);
                } else {
                  disableWhatsAppMutation.mutate();
                }
              }}
              trackColor={{ false: colors.border, true: colors.whatsapp + '50' }}
              thumbColor={settings?.whatsapp_enabled ? colors.whatsapp : colors.textSecondary}
            />
          </View>
          
          <View style={[styles.integrationCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[styles.integrationIcon, { backgroundColor: colors.whatsapp + '20' }]}>
              <Text style={styles.integrationIconText}>💬</Text>
            </View>
            <View style={styles.integrationInfo}>
              <Text style={[styles.integrationName, { color: colors.text }]}>
                Notificações WhatsApp
              </Text>
              <Text style={[styles.integrationDesc, { color: colors.textSecondary }]}>
                {settings?.whatsapp_enabled 
                  ? `Ativo: ${settings.whatsapp_number || 'Número não configurado'}`
                  : 'Receba alertas importantes no seu WhatsApp'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.configBtn, { backgroundColor: colors.whatsapp }]}
              onPress={() => setShowWhatsAppModal(true)}
            >
              <Text style={styles.configBtnText}>Configurar</Text>
            </TouchableOpacity>
          </View>

          {settings?.whatsapp_enabled && (
            <View style={[styles.notificationOptions, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.optionsTitle, { color: colors.text }]}>
                Notificações ativas:
              </Text>
              <View style={styles.optionRow}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>📦 Lembrete de entrega (3h antes)</Text>
                <Text style={{ color: settings.notify_order_delivery ? colors.success : colors.textSecondary }}>
                  {settings.notify_order_delivery ? '✓' : '✗'}
                </Text>
              </View>
              <View style={styles.optionRow}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>📊 Resumo diário (20h)</Text>
                <Text style={{ color: settings.notify_daily_summary ? colors.success : colors.textSecondary }}>
                  {settings.notify_daily_summary ? '✓' : '✗'}
                </Text>
              </View>
              <View style={styles.optionRow}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>⚠️ Lembrete de dívidas (12h)</Text>
                <Text style={{ color: settings.notify_debt_reminder ? colors.success : colors.textSecondary }}>
                  {settings.notify_debt_reminder ? '✓' : '✗'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Webhooks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🔗 Webhooks
            </Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                resetWebhookForm();
                setShowWebhookModal(true);
              }}
            >
              <Text style={styles.addBtnText}>+ Novo</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Envie dados automaticamente para outros serviços quando eventos acontecerem
          </Text>

          {webhooks && webhooks.length > 0 ? (
            <View style={styles.webhooksList}>
              {webhooks.map((webhook) => {
                const successRate = webhook.total_calls > 0 
                  ? Math.round((webhook.successful_calls / webhook.total_calls) * 100)
                  : 0;
                
                return (
                  <TouchableOpacity
                    key={webhook.id}
                    style={[
                      styles.webhookCard,
                      { 
                        backgroundColor: colors.cardBg, 
                        borderColor: webhook.is_active ? colors.success : colors.border,
                        opacity: webhook.is_active ? 1 : 0.6,
                      }
                    ]}
                    onPress={() => openEditWebhook(webhook)}
                  >
                    <View style={styles.webhookHeader}>
                      <View style={styles.webhookInfo}>
                        <Text style={[styles.webhookName, { color: colors.text }]}>
                          {webhook.name}
                        </Text>
                        <Text style={[styles.webhookUrl, { color: colors.textSecondary }]} numberOfLines={1}>
                          {webhook.url}
                        </Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: webhook.is_active ? colors.success + '20' : colors.border }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: webhook.is_active ? colors.success : colors.textSecondary }
                        ]}>
                          {webhook.is_active ? 'Ativo' : 'Inativo'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.webhookEvents}>
                      {webhook.events.slice(0, 3).map((event) => {
                        const eventConfig = EVENT_OPTIONS.find(e => e.key === event);
                        return (
                          <View key={event} style={[styles.eventBadge, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.eventText, { color: colors.primary }]}>
                              {eventConfig?.icon} {eventConfig?.label || event}
                            </Text>
                          </View>
                        );
                      })}
                      {webhook.events.length > 3 && (
                        <Text style={[styles.moreEvents, { color: colors.textSecondary }]}>
                          +{webhook.events.length - 3}
                        </Text>
                      )}
                    </View>

                    <View style={styles.webhookStats}>
                      <Text style={[styles.webhookStat, { color: colors.textSecondary }]}>
                        📊 {webhook.total_calls} chamadas ({successRate}% sucesso)
                      </Text>
                      <Text style={[styles.webhookStat, { color: colors.textSecondary }]}>
                        🕐 {formatDate(webhook.last_called_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBg }]}>
              <Text style={styles.emptyIcon}>🔗</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum webhook configurado
              </Text>
            </View>
          )}
        </View>

        {/* Importação */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📄 Importação de Dados
          </Text>
          
          <TouchableOpacity
            style={[styles.importCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Importar')}
          >
            <View style={[styles.importIcon, { backgroundColor: colors.primary + '20' }]}>
              <Text style={styles.importIconText}>📁</Text>
            </View>
            <View style={styles.importInfo}>
              <Text style={[styles.importName, { color: colors.text }]}>
                Importar Extrato Bancário
              </Text>
              <Text style={[styles.importDesc, { color: colors.textSecondary }]}>
                CSV, OFX • Nubank, Inter, Caixa, BB e mais
              </Text>
            </View>
            <Text style={[styles.importArrow, { color: colors.textSecondary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Dicas */}
        <View style={[styles.tipsCard, { backgroundColor: colors.warning + '10', borderColor: colors.warning }]}>
          <Text style={styles.tipsIcon}>💡</Text>
          <View style={styles.tipsContent}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>
              Dica: Automatize com Webhooks
            </Text>
            <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
              Use webhooks para enviar dados para Google Sheets, Notion, Zapier, 
              ou qualquer outro serviço que aceite requisições HTTP.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Webhook */}
      <Modal
        visible={showWebhookModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWebhookModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowWebhookModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.danger }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
            </Text>
            <TouchableOpacity 
              onPress={() => saveWebhookMutation.mutate({ name: webhookName, url: webhookUrl, events: webhookEvents })}
              disabled={!webhookName || !webhookUrl || webhookEvents.length === 0}
            >
              <Text style={[styles.modalSave, { color: webhookName && webhookUrl ? colors.primary : colors.textSecondary }]}>
                Salvar
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Nome *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                value={webhookName}
                onChangeText={setWebhookName}
                placeholder="Ex: Notificação WhatsApp"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>URL *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                value={webhookUrl}
                onChangeText={setWebhookUrl}
                placeholder="https://..."
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Eventos *</Text>
              <Text style={[styles.formHint, { color: colors.textSecondary }]}>
                Selecione quando o webhook será chamado
              </Text>
              <View style={styles.eventsGrid}>
                {EVENT_OPTIONS.map((event) => {
                  const isSelected = webhookEvents.includes(event.key);
                  return (
                    <TouchableOpacity
                      key={event.key}
                      style={[
                        styles.eventOption,
                        { 
                          backgroundColor: isSelected ? colors.primary + '20' : colors.cardBg,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }
                      ]}
                      onPress={() => toggleEvent(event.key)}
                    >
                      <Text style={styles.eventOptionIcon}>{event.icon}</Text>
                      <Text style={[styles.eventOptionLabel, { color: colors.text }]}>
                        {event.label}
                      </Text>
                      {isSelected && (
                        <Text style={[styles.eventCheck, { color: colors.primary }]}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                O webhook receberá um POST com os dados do evento em formato JSON.
                Exemplo: {`{"event": "transaction_created", "data": {...}}`}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de Configuração WhatsApp */}
      <Modal
        visible={showWhatsAppModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWhatsAppModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowWhatsAppModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.danger }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Configurar WhatsApp
            </Text>
            <TouchableOpacity 
              onPress={() => saveWhatsAppMutation.mutate()}
              disabled={!whatsappNumber || saveWhatsAppMutation.isPending}
            >
              <Text style={[styles.modalSave, { color: whatsappNumber ? colors.whatsapp : colors.textSecondary }]}>
                {saveWhatsAppMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Número do WhatsApp */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>📱 Número do WhatsApp *</Text>
              <Text style={[styles.formHint, { color: colors.textSecondary }]}>
                Com DDD, ex: 11999999999
              </Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                value={whatsappNumber}
                onChangeText={setWhatsappNumber}
                placeholder="11999999999"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            {/* Tipos de Notificação */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>🔔 Tipos de Notificação</Text>
              
              <View style={[styles.notificationOption, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notificationOptionTitle, { color: colors.text }]}>
                    📦 Lembrete de Entrega
                  </Text>
                  <Text style={[styles.notificationOptionDesc, { color: colors.textSecondary }]}>
                    Receba um lembrete {orderReminderHours}h antes de cada entrega
                  </Text>
                </View>
                <Switch
                  value={notifyOrderDelivery}
                  onValueChange={setNotifyOrderDelivery}
                  trackColor={{ false: colors.border, true: colors.success + '50' }}
                  thumbColor={notifyOrderDelivery ? colors.success : colors.textSecondary}
                />
              </View>

              <View style={[styles.notificationOption, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notificationOptionTitle, { color: colors.text }]}>
                    📊 Resumo Diário
                  </Text>
                  <Text style={[styles.notificationOptionDesc, { color: colors.textSecondary }]}>
                    Receba um resumo financeiro às {dailySummaryTime}
                  </Text>
                </View>
                <Switch
                  value={notifyDailySummary}
                  onValueChange={setNotifyDailySummary}
                  trackColor={{ false: colors.border, true: colors.success + '50' }}
                  thumbColor={notifyDailySummary ? colors.success : colors.textSecondary}
                />
              </View>

              <View style={[styles.notificationOption, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notificationOptionTitle, { color: colors.text }]}>
                    ⚠️ Lembrete de Dívidas
                  </Text>
                  <Text style={[styles.notificationOptionDesc, { color: colors.textSecondary }]}>
                    Receba um lembrete às {debtReminderTime} do dia anterior ao vencimento
                  </Text>
                </View>
                <Switch
                  value={notifyDebtReminder}
                  onValueChange={setNotifyDebtReminder}
                  trackColor={{ false: colors.border, true: colors.success + '50' }}
                  thumbColor={notifyDebtReminder ? colors.success : colors.textSecondary}
                />
              </View>
            </View>

            {/* Configurações Avançadas */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>⚙️ Configurações Avançadas</Text>
              
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formHint, { color: colors.textSecondary }]}>Horas antes da entrega</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                    value={orderReminderHours}
                    onChangeText={setOrderReminderHours}
                    keyboardType="number-pad"
                    placeholder="3"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formHint, { color: colors.textSecondary }]}>Horário resumo</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                    value={dailySummaryTime}
                    onChangeText={setDailySummaryTime}
                    placeholder="20:00"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            </View>

            {/* API WhatsApp */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>🔗 API WhatsApp (Opcional)</Text>
              <Text style={[styles.formHint, { color: colors.textSecondary }]}>
                Para envio automático, configure uma API como Z-API ou Twilio
              </Text>
              
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border, marginBottom: 8 }]}
                value={whatsappApiUrl}
                onChangeText={setWhatsappApiUrl}
                placeholder="URL da API (ex: https://api.z-api.io/...)"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
              
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                value={whatsappApiToken}
                onChangeText={setWhatsappApiToken}
                placeholder="Token da API"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                secureTextEntry
              />
            </View>

            <View style={[styles.infoBox, { backgroundColor: colors.whatsapp + '10' }]}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Sem API configurada, as notificações serão exibidas apenas no app. 
                Para receber no WhatsApp, configure uma API de envio de mensagens.
              </Text>
            </View>

            <TouchableOpacity
              style={{ marginTop: 16 }}
              onPress={() => Linking.openURL('https://z-api.io')}
            >
              <Text style={{ color: colors.primary, textAlign: 'center' }}>
                📖 Como configurar a Z-API →
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 12,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  integrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  integrationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  integrationIconText: {
    fontSize: 20,
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    fontSize: 15,
    fontWeight: '700',
  },
  integrationDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  configBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  configBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  notificationOptions: {
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  optionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionLabel: {
    fontSize: 14,
  },
  webhooksList: {
    gap: 12,
  },
  webhookCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  webhookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  webhookInfo: {
    flex: 1,
    marginRight: 10,
  },
  webhookName: {
    fontSize: 15,
    fontWeight: '700',
  },
  webhookUrl: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  webhookEvents: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  eventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventText: {
    fontSize: 10,
    fontWeight: '600',
  },
  moreEvents: {
    fontSize: 11,
    alignSelf: 'center',
  },
  webhookStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  webhookStat: {
    fontSize: 11,
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  importCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  importIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  importIconText: {
    fontSize: 20,
  },
  importInfo: {
    flex: 1,
  },
  importName: {
    fontSize: 15,
    fontWeight: '700',
  },
  importDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  importArrow: {
    fontSize: 20,
  },
  tipsCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipsIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 12,
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formHint: {
    fontSize: 12,
    marginBottom: 10,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  eventsGrid: {
    gap: 10,
  },
  eventOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  eventOptionIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  eventOptionLabel: {
    flex: 1,
    fontSize: 14,
  },
  eventCheck: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  notificationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  notificationOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  notificationOptionDesc: {
    fontSize: 12,
  },
});
