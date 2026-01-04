import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DelinquentCompany {
  id: string;
  name: string;
  status: string;
  trial_end: string;
  days_overdue: number;
  delinquency_status: 'yellow' | 'orange' | 'red' | 'black';
  amount_due: number;
  reminder_sent: boolean;
  whatsapp_sent: boolean;
}

const STATUS_CONFIG = {
  yellow: { label: '1-7 dias', color: '#F59E0B', action: 'Lembrete gentil', icon: '🟡' },
  orange: { label: '8-15 dias', color: '#F97316', action: 'Bloqueio parcial', icon: '🟠' },
  red: { label: '16-30 dias', color: '#EF4444', action: 'Bloqueio total', icon: '🔴' },
  black: { label: '30+ dias', color: '#1F2937', action: 'Exclusão iminente', icon: '⚫' },
};

export default function AdminDelinquencyScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState<DelinquentCompany | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('');

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
  };

  // Query para buscar empresas inadimplentes
  const { data: delinquents, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-delinquents'],
    queryFn: async () => {
      // Buscar empresas com trial expirado ou status expired/blocked
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name, status, trial_end')
        .is('deleted_at', null)
        .in('status', ['expired', 'blocked', 'trial']);

      if (!companies) return [];

      const now = new Date();
      const delinquentList: DelinquentCompany[] = [];

      for (const company of companies) {
        if (!company.trial_end) continue;

        const trialEnd = new Date(company.trial_end);
        if (isNaN(trialEnd.getTime())) continue; // Skip invalid dates

        const daysOverdue = Math.floor((now.getTime() - trialEnd.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue > 0) {
          let delinquencyStatus: 'yellow' | 'orange' | 'red' | 'black';
          if (daysOverdue <= 7) delinquencyStatus = 'yellow';
          else if (daysOverdue <= 15) delinquencyStatus = 'orange';
          else if (daysOverdue <= 30) delinquencyStatus = 'red';
          else delinquencyStatus = 'black';

          delinquentList.push({
            id: company.id,
            name: company.name,
            status: company.status,
            trial_end: company.trial_end,
            days_overdue: daysOverdue,
            delinquency_status: delinquencyStatus,
            amount_due: 999, // R$ 9,99 em centavos
            reminder_sent: false,
            whatsapp_sent: false,
          });
        }
      }

      // Ordenar por dias de atraso (mais atrasados primeiro)
      return delinquentList.sort((a, b) => b.days_overdue - a.days_overdue);
    },
  });

  // Mutation para bloquear empresa
  const blockMutation = useMutation({
    mutationFn: async ({ companyId, blockType }: { companyId: string; blockType: 'partial' | 'full' }) => {
      const newStatus = blockType === 'full' ? 'blocked' : 'expired';
      const { error } = await supabase
        .from('companies')
        .update({ status: newStatus })
        .eq('id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delinquents'] });
      Alert.alert('Sucesso', 'Status da empresa atualizado');
    },
  });

  // Mutation para soft delete
  const softDeleteMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from('companies')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-delinquents'] });
      Alert.alert('Sucesso', 'Empresa marcada para exclusão');
      setShowActionModal(false);
    },
  });

  // Formatar valor
  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Abrir modal de ação
  const openActionModal = (company: DelinquentCompany) => {
    setSelectedCompany(company);
    setMessageTemplate(getMessageTemplate(company));
    setShowActionModal(true);
  };

  // Template de mensagem
  const getMessageTemplate = (company: DelinquentCompany) => {
    const templates = {
      yellow: `Olá! Notamos que o período de teste do Fast Cash Flow expirou há ${company.days_overdue} dia(s). Gostaríamos de saber se podemos ajudar com alguma dúvida sobre a assinatura. Estamos à disposição!`,
      orange: `Olá! Seu acesso ao Fast Cash Flow está limitado há ${company.days_overdue} dias. Para continuar usando todas as funcionalidades, regularize sua assinatura. Precisa de ajuda?`,
      red: `Atenção: Seu acesso ao Fast Cash Flow foi bloqueado há ${company.days_overdue} dias. Para evitar a perda dos seus dados, regularize sua situação o mais rápido possível.`,
      black: `URGENTE: Sua conta no Fast Cash Flow será excluída em breve devido à inadimplência de ${company.days_overdue} dias. Entre em contato imediatamente para evitar a perda permanente dos seus dados.`,
    };
    return templates[company.delinquency_status];
  };

  // Contadores por status
  const statusCounts = React.useMemo(() => {
    if (!delinquents) return { yellow: 0, orange: 0, red: 0, black: 0, total: 0 };

    return {
      yellow: delinquents.filter(d => d.delinquency_status === 'yellow').length,
      orange: delinquents.filter(d => d.delinquency_status === 'orange').length,
      red: delinquents.filter(d => d.delinquency_status === 'red').length,
      black: delinquents.filter(d => d.delinquency_status === 'black').length,
      total: delinquents.length,
    };
  }, [delinquents]);

  // Total em aberto
  const totalDue = delinquents?.reduce((sum, d) => sum + d.amount_due, 0) || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            🔴 Gestão de Inadimplência
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {statusCounts.total} empresa{statusCounts.total !== 1 ? 's' : ''} com pagamento pendente
          </Text>
        </View>

        {/* Resumo */}
        <View style={[styles.summaryCard, { backgroundColor: colors.danger }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total em Aberto</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalDue)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Empresas</Text>
              <Text style={styles.summaryValue}>{statusCounts.total}</Text>
            </View>
          </View>
        </View>

        {/* Status Cards */}
        <View style={styles.statusGrid}>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <View
              key={key}
              style={[styles.statusCard, { backgroundColor: config.color + '20', borderColor: config.color }]}
            >
              <Text style={styles.statusIcon}>{config.icon}</Text>
              <Text style={[styles.statusCount, { color: config.color }]}>
                {statusCounts[key as keyof typeof statusCounts]}
              </Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                {config.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Fluxo de Ações */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📋 Fluxo de Ações Automáticas
          </Text>
          <View style={[styles.flowCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            {[
              { day: 'Dia 3', action: 'Email automático lembrando vencimento', icon: '📧' },
              { day: 'Dia 7', action: 'WhatsApp manual do admin', icon: '📱' },
              { day: 'Dia 15', action: 'Bloqueio de recursos avançados', icon: '🔒' },
              { day: 'Dia 30', action: 'Soft delete da empresa', icon: '🗑️' },
            ].map((item, index) => (
              <View
                key={index}
                style={[
                  styles.flowItem,
                  index < 3 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                ]}
              >
                <Text style={styles.flowIcon}>{item.icon}</Text>
                <View style={styles.flowContent}>
                  <Text style={[styles.flowDay, { color: colors.text }]}>{item.day}</Text>
                  <Text style={[styles.flowAction, { color: colors.textSecondary }]}>{item.action}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Lista de Inadimplentes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📋 Empresas Inadimplentes
          </Text>

          {isLoading ? (
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Carregando...
            </Text>
          ) : delinquents && delinquents.length > 0 ? (
            <View style={styles.delinquentsList}>
              {delinquents.map((company) => {
                const config = STATUS_CONFIG[company.delinquency_status];
                return (
                  <TouchableOpacity
                    key={company.id}
                    style={[
                      styles.delinquentCard,
                      { backgroundColor: colors.cardBg, borderColor: config.color, borderLeftWidth: 4 }
                    ]}
                    onPress={() => openActionModal(company)}
                  >
                    <View style={styles.delinquentHeader}>
                      <Text style={styles.delinquentIcon}>{config.icon}</Text>
                      <View style={styles.delinquentInfo}>
                        <Text style={[styles.delinquentName, { color: colors.text }]}>
                          {company.name}
                        </Text>
                        <Text style={[styles.delinquentDays, { color: config.color }]}>
                          {company.days_overdue} dias de atraso
                        </Text>
                      </View>
                      <View style={styles.delinquentAmount}>
                        <Text style={[styles.amountValue, { color: colors.danger }]}>
                          {formatCurrency(company.amount_due)}
                        </Text>
                        <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                          em aberto
                        </Text>
                      </View>
                    </View>
                    <View style={styles.delinquentFooter}>
                      <Text style={[styles.delinquentAction, { color: colors.textSecondary }]}>
                        Ação: {config.action}
                      </Text>
                      <Text style={[styles.delinquentDate, { color: colors.textSecondary }]}>
                        Venceu em {formatDate(company.trial_end)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.success + '10' }]}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={[styles.emptyText, { color: colors.success }]}>
                Nenhuma empresa inadimplente!
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Ação */}
      <Modal
        visible={showActionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowActionModal(false)}>
              <Text style={[styles.modalClose, { color: colors.primary }]}>Fechar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Ações para {selectedCompany?.name}
            </Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Status Atual */}
            {selectedCompany && (
              <View style={[styles.modalStatusCard, { backgroundColor: STATUS_CONFIG[selectedCompany.delinquency_status].color + '20' }]}>
                <Text style={styles.modalStatusIcon}>
                  {STATUS_CONFIG[selectedCompany.delinquency_status].icon}
                </Text>
                <View>
                  <Text style={[styles.modalStatusLabel, { color: colors.text }]}>
                    {selectedCompany.days_overdue} dias de atraso
                  </Text>
                  <Text style={[styles.modalStatusAction, { color: colors.textSecondary }]}>
                    {STATUS_CONFIG[selectedCompany.delinquency_status].action}
                  </Text>
                </View>
              </View>
            )}

            {/* Template de Mensagem */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                📱 Mensagem para WhatsApp
              </Text>
              <TextInput
                style={[styles.messageInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                value={messageTemplate}
                onChangeText={setMessageTemplate}
                multiline
                numberOfLines={5}
              />
              <TouchableOpacity
                style={[styles.copyButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  // Copiar para clipboard
                  Alert.alert('Copiado!', 'Mensagem copiada para a área de transferência');
                }}
              >
                <Text style={styles.copyButtonText}>📋 Copiar Mensagem</Text>
              </TouchableOpacity>
            </View>

            {/* Ações */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                ⚡ Ações Disponíveis
              </Text>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}
                onPress={() => {
                  if (selectedCompany) {
                    blockMutation.mutate({ companyId: selectedCompany.id, blockType: 'partial' });
                  }
                }}
              >
                <Text style={styles.actionButtonIcon}>🔒</Text>
                <View>
                  <Text style={[styles.actionButtonTitle, { color: colors.text }]}>Bloqueio Parcial</Text>
                  <Text style={[styles.actionButtonDesc, { color: colors.textSecondary }]}>
                    Limita recursos avançados
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}
                onPress={() => {
                  if (selectedCompany) {
                    blockMutation.mutate({ companyId: selectedCompany.id, blockType: 'full' });
                  }
                }}
              >
                <Text style={styles.actionButtonIcon}>⛔</Text>
                <View>
                  <Text style={[styles.actionButtonTitle, { color: colors.text }]}>Bloqueio Total</Text>
                  <Text style={[styles.actionButtonDesc, { color: colors.textSecondary }]}>
                    Impede acesso ao sistema
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#1F2937' + '20', borderColor: '#1F2937' }]}
                onPress={() => {
                  Alert.alert(
                    'Confirmar Exclusão',
                    `Tem certeza que deseja marcar "${selectedCompany?.name}" para exclusão? Esta ação pode ser revertida em até 30 dias.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Excluir',
                        style: 'destructive',
                        onPress: () => selectedCompany && softDeleteMutation.mutate(selectedCompany.id)
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.actionButtonIcon}>🗑️</Text>
                <View>
                  <Text style={[styles.actionButtonTitle, { color: colors.text }]}>Soft Delete</Text>
                  <Text style={[styles.actionButtonDesc, { color: colors.textSecondary }]}>
                    Marca para exclusão (reversível)
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
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
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  statusCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statusCount: {
    fontSize: 20,
    fontWeight: '800',
  },
  statusLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  flowCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  flowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  flowIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  flowContent: {
    flex: 1,
  },
  flowDay: {
    fontSize: 14,
    fontWeight: '700',
  },
  flowAction: {
    fontSize: 12,
    marginTop: 2,
  },
  delinquentsList: {
    gap: 12,
  },
  delinquentCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  delinquentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  delinquentIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  delinquentInfo: {
    flex: 1,
  },
  delinquentName: {
    fontSize: 15,
    fontWeight: '700',
  },
  delinquentDays: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  delinquentAmount: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  amountLabel: {
    fontSize: 10,
  },
  delinquentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  delinquentAction: {
    fontSize: 11,
  },
  delinquentDate: {
    fontSize: 11,
  },
  loadingText: {
    textAlign: 'center',
    padding: 40,
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
    fontSize: 16,
    fontWeight: '700',
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
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  modalStatusIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  modalStatusLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalStatusAction: {
    fontSize: 13,
    marginTop: 2,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  copyButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
