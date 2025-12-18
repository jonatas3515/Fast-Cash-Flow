import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface AuditLog {
  id: string;
  company_id: string;
  company_name: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  ip_address: string;
  device_info: {
    type: string;
    os: string;
    browser: string;
  };
  location: {
    city: string;
    country: string;
  };
  created_at: string;
}

interface SecurityAlert {
  id: string;
  company_id: string;
  company_name: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  ip_address: string;
  status: 'new' | 'acknowledged' | 'resolved';
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  login: { label: 'Login', icon: '🔐', color: '#3B82F6' },
  logout: { label: 'Logout', icon: '🚪', color: '#6B7280' },
  login_failed: { label: 'Login Falhou', icon: '❌', color: '#EF4444' },
  transaction_created: { label: 'Transação Criada', icon: '➕', color: '#10B981' },
  transaction_updated: { label: 'Transação Editada', icon: '✏️', color: '#F59E0B' },
  transaction_deleted: { label: 'Transação Excluída', icon: '🗑️', color: '#EF4444' },
  report_exported: { label: 'Relatório Exportado', icon: '📤', color: '#8B5CF6' },
  settings_updated: { label: 'Config. Alterada', icon: '⚙️', color: '#6B7280' },
  backup_created: { label: 'Backup Criado', icon: '💾', color: '#10B981' },
  backup_restored: { label: 'Backup Restaurado', icon: '🔄', color: '#F59E0B' },
};

const SEVERITY_CONFIG = {
  low: { label: 'Baixa', color: '#6B7280', bg: '#6B728020' },
  medium: { label: 'Média', color: '#F59E0B', bg: '#F59E0B20' },
  high: { label: 'Alta', color: '#EF4444', bg: '#EF444420' },
  critical: { label: 'Crítica', color: '#DC2626', bg: '#DC262620' },
};

export default function AdminAuditScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  
  const [activeTab, setActiveTab] = useState<'logs' | 'alerts'>('logs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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

  // Query para buscar logs de auditoria
  const { data: auditLogs, isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      // Simular logs (em produção viria do banco)
      const actions = Object.keys(ACTION_LABELS);
      const companies = ['Padaria Pão Quente', 'Salão Beleza Total', 'Oficina Mecânica Silva', 'Loja de Roupas Fashion'];
      const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba'];
      
      const logs: AuditLog[] = [];
      for (let i = 0; i < 50; i++) {
        const date = new Date(Date.now() - i * Math.random() * 3600000);
        logs.push({
          id: `log-${i}`,
          company_id: `company-${i % 4}`,
          company_name: companies[i % 4],
          user_id: `user-${i % 10}`,
          action_type: actions[Math.floor(Math.random() * actions.length)],
          entity_type: 'transaction',
          entity_id: `entity-${i}`,
          ip_address: `200.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          device_info: {
            type: Math.random() > 0.5 ? 'mobile' : 'desktop',
            os: Math.random() > 0.5 ? 'iOS' : 'Android',
            browser: Math.random() > 0.5 ? 'Safari' : 'Chrome',
          },
          location: {
            city: cities[Math.floor(Math.random() * cities.length)],
            country: 'BR',
          },
          created_at: date.toISOString(),
        });
      }
      return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });

  // Query para buscar alertas de segurança
  const { data: securityAlerts, isLoading: loadingAlerts, refetch: refetchAlerts } = useQuery({
    queryKey: ['admin-security-alerts'],
    queryFn: async () => {
      // Simular alertas (em produção viria do banco)
      const alerts: SecurityAlert[] = [
        {
          id: 'alert-1',
          company_id: 'company-1',
          company_name: 'Padaria Pão Quente',
          alert_type: 'new_device',
          severity: 'medium',
          title: 'Login de novo dispositivo',
          description: 'Login detectado de um dispositivo não reconhecido em São Paulo',
          ip_address: '200.123.45.67',
          status: 'new',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'alert-2',
          company_id: 'company-2',
          company_name: 'Salão Beleza Total',
          alert_type: 'multiple_failed_logins',
          severity: 'high',
          title: 'Múltiplas tentativas de login',
          description: '5 tentativas de login falhas nos últimos 10 minutos',
          ip_address: '189.45.67.89',
          status: 'new',
          created_at: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'alert-3',
          company_id: 'company-3',
          company_name: 'Oficina Mecânica Silva',
          alert_type: 'bulk_deletion',
          severity: 'critical',
          title: 'Exclusão em massa detectada',
          description: '47 transações excluídas em menos de 5 minutos',
          ip_address: '177.89.12.34',
          status: 'acknowledged',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'alert-4',
          company_id: 'company-1',
          company_name: 'Padaria Pão Quente',
          alert_type: 'new_location',
          severity: 'low',
          title: 'Login de nova localização',
          description: 'Primeiro login registrado de Curitiba, PR',
          ip_address: '201.56.78.90',
          status: 'resolved',
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
      ];
      return alerts;
    },
  });

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filtrar logs
  const filteredLogs = auditLogs?.filter(log => 
    log.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action_type.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Contadores de alertas
  const alertCounts = {
    new: securityAlerts?.filter(a => a.status === 'new').length || 0,
    critical: securityAlerts?.filter(a => a.severity === 'critical' && a.status !== 'resolved').length || 0,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.cardBg }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'logs' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('logs')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'logs' ? '#FFFFFF' : colors.text }]}>
            📜 Auditoria
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alerts' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'alerts' ? '#FFFFFF' : colors.text }]}>
            🚨 Alertas {alertCounts.new > 0 && `(${alertCounts.new})`}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              refetchLogs();
              refetchAlerts();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'logs' ? (
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                📜 Histórico de Auditoria
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Todas as ações registradas no sistema
              </Text>
            </View>

            {/* Busca */}
            <View style={[styles.searchContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar por empresa ou ação..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Lista de Logs */}
            <View style={styles.logsList}>
              {filteredLogs.map((log) => {
                const actionConfig = ACTION_LABELS[log.action_type] || { label: log.action_type, icon: '📝', color: colors.textSecondary };
                
                return (
                  <TouchableOpacity
                    key={log.id}
                    style={[styles.logCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                    onPress={() => {
                      setSelectedLog(log);
                      setShowDetailModal(true);
                    }}
                  >
                    <View style={styles.logHeader}>
                      <View style={[styles.logIcon, { backgroundColor: actionConfig.color + '20' }]}>
                        <Text style={styles.logIconText}>{actionConfig.icon}</Text>
                      </View>
                      <View style={styles.logInfo}>
                        <Text style={[styles.logAction, { color: actionConfig.color }]}>
                          {actionConfig.label}
                        </Text>
                        <Text style={[styles.logCompany, { color: colors.text }]}>
                          {log.company_name}
                        </Text>
                      </View>
                      <Text style={[styles.logTime, { color: colors.textSecondary }]}>
                        {formatDate(log.created_at)}
                      </Text>
                    </View>
                    <View style={styles.logFooter}>
                      <Text style={[styles.logDetail, { color: colors.textSecondary }]}>
                        📍 {log.location.city} • 📱 {log.device_info.type}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            {/* Header Alertas */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                🚨 Alertas de Segurança
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Atividades suspeitas e notificações
              </Text>
            </View>

            {/* Resumo de Alertas */}
            {alertCounts.critical > 0 && (
              <View style={[styles.criticalAlert, { backgroundColor: colors.danger + '10', borderColor: colors.danger }]}>
                <Text style={styles.criticalIcon}>🔴</Text>
                <Text style={[styles.criticalText, { color: colors.danger }]}>
                  {alertCounts.critical} alerta{alertCounts.critical > 1 ? 's' : ''} crítico{alertCounts.critical > 1 ? 's' : ''} requer{alertCounts.critical === 1 ? '' : 'em'} atenção imediata
                </Text>
              </View>
            )}

            {/* Lista de Alertas */}
            <View style={styles.alertsList}>
              {securityAlerts?.map((alert) => {
                const severityConfig = SEVERITY_CONFIG[alert.severity];
                
                return (
                  <View
                    key={alert.id}
                    style={[
                      styles.alertCard,
                      { 
                        backgroundColor: colors.cardBg, 
                        borderColor: alert.status === 'resolved' ? colors.border : severityConfig.color,
                        borderLeftWidth: 4,
                        opacity: alert.status === 'resolved' ? 0.6 : 1,
                      }
                    ]}
                  >
                    <View style={styles.alertHeader}>
                      <View style={[styles.severityBadge, { backgroundColor: severityConfig.bg }]}>
                        <Text style={[styles.severityText, { color: severityConfig.color }]}>
                          {severityConfig.label}
                        </Text>
                      </View>
                      <Text style={[styles.alertTime, { color: colors.textSecondary }]}>
                        {formatDate(alert.created_at)}
                      </Text>
                    </View>
                    
                    <Text style={[styles.alertTitle, { color: colors.text }]}>
                      {alert.title}
                    </Text>
                    <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
                      {alert.description}
                    </Text>
                    
                    <View style={styles.alertFooter}>
                      <Text style={[styles.alertCompany, { color: colors.textSecondary }]}>
                        🏢 {alert.company_name}
                      </Text>
                      <Text style={[styles.alertIp, { color: colors.textSecondary }]}>
                        🌐 {alert.ip_address}
                      </Text>
                    </View>

                    {alert.status !== 'resolved' && (
                      <View style={styles.alertActions}>
                        <TouchableOpacity
                          style={[styles.alertActionBtn, { backgroundColor: colors.warning + '20' }]}
                        >
                          <Text style={[styles.alertActionText, { color: colors.warning }]}>
                            👁️ Reconhecer
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.alertActionBtn, { backgroundColor: colors.success + '20' }]}
                        >
                          <Text style={[styles.alertActionText, { color: colors.success }]}>
                            ✅ Resolver
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Detalhes do Log */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Text style={[styles.modalClose, { color: colors.primary }]}>Fechar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Detalhes do Log</Text>
            <View style={{ width: 50 }} />
          </View>

          {selectedLog && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.detailSection, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Ação</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {ACTION_LABELS[selectedLog.action_type]?.icon} {ACTION_LABELS[selectedLog.action_type]?.label || selectedLog.action_type}
                </Text>
              </View>

              <View style={[styles.detailSection, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Empresa</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  🏢 {selectedLog.company_name}
                </Text>
              </View>

              <View style={[styles.detailSection, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Data/Hora</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  🕐 {new Date(selectedLog.created_at).toLocaleString('pt-BR')}
                </Text>
              </View>

              <View style={[styles.detailSection, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Dispositivo</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  📱 {selectedLog.device_info.type} • {selectedLog.device_info.os} • {selectedLog.device_info.browser}
                </Text>
              </View>

              <View style={[styles.detailSection, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Localização</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  📍 {selectedLog.location.city}, {selectedLog.location.country}
                </Text>
              </View>

              <View style={[styles.detailSection, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Endereço IP</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  🌐 {selectedLog.ip_address}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  logsList: {
    gap: 10,
  },
  logCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logIconText: {
    fontSize: 18,
  },
  logInfo: {
    flex: 1,
  },
  logAction: {
    fontSize: 14,
    fontWeight: '700',
  },
  logCompany: {
    fontSize: 13,
    marginTop: 2,
  },
  logTime: {
    fontSize: 11,
  },
  logFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  logDetail: {
    fontSize: 11,
  },
  criticalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  criticalIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  criticalText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  alertsList: {
    gap: 12,
  },
  alertCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  alertTime: {
    fontSize: 11,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  alertDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  alertCompany: {
    fontSize: 11,
  },
  alertIp: {
    fontSize: 11,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 10,
  },
  alertActionBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertActionText: {
    fontSize: 12,
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
  detailSection: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
  },
});
