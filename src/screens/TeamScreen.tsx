import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentCompanyId } from '../lib/company';
import { useToast } from '../ui/ToastProvider';

interface TeamMember {
  id: string;
  company_id: string;
  email: string;
  name: string;
  role_key: string;
  role_name: string;
  status: 'pending' | 'active' | 'suspended';
  phone?: string;
  notes?: string;
  last_access_at: string | null;
  invited_at: string;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const ROLE_CONFIG: Record<string, { icon: string; color: string }> = {
  owner: { icon: '👑', color: '#F59E0B' },
  manager: { icon: '👔', color: '#3B82F6' },
  accountant: { icon: '📊', color: '#8B5CF6' },
  viewer: { icon: '👁️', color: '#6B7280' },
};

// Roles disponíveis (fixos)
const AVAILABLE_ROLES: UserRole[] = [
  { key: 'owner', name: 'Proprietário', icon: '👑', color: '#F59E0B', description: 'Acesso total ao sistema' },
  { key: 'manager', name: 'Gerente', icon: '👔', color: '#3B82F6', description: 'Pode criar e editar lançamentos' },
  { key: 'accountant', name: 'Contador', icon: '📊', color: '#8B5CF6', description: 'Visualiza relatórios e exporta dados' },
  { key: 'viewer', name: 'Visualizador', icon: '👁️', color: '#6B7280', description: 'Apenas visualização' },
];

export default function TeamScreen() {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [companyId, setCompanyId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState('viewer');
  const [formNotes, setFormNotes] = useState('');

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

  // Carregar company_id
  useEffect(() => {
    (async () => {
      const id = await getCurrentCompanyId();
      if (id) setCompanyId(id);
    })();
  }, []);

  // Query para buscar membros da equipe do Supabase
  const { data: members = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['team-members', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Erro ao buscar membros:', error);
        throw error;
      }
      return (data || []) as TeamMember[];
    },
  });

  // Mutation para adicionar membro
  const addMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone?: string; role_key: string; role_name: string; notes?: string }) => {
      const { error } = await supabase
        .from('team_members')
        .insert({
          company_id: companyId,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          role_key: data.role_key,
          role_name: data.role_name,
          notes: data.notes || null,
          status: 'active',
        });
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', companyId] });
      setShowAddModal(false);
      resetForm();
      toast.show('✅ Membro adicionado com sucesso!', 'success');
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar membro:', error);
      toast.show('Erro ao adicionar membro: ' + error.message, 'error');
    },
  });

  // Mutation para atualizar membro
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; email: string; phone?: string; role_key: string; role_name: string; notes?: string }) => {
      const { error } = await supabase
        .from('team_members')
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          role_key: data.role_key,
          role_name: data.role_name,
          notes: data.notes || null,
        })
        .eq('id', data.id)
        .eq('company_id', companyId);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', companyId] });
      setShowEditModal(false);
      setSelectedMember(null);
      resetForm();
      toast.show('✅ Membro atualizado com sucesso!', 'success');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar membro:', error);
      toast.show('Erro ao atualizar membro: ' + error.message, 'error');
    },
  });

  // Mutation para remover membro (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('team_members')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', memberId)
        .eq('company_id', companyId);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', companyId] });
      setShowDeleteModal(false);
      setSelectedMember(null);
      toast.show('✅ Membro removido com sucesso!', 'success');
    },
    onError: (error: any) => {
      console.error('Erro ao remover membro:', error);
      toast.show('Erro ao remover membro: ' + error.message, 'error');
    },
  });

  // Reset form
  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('viewer');
    setFormNotes('');
  };

  // Abrir modal de edição
  const openEditModal = (member: TeamMember) => {
    setSelectedMember(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormPhone(member.phone || '');
    setFormRole(member.role_key);
    setFormNotes(member.notes || '');
    setShowEditModal(true);
  };

  // Abrir modal de exclusão
  const openDeleteModal = (member: TeamMember) => {
    setSelectedMember(member);
    setShowDeleteModal(true);
  };

  // Submeter formulário de adição
  const handleAdd = () => {
    if (!formName.trim()) {
      toast.show('Por favor, informe o nome', 'error');
      return;
    }
    if (!formEmail.trim()) {
      toast.show('Por favor, informe o email', 'error');
      return;
    }
    
    const role = AVAILABLE_ROLES.find(r => r.key === formRole);
    addMutation.mutate({
      name: formName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim() || undefined,
      role_key: formRole,
      role_name: role?.name || 'Visualizador',
      notes: formNotes.trim() || undefined,
    });
  };

  // Submeter formulário de edição
  const handleUpdate = () => {
    if (!selectedMember) return;
    if (!formName.trim()) {
      toast.show('Por favor, informe o nome', 'error');
      return;
    }
    if (!formEmail.trim()) {
      toast.show('Por favor, informe o email', 'error');
      return;
    }
    
    const role = AVAILABLE_ROLES.find(r => r.key === formRole);
    updateMutation.mutate({
      id: selectedMember.id,
      name: formName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim() || undefined,
      role_key: formRole,
      role_name: role?.name || 'Visualizador',
      notes: formNotes.trim() || undefined,
    });
  };

  // Confirmar exclusão
  const handleDelete = () => {
    if (!selectedMember) return;
    deleteMutation.mutate(selectedMember.id);
  };

  // Formatar data
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    
    return date.toLocaleDateString('pt-BR');
  };

  // Contadores
  const memberCounts = {
    total: members.length,
    active: members.filter(m => m.status === 'active').length,
    pending: members.filter(m => m.status === 'pending').length,
  };

  // Renderizar formulário (usado em adicionar e editar)
  const renderForm = (isEdit: boolean) => (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={[styles.formLabel, { color: colors.text }]}>Nome *</Text>
        <TextInput
          style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
          value={formName}
          onChangeText={setFormName}
          placeholder="Nome do membro"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View>
        <Text style={[styles.formLabel, { color: colors.text }]}>Email *</Text>
        <TextInput
          style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
          value={formEmail}
          onChangeText={setFormEmail}
          placeholder="email@exemplo.com"
          placeholderTextColor={colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View>
        <Text style={[styles.formLabel, { color: colors.text }]}>Telefone</Text>
        <TextInput
          style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
          value={formPhone}
          onChangeText={setFormPhone}
          placeholder="(00) 00000-0000"
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
        />
      </View>

      <View>
        <Text style={[styles.formLabel, { color: colors.text }]}>Perfil de Acesso</Text>
        <View style={styles.roleOptions}>
          {AVAILABLE_ROLES.map((role) => {
            const isSelected = formRole === role.key;
            return (
              <TouchableOpacity
                key={role.key}
                style={[
                  styles.roleOption,
                  { 
                    backgroundColor: isSelected ? role.color + '20' : colors.cardBg,
                    borderColor: isSelected ? role.color : colors.border,
                  }
                ]}
                onPress={() => setFormRole(role.key)}
              >
                <Text style={styles.roleOptionIcon}>{role.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleOptionName, { color: colors.text }]}>{role.name}</Text>
                  <Text style={[styles.roleOptionDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    {role.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={[styles.formLabel, { color: colors.text }]}>Observações</Text>
        <TextInput
          style={[styles.formInput, styles.formTextArea, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
          value={formNotes}
          onChangeText={setFormNotes}
          placeholder="Observações adicionais..."
          placeholderTextColor={colors.textSecondary}
          multiline
        />
      </View>
    </View>
  );

  // Renderizar botões de ação (separados do formulário)
  const renderFormActions = (isEdit: boolean) => (
    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.border }]}
        onPress={() => {
          if (isEdit) {
            setShowEditModal(false);
            setSelectedMember(null);
          } else {
            setShowAddModal(false);
          }
          resetForm();
        }}
      >
        <Text style={[styles.buttonText, { color: colors.text }]}>Cancelar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary, flex: 1 }]}
        onPress={isEdit ? handleUpdate : handleAdd}
        disabled={isEdit ? updateMutation.isPending : addMutation.isPending}
      >
        <Text style={styles.buttonText}>
          {(isEdit ? updateMutation.isPending : addMutation.isPending) ? 'Salvando...' : 'Salvar'}
        </Text>
      </TouchableOpacity>
    </View>
  );

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
        <View style={[styles.header, { alignItems: 'center' }]}>
          <Text style={[styles.headerTitle, { color: isDark ? theme.primary : theme.negative, textAlign: 'center' }]}>
            👥 Minha Equipe
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }]}>
            Gerencie os membros da sua empresa
          </Text>
          <TouchableOpacity
            style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Text style={styles.inviteBtnText}>+ Adicionar Membro</Text>
          </TouchableOpacity>
        </View>

        {/* Resumo */}
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{memberCounts.total}</Text>
              <Text style={styles.summaryLabel}>Membros</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{memberCounts.active}</Text>
              <Text style={styles.summaryLabel}>Ativos</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{memberCounts.pending}</Text>
              <Text style={styles.summaryLabel}>Pendentes</Text>
            </View>
          </View>
        </View>

        {/* Lista de Membros */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📋 Membros da Equipe
          </Text>
          
          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : members.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>👥</Text>
              <Text style={[styles.emptyText, { color: colors.text }]}>Nenhum membro cadastrado</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Adicione membros da sua equipe clicando no botão acima
              </Text>
            </View>
          ) : (
            <View style={styles.membersList}>
              {members.map((member) => {
                const roleConfig = ROLE_CONFIG[member.role_key] || { icon: '👤', color: colors.textSecondary };
                const isPending = member.status === 'pending';
                
                return (
                  <View
                    key={member.id}
                    style={[
                      styles.memberCard,
                      { 
                        backgroundColor: colors.cardBg, 
                        borderColor: colors.border,
                        opacity: isPending ? 0.7 : 1,
                      }
                    ]}
                  >
                    <View style={styles.memberHeader}>
                      <View style={[styles.memberAvatar, { backgroundColor: roleConfig.color + '20' }]}>
                        <Text style={styles.memberAvatarText}>{roleConfig.icon}</Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={[styles.memberName, { color: colors.text }]}>
                          {member.name}
                        </Text>
                        <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>
                          {member.email}
                        </Text>
                        {member.phone && (
                          <Text style={[styles.memberPhone, { color: colors.textSecondary }]}>
                            📞 {member.phone}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.memberFooter}>
                      <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '20' }]}>
                        <Text style={[styles.roleText, { color: roleConfig.color }]}>
                          {member.role_name}
                        </Text>
                      </View>
                      <Text style={[styles.memberAccess, { color: colors.textSecondary }]}>
                        Adicionado: {formatDate(member.created_at)}
                      </Text>
                    </View>

                    {/* Botões de ação */}
                    <View style={styles.memberActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => openEditModal(member)}
                      >
                        <Text style={styles.actionBtnText}>✏️ Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                        onPress={() => openDeleteModal(member)}
                      >
                        <Text style={styles.actionBtnText}>🗑️ Excluir</Text>
                      </TouchableOpacity>
                    </View>

                    {member.notes && (
                      <Text style={[styles.memberNotes, { color: colors.textSecondary }]}>
                        📝 {member.notes}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Perfis Disponíveis */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🎭 Perfis de Acesso Disponíveis
          </Text>
          
          <View style={styles.rolesList}>
            {AVAILABLE_ROLES.map((role) => (
              <View
                key={role.key}
                style={[styles.roleCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              >
                <View style={styles.roleHeader}>
                  <View style={[styles.roleIcon, { backgroundColor: role.color + '20' }]}>
                    <Text style={styles.roleIconText}>{role.icon}</Text>
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={[styles.roleName, { color: colors.text }]}>
                      {role.name}
                    </Text>
                    <Text style={[styles.roleDesc, { color: colors.textSecondary }]}>
                      {role.description}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Adicionar */}
      {showAddModal && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>➕ Adicionar Membro</Text>
            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={true}>
              {renderForm(false)}
            </ScrollView>
            {renderFormActions(false)}
          </View>
        </View>
      )}

      {/* Modal de Editar */}
      {showEditModal && selectedMember && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>✏️ Editar Membro</Text>
            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={true}>
              {renderForm(true)}
            </ScrollView>
            {renderFormActions(true)}
          </View>
        </View>
      )}

      {/* Modal de Confirmar Exclusão */}
      {showDeleteModal && selectedMember && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg, maxWidth: 400 }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>🗑️ Excluir Membro</Text>
            <Text style={[styles.modalMessage, { color: colors.text }]}>
              Deseja realmente excluir <Text style={{ fontWeight: '700' }}>{selectedMember.name}</Text> da equipe?
            </Text>
            <Text style={[styles.modalSubMessage, { color: colors.textSecondary }]}>
              Esta ação não pode ser desfeita.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setSelectedMember(null);
                }}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.danger, flex: 1 }]}
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Text style={styles.buttonText}>
                  {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  inviteBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  inviteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
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
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 22,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
  },
  memberEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  memberPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  memberFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  memberAccess: {
    fontSize: 11,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  memberNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  rolesList: {
    gap: 10,
  },
  roleCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleIconText: {
    fontSize: 18,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '700',
  },
  roleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    flexDirection: 'column',
  },
  modalScrollContent: {
    flex: 1,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubMessage: {
    fontSize: 13,
    textAlign: 'center',
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
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  roleOptions: {
    gap: 8,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleOptionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  roleOptionName: {
    fontSize: 13,
    fontWeight: '700',
  },
  roleOptionDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
