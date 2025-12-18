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
  ActivityIndicator,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Backup {
  id: string;
  company_id: string;
  company_name: string;
  backup_type: 'automatic' | 'manual' | 'pre_restore' | 'export';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  records_count: {
    transactions: number;
    categories: number;
    goals: number;
    debts: number;
  };
  created_at: string;
  expires_at: string;
  notes: string | null;
}

interface Company {
  id: string;
  name: string;
  last_backup_at: string | null;
  total_backups: number;
}

export default function AdminBackupCentralScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const queryClient = useQueryClient();
  
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [backupNotes, setBackupNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Query para buscar empresas com info de backup
  const { data: companies, isLoading: loadingCompanies, refetch: refetchCompanies } = useQuery({
    queryKey: ['admin-backup-companies'],
    queryFn: async () => {
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (!companiesData) return [];

      // Simular dados de backup (em produção viria do banco)
      return companiesData.map((c, i) => ({
        id: c.id,
        name: c.name,
        last_backup_at: i % 3 === 0 ? null : new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        total_backups: Math.floor(Math.random() * 30),
      })) as Company[];
    },
  });

  // Query para buscar backups de uma empresa
  const { data: backups, isLoading: loadingBackups, refetch: refetchBackups } = useQuery({
    queryKey: ['admin-company-backups', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany) return [];

      // Simular backups (em produção viria do banco)
      const mockBackups: Backup[] = [];
      for (let i = 0; i < 10; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        mockBackups.push({
          id: `backup-${i}`,
          company_id: selectedCompany.id,
          company_name: selectedCompany.name,
          backup_type: i === 0 ? 'manual' : 'automatic',
          status: 'completed',
          records_count: {
            transactions: Math.floor(Math.random() * 500) + 50,
            categories: Math.floor(Math.random() * 20) + 5,
            goals: Math.floor(Math.random() * 10),
            debts: Math.floor(Math.random() * 30),
          },
          created_at: date.toISOString(),
          expires_at: new Date(date.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          notes: i === 0 ? 'Backup manual pelo admin' : null,
        });
      }
      return mockBackups;
    },
    enabled: !!selectedCompany,
  });

  // Mutation para criar backup
  const createBackupMutation = useMutation({
    mutationFn: async ({ companyId, notes }: { companyId: string; notes: string }) => {
      // Em produção: chamar RPC create_company_backup
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-backup-companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-company-backups'] });
      setShowBackupModal(false);
      setBackupNotes('');
      Alert.alert('Sucesso', 'Backup criado com sucesso!');
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível criar o backup');
    },
  });

  // Mutation para restaurar backup
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      // Em produção: chamar RPC restore_company_backup
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true };
    },
    onSuccess: () => {
      setShowRestoreModal(false);
      setSelectedBackup(null);
      Alert.alert('Sucesso', 'Backup restaurado com sucesso!');
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível restaurar o backup');
    },
  });

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Formatar tempo relativo
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const diff = Date.now() - new Date(dateString).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days} dia${days > 1 ? 's' : ''} atrás`;
  };

  // Filtrar empresas
  const filteredCompanies = companies?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Empresas sem backup recente
  const companiesNeedingBackup = companies?.filter(c => {
    if (!c.last_backup_at) return true;
    const daysSinceBackup = (Date.now() - new Date(c.last_backup_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceBackup > 3;
  }) || [];

  // Estatísticas
  const stats = {
    totalCompanies: companies?.length || 0,
    withBackup: companies?.filter(c => c.last_backup_at).length || 0,
    needingBackup: companiesNeedingBackup.length,
    totalBackups: companies?.reduce((sum, c) => sum + c.total_backups, 0) || 0,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              refetchCompanies();
              if (selectedCompany) refetchBackups();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            ☁️ Backup Centralizado
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Gerencie backups de todas as empresas
          </Text>
        </View>

        {/* Estatísticas */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.primary + '20' }]}>
            <Text style={styles.statIcon}>🏢</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalCompanies}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Empresas</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.success + '20' }]}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.withBackup}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Com Backup</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.warning + '20' }]}>
            <Text style={styles.statIcon}>⚠️</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.needingBackup}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Precisam</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBg }]}>
            <Text style={styles.statIcon}>💾</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalBackups}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
        </View>

        {/* Alerta de empresas sem backup */}
        {companiesNeedingBackup.length > 0 && (
          <View style={[styles.alertCard, { backgroundColor: colors.warning + '10', borderColor: colors.warning }]}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: colors.text }]}>
                {companiesNeedingBackup.length} empresa{companiesNeedingBackup.length > 1 ? 's' : ''} sem backup recente
              </Text>
              <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
                Recomendamos backup diário para segurança dos dados
              </Text>
            </View>
          </View>
        )}

        {/* Busca */}
        <View style={[styles.searchContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar empresa..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Lista de Empresas */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📋 Empresas ({filteredCompanies.length})
          </Text>
          
          {loadingCompanies ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.companiesList}>
              {filteredCompanies.map((company) => {
                const needsBackup = !company.last_backup_at || 
                  (Date.now() - new Date(company.last_backup_at).getTime()) / (1000 * 60 * 60 * 24) > 3;
                
                return (
                  <TouchableOpacity
                    key={company.id}
                    style={[
                      styles.companyCard,
                      { 
                        backgroundColor: colors.cardBg, 
                        borderColor: selectedCompany?.id === company.id ? colors.primary : colors.border,
                        borderWidth: selectedCompany?.id === company.id ? 2 : 1,
                      }
                    ]}
                    onPress={() => setSelectedCompany(company)}
                  >
                    <View style={styles.companyHeader}>
                      <View style={styles.companyInfo}>
                        <Text style={[styles.companyName, { color: colors.text }]}>
                          {company.name}
                        </Text>
                        <Text style={[styles.companyBackupInfo, { color: needsBackup ? colors.warning : colors.success }]}>
                          {needsBackup ? '⚠️' : '✅'} Último backup: {formatRelativeTime(company.last_backup_at)}
                        </Text>
                      </View>
                      <View style={styles.companyActions}>
                        <TouchableOpacity
                          style={[styles.quickBackupBtn, { backgroundColor: colors.primary }]}
                          onPress={() => {
                            setSelectedCompany(company);
                            setShowBackupModal(true);
                          }}
                        >
                          <Text style={styles.quickBackupText}>💾</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.companyStats}>
                      <Text style={[styles.companyStat, { color: colors.textSecondary }]}>
                        {company.total_backups} backups armazenados
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Backups da Empresa Selecionada */}
        {selectedCompany && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                📦 Backups de {selectedCompany.name}
              </Text>
              <TouchableOpacity
                style={[styles.newBackupBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowBackupModal(true)}
              >
                <Text style={styles.newBackupText}>+ Novo Backup</Text>
              </TouchableOpacity>
            </View>
            
            {loadingBackups ? (
              <ActivityIndicator color={colors.primary} />
            ) : backups && backups.length > 0 ? (
              <View style={styles.backupsList}>
                {backups.map((backup) => (
                  <View
                    key={backup.id}
                    style={[styles.backupCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                  >
                    <View style={styles.backupHeader}>
                      <View style={styles.backupInfo}>
                        <Text style={[styles.backupDate, { color: colors.text }]}>
                          {formatDate(backup.created_at)}
                        </Text>
                        <View style={[
                          styles.backupTypeBadge, 
                          { backgroundColor: backup.backup_type === 'automatic' ? colors.success + '20' : colors.primary + '20' }
                        ]}>
                          <Text style={[
                            styles.backupTypeText, 
                            { color: backup.backup_type === 'automatic' ? colors.success : colors.primary }
                          ]}>
                            {backup.backup_type === 'automatic' ? '🤖 Automático' : '👤 Manual'}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.restoreBtn, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}
                        onPress={() => {
                          setSelectedBackup(backup);
                          setShowRestoreModal(true);
                        }}
                      >
                        <Text style={[styles.restoreBtnText, { color: colors.warning }]}>Restaurar</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.backupRecords}>
                      <Text style={[styles.recordItem, { color: colors.textSecondary }]}>
                        📝 {backup.records_count.transactions} transações
                      </Text>
                      <Text style={[styles.recordItem, { color: colors.textSecondary }]}>
                        🏷️ {backup.records_count.categories} categorias
                      </Text>
                      <Text style={[styles.recordItem, { color: colors.textSecondary }]}>
                        🎯 {backup.records_count.goals} metas
                      </Text>
                      <Text style={[styles.recordItem, { color: colors.textSecondary }]}>
                        💳 {backup.records_count.debts} débitos
                      </Text>
                    </View>
                    
                    {backup.notes && (
                      <Text style={[styles.backupNotes, { color: colors.textSecondary }]}>
                        📌 {backup.notes}
                      </Text>
                    )}
                    
                    <Text style={[styles.backupExpiry, { color: colors.textSecondary }]}>
                      Expira em: {formatDate(backup.expires_at)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.cardBg }]}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhum backup encontrado
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Criar Backup */}
      <Modal
        visible={showBackupModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBackupModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowBackupModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.danger }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Criar Backup</Text>
            <TouchableOpacity 
              onPress={() => selectedCompany && createBackupMutation.mutate({ companyId: selectedCompany.id, notes: backupNotes })}
              disabled={createBackupMutation.isPending}
            >
              <Text style={[styles.modalSave, { color: colors.primary }]}>
                {createBackupMutation.isPending ? 'Criando...' : 'Criar'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={[styles.modalInfo, { backgroundColor: colors.cardBg }]}>
              <Text style={styles.modalInfoIcon}>🏢</Text>
              <Text style={[styles.modalInfoText, { color: colors.text }]}>
                {selectedCompany?.name}
              </Text>
            </View>

            <Text style={[styles.formLabel, { color: colors.text }]}>Notas (opcional)</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
              value={backupNotes}
              onChangeText={setBackupNotes}
              placeholder="Ex: Backup antes de migração..."
              placeholderTextColor={colors.textSecondary}
              multiline
            />

            <View style={[styles.modalWarning, { backgroundColor: colors.primary + '10' }]}>
              <Text style={styles.modalWarningIcon}>ℹ️</Text>
              <Text style={[styles.modalWarningText, { color: colors.textSecondary }]}>
                O backup incluirá todas as transações, categorias, metas e débitos da empresa.
                Backups são mantidos por 90 dias.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Restaurar Backup */}
      <Modal
        visible={showRestoreModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRestoreModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowRestoreModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Restaurar Backup</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.modalContent}>
            <View style={[styles.modalWarning, { backgroundColor: colors.danger + '10' }]}>
              <Text style={styles.modalWarningIcon}>⚠️</Text>
              <Text style={[styles.modalWarningText, { color: colors.danger }]}>
                ATENÇÃO: Esta ação irá substituir todos os dados atuais da empresa pelos dados do backup.
                Um backup automático será criado antes da restauração.
              </Text>
            </View>

            {selectedBackup && (
              <View style={[styles.restoreInfo, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.restoreInfoTitle, { color: colors.text }]}>
                  Backup de {formatDate(selectedBackup.created_at)}
                </Text>
                <View style={styles.restoreRecords}>
                  <Text style={[styles.restoreRecord, { color: colors.textSecondary }]}>
                    📝 {selectedBackup.records_count.transactions} transações
                  </Text>
                  <Text style={[styles.restoreRecord, { color: colors.textSecondary }]}>
                    🏷️ {selectedBackup.records_count.categories} categorias
                  </Text>
                  <Text style={[styles.restoreRecord, { color: colors.textSecondary }]}>
                    🎯 {selectedBackup.records_count.goals} metas
                  </Text>
                  <Text style={[styles.restoreRecord, { color: colors.textSecondary }]}>
                    💳 {selectedBackup.records_count.debts} débitos
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.restoreConfirmBtn, { backgroundColor: colors.danger }]}
              onPress={() => selectedBackup && restoreBackupMutation.mutate(selectedBackup.id)}
              disabled={restoreBackupMutation.isPending}
            >
              {restoreBackupMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.restoreConfirmText}>🔄 Confirmar Restauração</Text>
              )}
            </TouchableOpacity>
          </View>
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
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertDesc: {
    fontSize: 12,
    marginTop: 2,
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
  newBackupBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newBackupText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  companiesList: {
    gap: 10,
  },
  companyCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '700',
  },
  companyBackupInfo: {
    fontSize: 12,
    marginTop: 4,
  },
  companyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBackupBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickBackupText: {
    fontSize: 16,
  },
  companyStats: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  companyStat: {
    fontSize: 12,
  },
  backupsList: {
    gap: 10,
  },
  backupCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  backupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backupInfo: {
    flex: 1,
  },
  backupDate: {
    fontSize: 14,
    fontWeight: '700',
  },
  backupTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  backupTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  restoreBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  backupRecords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  recordItem: {
    fontSize: 11,
  },
  backupNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  backupExpiry: {
    fontSize: 10,
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
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalInfoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  modalInfoText: {
    fontSize: 16,
    fontWeight: '700',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalWarning: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalWarningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  modalWarningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  restoreInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  restoreInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  restoreRecords: {
    gap: 6,
  },
  restoreRecord: {
    fontSize: 13,
  },
  restoreConfirmBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  restoreConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
