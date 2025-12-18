import React from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet, useWindowDimensions, Platform, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { useToast } from '../../ui/ToastProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { supabase } from '../../lib/supabase';

interface Company {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  plan_price: number;
  discount_percent: number;
  blocked: boolean;
  trial_days: number;
  trial_start: string;
  trial_end: string;
  created_at: string;
  logo_url?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  status?: string;
  segment?: string;
}

type TabType = 'active' | 'deleted';

// Função para formatar o nome da empresa com o segmento
function getCompanyDisplayName(company: Company): string {
  const segmentMap: { [key: string]: string } = {
    'lanchonete': 'Lanchonete',
    'servicos': 'Serviços',
    'doceria': 'Doceria',
    'outros': 'Outros'
  };
  
  const segment = company.segment ? segmentMap[company.segment] || company.segment : null;
  return segment ? `${company.name} - ${segment}` : company.name;
}

// Supabase repository functions
async function getCompanies(tab: TabType = 'active'): Promise<Company[]> {
  // Usar '*' para evitar erro se o schema tiver colunas diferentes
  let query = supabase.from('companies').select('*');
  
  if (tab === 'active') {
    // Empresas ativas: deleted_at é NULL
    query = query.is('deleted_at', null);
  } else {
    // Empresas excluídas: deleted_at não é NULL
    query = query.not('deleted_at', 'is', null);
  }
  
  const all = await query.order('created_at', { ascending: true });
  if (all.error) {
    console.warn('Supabase companies error:', all.error);
  }
  let list: any[] = (all.data as any) || [];

  // Tratar presença de FastSavorys conforme a aba
  const idx = list.findIndex(
    (c) => (c?.name || '').toLowerCase() === 'fastsavorys' || (c?.username || '').toLowerCase() === 'fastsavorys'
  );
  if (tab === 'active') {
    // Garantir FastSavorys sempre como item 1 nas ativas
    const now = new Date().toISOString();
    if (idx === -1) {
      list = [
        {
          id: 'local-fastsavorys',
          name: 'FastSavorys',
          username: 'fastsavorys',
          email: 'contato@fastsavorys.com',
          phone: '',
          plan_price: 0,
          discount_percent: 0,
          blocked: false,
          trial_days: 30,
          trial_start: now,
          trial_end: now,
          created_at: now,
          logo_url: null,
        },
        ...list,
      ] as any[];
    } else if (idx > 0) {
      const [fs] = list.splice(idx, 1);
      list.unshift(fs);
    }
  } else {
    // Nunca mostrar FastSavorys nas excluídas
    list = list.filter(
      (c) => (c?.name || '').toLowerCase() !== 'fastsavorys' && (c?.username || '').toLowerCase() !== 'fastsavorys'
    );
  }
  // Remover a empresa matriz Fast Cash Flow da lista administrativa
  list = list.filter((c) => {
    const rawName = (c?.name || c?.username || '').toLowerCase();
    const rawUser = (c?.username || '').toLowerCase();
    const isAdminCompany =
      rawName === 'fast cash flow' ||
      rawName === 'fastcashflow' ||
      rawUser === 'fastcashflow';
    return !isAdminCompany;
  });
  return list as Company[];
}

async function updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error; return data as any;
}

async function blockCompany(id: string): Promise<void> {
  const { error } = await supabase.from('companies').update({ blocked: true }).eq('id', id);
  if (error) throw error;
}

async function unblockCompany(id: string): Promise<void> {
  const { error } = await supabase.from('companies').update({ blocked: false }).eq('id', id);
  if (error) throw error;
}

async function softDeleteCompany(id: string): Promise<void> {
  console.log('🗑️ Iniciando soft delete da empresa:', id);
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const adminEmail = sessionData?.session?.user?.email || 'admin@fastcashflow.com';
    
    console.log('👤 Usuário autenticado:', adminEmail);
    
    // Usar RPC function para soft delete
    const { data, error } = await supabase.rpc('soft_delete_company', { 
      target_company_id: id,
      admin_email: adminEmail
    });
    
    console.log('📡 Resposta do RPC:', { data, error });
    
    if (error) {
      console.error('❌ Erro ao excluir empresa:', error);
      throw new Error(error.message || 'Erro ao excluir empresa');
    }
    
    console.log('✅ Empresa marcada como excluída!');
  } catch (err: any) {
    console.error('❌ Exceção ao excluir:', err);
    throw err;
  }
}

async function reactivateCompany(id: string): Promise<void> {
  console.log('♻️ Reativando empresa:', id);
  
  try {
    const { data, error } = await supabase.rpc('reactivate_company', { 
      target_company_id: id
    });
    
    if (error) {
      console.error('❌ Erro ao reativar empresa:', error);
      throw new Error(error.message || 'Erro ao reativar empresa');
    }
    
    console.log('✅ Empresa reativada com sucesso!');
  } catch (err: any) {
    console.error('❌ Exceção ao reativar:', err);
    throw err;
  }
}

export default function AdminCompaniesScreen() {
  const qc = useQueryClient();
  const { theme, mode } = useThemeCtx();
  const inputBg = mode === 'dark' ? '#6b7280' : '#d1d5db';
  const inputBorder = mode === 'dark' ? '#374151' : '#9ca3af';
  const toast = useToast();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 1024;

  const [activeTab, setActiveTab] = React.useState<TabType>('active');
  const [editVisible, setEditVisible] = React.useState(false);
  const [editing, setEditing] = React.useState<Company | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = React.useState(false);
  const [companyToDelete, setCompanyToDelete] = React.useState<Company | null>(null);
  const [confirmReactivateVisible, setConfirmReactivateVisible] = React.useState(false);
  const [companyToReactivate, setCompanyToReactivate] = React.useState<Company | null>(null);
  const [formData, setFormData] = React.useState({
    username: '',
    email: '',
    phone: '',
    plan_price: '',
    discount_percent: '',
    temp_password: '',
    logo_url: '',
  });
  const [showTempPass, setShowTempPass] = React.useState(false);

  const companiesQuery = useQuery({
    queryKey: ['admin-companies', activeTab],
    queryFn: () => getCompanies(activeTab),
    initialData: [],
  });
  React.useEffect(() => {
    if (companiesQuery.error) {
      console.error('AdminCompaniesScreen query error:', companiesQuery.error);
    }
  }, [companiesQuery.error]);
  console.log('AdminCompaniesScreen: companiesQuery.data', companiesQuery.data);

  // Garante que algo apareça mesmo se o Supabase bloquear por RLS ou estiver vazio
  const companies: Company[] = React.useMemo(() => {
    const data = (companiesQuery.data as Company[]) || [];
    if (data.length > 0) return data;
    const now = new Date().toISOString();
    return [{
      id: 'local-fastsavorys',
      name: 'fastsavorys',
      username: 'fastsavorys',
      email: 'contato@fastsavorys.com',
      phone: '',
      plan_price: 0,
      discount_percent: 0,
      blocked: false,
      trial_days: 30,
      trial_start: now,
      trial_end: now,
      created_at: now,
      logo_url: null,
    } as any];
  }, [companiesQuery.data]);

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Company> }) => updateCompany(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      setEditVisible(false);
      setEditing(null);
      toast.show('Empresa atualizada', 'success');
    },
    onError: () => toast.show('Erro ao atualizar empresa', 'error'),
  });

  const blockMut = useMutation({
    mutationFn: blockCompany,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      toast.show('Empresa bloqueada', 'success');
    },
    onError: () => toast.show('Erro ao bloquear empresa', 'error'),
  });

  const unblockMut = useMutation({
    mutationFn: unblockCompany,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      toast.show('Empresa desbloqueada', 'success');
    },
    onError: () => toast.show('Erro ao desbloquear empresa', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: softDeleteCompany,
    onSuccess: () => {
      console.log('✅ Mutation onSuccess - invalidando queries');
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      toast.show('Empresa excluída! Será removida permanentemente em 90 dias.', 'success');
    },
    onError: (error: any) => {
      console.error('❌ Mutation onError:', error);
      toast.show(`Erro ao excluir empresa: ${error?.message || 'Erro desconhecido'}`, 'error');
    },
  });

  const reactivateMut = useMutation({
    mutationFn: reactivateCompany,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      toast.show('Empresa reativada com sucesso!', 'success');
    },
    onError: (error: any) => {
      toast.show(`Erro ao reativar empresa: ${error?.message || 'Erro desconhecido'}`, 'error');
    },
  });

  // Mutation para ativar assinatura manualmente
  const activateSubscriptionMut = useMutation({
    mutationFn: async ({ companyId }: { companyId: string }) => {
      const { data, error } = await supabase
        .from('companies')
        .update({ 
          status: 'active',
          trial_end: null
        })
        .eq('id', companyId)
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      toast.show('Assinatura ativada manualmente!', 'success');
    },
    onError: (error: any) => {
      toast.show(`Erro ao ativar assinatura: ${error?.message || 'Erro desconhecido'}`, 'error');
    },
  });

  // Mutation para voltar para trial (apenas para testes)
  const backToTrialMut = useMutation({
    mutationFn: async ({ companyId, days }: { companyId: string; days: number }) => {
      const { data, error } = await supabase
        .from('companies')
        .update({ 
          status: 'trial',
          trial_end: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', companyId)
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      toast.show('Empresa voltou para período de teste!', 'success');
    },
    onError: (error: any) => {
      toast.show(`Erro ao voltar para trial: ${error?.message || 'Erro desconhecido'}`, 'error');
    },
  });

  const openEdit = (company: Company) => {
    setEditing(company);
    setFormData({
      username: company.username,
      email: company.email,
      phone: company.phone,
      plan_price: company.plan_price.toString(),
      discount_percent: company.discount_percent.toString(),
      temp_password: '',
      logo_url: (company as any).logo_url || '',
    });
    setEditVisible(true);
  };

  const handleUpdate = async () => {
    if (!editing) return;
    
    // Verificar se há período grátis para adicionar
    const freeDays = parseInt((formData as any).free_days || '0', 10);
    const freeMonths = parseInt((formData as any).free_months || '0', 10);
    const freeYears = parseInt((formData as any).free_years || '0', 10);
    
    // Atualizar senha provisória se fornecida
    if (formData.temp_password && formData.temp_password.trim()) {
      try {
        console.log('🔑 Atualizando senha para:', formData.username);
        
        // Buscar ou criar registro em company_requests
        const { data: existingReq, error: searchError } = await supabase
          .from('company_requests')
          .select('id')
          .eq('approved_company_id', editing.id)
          .maybeSingle();
        
        if (existingReq) {
          // Atualizar registro existente
          const { error: updateError } = await supabase
            .from('company_requests')
            .update({ 
              temp_password: formData.temp_password,
              approved_username: formData.username,
              status: 'approved'
            })
            .eq('id', existingReq.id);
          
          if (updateError) {
            console.error('❌ Erro ao atualizar senha:', updateError);
            toast.show('Erro ao atualizar senha', 'error');
            return;
          }
        } else {
          // Criar novo registro
          const { error: insertError } = await supabase
            .from('company_requests')
            .insert({
              company_name: editing.name,
              owner_name: editing.name, // Campo obrigatório
              phone: formData.phone || '',
              email: formData.email || '',
              address: '',
              cnpj: '',
              approved: true,
              status: 'approved',
              approved_company_id: editing.id,
              approved_username: formData.username,
              temp_password: formData.temp_password,
              approved_at: new Date().toISOString()
            });
          
          if (insertError) {
            console.error('❌ Erro ao criar registro de senha:', insertError);
            toast.show('Erro ao criar credenciais', 'error');
            return;
          }
        }
        
        console.log('✅ Senha atualizada com sucesso!');
        toast.show(`Acesso liberado! Usuário: ${formData.username} | Senha: ${formData.temp_password}`, 'success');
      } catch (err) {
        console.error('❌ Erro ao processar senha:', err);
        toast.show('Erro ao processar senha', 'error');
        return;
      }
    }
    
    if (freeDays > 0 || freeMonths > 0 || freeYears > 0) {
      // Adicionar período grátis usando a mutation backToTrialMut
      const totalDays = freeDays + (freeMonths * 30) + (freeYears * 365);
      backToTrialMut.mutate({
        companyId: editing.id,
        days: totalDays
      });
    } else {
      // Atualização normal sem período grátis
      const updates: Partial<Company> = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        plan_price: parseFloat(formData.plan_price) || 0,
        discount_percent: parseFloat(formData.discount_percent) || 0,
      };
      if ((formData as any).logo_url !== undefined) (updates as any).logo_url = (formData as any).logo_url || null;
      updateMut.mutate({ id: editing.id, updates });
    }
  };

  const handleDeleteClick = (company: Company) => {
    setCompanyToDelete(company);
    setConfirmDeleteVisible(true);
  };

  const handleReactivateClick = (company: Company) => {
    setCompanyToReactivate(company);
    setConfirmReactivateVisible(true);
  };

  const confirmDelete = () => {
    if (companyToDelete) {
      deleteMut.mutate(companyToDelete.id);
      setConfirmDeleteVisible(false);
      setCompanyToDelete(null);
    }
  };

  const confirmReactivate = () => {
    if (companyToReactivate) {
      reactivateMut.mutate(companyToReactivate.id);
      setConfirmReactivateVisible(false);
      setCompanyToReactivate(null);
    }
  };

  const renderCompany = ({ item, index }: { item: Company; index: number }) => {
    const finalPrice = item.plan_price * (1 - item.discount_percent / 100);
    const isDeleted = activeTab === 'deleted';
    const daysUntilPermanentDelete = item.deleted_at 
      ? Math.max(0, 90 - Math.floor((Date.now() - new Date(item.deleted_at).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    // Trial remaining based on trial_end relative to today
    const today = new Date();
    const trialEnd = item.trial_end ? new Date(item.trial_end) : null;
    const trialStart = item.trial_start ? new Date(item.trial_start) : null;
    const trialDaysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - new Date(today.toDateString()).getTime()) / (1000*60*60*24))) : 0;
    const addrName = (item.name || item.username || '').toLowerCase();
    const showTrial = addrName !== 'fastsavorys' && !isDeleted && !!trialEnd;

    const appDefaultLogo = 'https://i.im.ge/2025/11/03/nH0whJ.Logo-Black.png';
    const fastSavorysLogo = 'https://i.im.ge/2025/10/26/nV1mA6.fast-logo.png';
    const isFastSavorys = addrName === 'fastsavorys';
    const effectiveLogoUrl = (item as any).logo_url || (isFastSavorys ? fastSavorysLogo : appDefaultLogo);

    return (
      <View style={[styles.companyCard, { backgroundColor: theme.card, borderColor: isDeleted ? theme.negative : theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.companyName, { color: theme.text }]}>{`${index + 1}. ${getCompanyDisplayName(item)}`}</Text>
          {isDeleted && (
            <Text style={{ color: theme.negative, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
              🗑️ Excluída em {new Date(item.deleted_at!).toLocaleDateString('pt-BR')} • Será removida em {daysUntilPermanentDelete} dias
            </Text>
          )}
          {effectiveLogoUrl ? (
            <View style={{ width: 96, height: 48, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, marginBottom: 6 }}>
              {/* @ts-ignore */}
              <img src={effectiveLogoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#111' }} />
            </View>
          ) : null}
          <Text style={[styles.companyInfo, { color: theme.textSecondary }]}>Usuário: {item.username}</Text>
          <Text style={[styles.companyInfo, { color: theme.textSecondary }]}>Email: {item.email}</Text>
          <Text style={[styles.companyInfo, { color: theme.textSecondary }]}>Telefone: {item.phone}</Text>
          {!!(item as any).logo_url && (
            <Text style={[styles.companyInfo, { color: theme.textSecondary }]}>Logo: {(item as any).logo_url}</Text>
          )}
          <View style={styles.planInfo}>
            <Text style={{ color: theme.text }}>
              {(item.name || item.username).toLowerCase() === 'fastsavorys' ? 'Plano: Vitalício' : 'Plano: Mensal'}
            </Text>
            <Text style={{ color: '#16A34A', fontWeight: '700' }}>
              Final: R$ {finalPrice.toFixed(2)}
            </Text>
          </View>
          {!isDeleted && (
            <>
              {showTrial ? (
                <>
                  <Text style={{ color: theme.text, fontSize: 12 }}>
                    Aprovada em {trialStart ? trialStart.toLocaleDateString('pt-BR') : '-'}
                  </Text>
                  <Text style={{ color: theme.text, fontSize: 12 }}>
                    Teste Grátis: {trialDaysRemaining} dia{trialDaysRemaining === 1 ? '' : 's'} restantes
                  </Text>
                </>
              ) : null}
              {/* Status da empresa (trial, active, expired, blocked) */}
              <Text style={{ 
                color: item.status === 'active' ? '#16A34A' : 
                       item.status === 'trial' ? '#2563EB' : 
                       item.status === 'expired' || item.status === 'blocked' ? '#D90429' : '#888', 
                fontSize: 12, 
                fontWeight: '700' 
              }}>
                Status: {item.status?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </>
          )}
        </View>
        <View style={styles.companyActions}>
          {isDeleted ? (
            // Botões para empresas excluídas
            <>
              <TouchableOpacity onPress={() => openEdit(item)} style={[styles.actionButton, { backgroundColor: '#0ea5e9' }]}>
                <Text style={styles.actionButtonText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleReactivateClick(item)}
                style={[styles.actionButton, { backgroundColor: '#16A34A' }]}
              >
                <Text style={styles.actionButtonText}>♻️ Reativar</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Botões para empresas ativas
            <>
              <TouchableOpacity onPress={() => openEdit(item)} style={[styles.actionButton, { backgroundColor: '#0ea5e9' }]}>
                <Text style={styles.actionButtonText}>Editar</Text>
              </TouchableOpacity>
              
              {/* Botão para ativar assinatura manualmente */}
              {item.status !== 'active' && item.id !== 'local-fastsavorys' && (
                <TouchableOpacity
                  onPress={() => activateSubscriptionMut.mutate({ companyId: item.id })}
                  style={[styles.actionButton, { backgroundColor: '#16A34A' }]}
                >
                  <Text style={styles.actionButtonText}>💰 Ativar Assinatura</Text>
                </TouchableOpacity>
              )}
              
              {/* Botão para voltar para trial (apenas FastSavorys) */}
              {item.status === 'active' && (item.name || item.username || '').toLowerCase() === 'fastsavorys' && (
                <TouchableOpacity
                  onPress={() => backToTrialMut.mutate({ companyId: item.id, days: 30 })}
                  style={[styles.actionButton, { backgroundColor: '#FFC300' }]}
                >
                  <Text style={styles.actionButtonText}>🔄 Voltar para Trial</Text>
                </TouchableOpacity>
              )}
              
              {item.id !== 'local-fastsavorys' && (
                <TouchableOpacity
                  onPress={() => handleDeleteClick(item)}
                  style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                >
                  <Text style={styles.actionButtonText}>Excluir</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80, padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.text }]}>Empresas Cadastradas</Text>
        
        {/* Abas Ativas / Excluídas */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity 
            onPress={() => setActiveTab('active')}
            style={[
              styles.tabButton,
              { 
                backgroundColor: activeTab === 'active' ? '#16A34A' : theme.card,
                borderColor: activeTab === 'active' ? '#16A34A' : '#666'
              }
            ]}
          >
            <Text style={[
              styles.tabButtonText,
              { color: activeTab === 'active' ? '#fff' : theme.text }
            ]}>
              ✅ Ativas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('deleted')}
            style={[
              styles.tabButton,
              { 
                backgroundColor: activeTab === 'deleted' ? '#ef4444' : theme.card,
                borderColor: activeTab === 'deleted' ? '#ef4444' : '#666'
              }
            ]}
          >
            <Text style={[
              styles.tabButtonText,
              { color: activeTab === 'deleted' ? '#fff' : theme.text }
            ]}>
              🗑️ Excluídas
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ flexDirection: isWideWeb ? 'row' : 'column', gap: 16, flex: 1 }}>
          <View style={{ flex: 1 }}>
            <FlatList
              data={companies}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={renderCompany}
              ListEmptyComponent={
                <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>
                  {activeTab === 'active' ? 'Nenhuma empresa ativa' : 'Nenhuma empresa excluída'}
                </Text>
              }
            />
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      {editVisible && editing && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Editar Empresa</Text>
            
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Nome de usuário</Text>
              <TextInput
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Email</Text>
              <TextInput
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Telefone</Text>
              <TextInput
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.text }}>Preço do plano (R$)</Text>
                <TextInput
                  value={formData.plan_price}
                  onChangeText={(text) => setFormData({ ...formData, plan_price: text.replace(/[^0-9.,]/g, '') })}
                  keyboardType="numeric"
                  style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.text }}>Desconto (%)</Text>
                <TextInput
                  value={formData.discount_percent}
                  onChangeText={(text) => setFormData({ ...formData, discount_percent: text.replace(/[^0-9]/g, '') })}
                  keyboardType="numeric"
                  style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
                />
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Logo URL</Text>
              <TextInput
                value={(formData as any).logo_url || ''}
                onChangeText={(text) => setFormData({ ...formData, logo_url: text } as any)}
                placeholder="https://...logo.png"
                style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Senha provisória (deixe em branco para não alterar)</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={formData.temp_password}
                  onChangeText={(text) => setFormData({ ...formData, temp_password: text })}
                  secureTextEntry={!showTempPass}
                  style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder, paddingRight: 44 }]}
                />
                <TouchableOpacity onPress={() => setShowTempPass(s => !s)} style={{ position: 'absolute', right: 8, top: 8, padding: 8 }}>
                  <Text style={{ color: '#888' }}>{showTempPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Opção de Liberar Período Grátis */}
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>🎁 Liberar Período Grátis</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: theme.text, fontSize: 12 }}>Dias</Text>
                  <TextInput
                    value={(formData as any).free_days || ''}
                    onChangeText={(text) => setFormData({ ...formData, free_days: text.replace(/[^0-9]/g, '') } as any)}
                    keyboardType="numeric"
                    placeholder="0"
                    style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: theme.text, fontSize: 12 }}>Meses</Text>
                  <TextInput
                    value={(formData as any).free_months || ''}
                    onChangeText={(text) => setFormData({ ...formData, free_months: text.replace(/[^0-9]/g, '') } as any)}
                    keyboardType="numeric"
                    placeholder="0"
                    style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: theme.text, fontSize: 12 }}>Anos</Text>
                  <TextInput
                    value={(formData as any).free_years || ''}
                    onChangeText={(text) => setFormData({ ...formData, free_years: text.replace(/[^0-9]/g, '') } as any)}
                    keyboardType="numeric"
                    placeholder="0"
                    style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
                  />
                </View>
              </View>
              <Text style={{ color: '#888', fontSize: 11 }}>Deixe em branco ou 0 para não adicionar tempo grátis</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setEditVisible(false); setEditing(null); }} style={[styles.modalBtn, { backgroundColor: '#666' }] }>
                <Text style={{ color: '#fff' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdate} style={[styles.modalBtn, { backgroundColor: '#2563EB' }]}>
                <Text style={{ color: '#fff' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {confirmDeleteVisible && companyToDelete && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: theme.card, maxWidth: 500 }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>🗑️ Excluir Empresa</Text>
            <Text style={{ color: theme.text, marginBottom: 8, fontSize: 16 }}>
              Deseja realmente excluir a empresa <Text style={{ fontWeight: '700' }}>{companyToDelete.name}</Text>?
            </Text>
            <Text style={{ color: '#888', marginBottom: 16, fontSize: 14 }}>
              Ela ficará na lista de excluídas por 90 dias antes da remoção permanente.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => {
                  setConfirmDeleteVisible(false);
                  setCompanyToDelete(null);
                }} 
                style={[styles.modalBtn, { backgroundColor: '#666' }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={confirmDelete} 
                style={[styles.modalBtn, { backgroundColor: '#ef4444' }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modal de Confirmação de Reativação */}
      {confirmReactivateVisible && companyToReactivate && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: theme.card, maxWidth: 500 }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>♻️ Reativar Empresa</Text>
            <Text style={{ color: theme.text, marginBottom: 16, fontSize: 16 }}>
              Deseja realmente reativar a empresa <Text style={{ fontWeight: '700' }}>{companyToReactivate.name}</Text>?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => {
                  setConfirmReactivateVisible(false);
                  setCompanyToReactivate(null);
                }} 
                style={[styles.modalBtn, { backgroundColor: '#666' }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={confirmReactivate} 
                style={[styles.modalBtn, { backgroundColor: '#16A34A' }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Reativar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  tabButton: { 
    flex: 1, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    borderWidth: 2, 
    alignItems: 'center' 
  },
  tabButtonText: { 
    fontSize: 14, 
    fontWeight: '700' 
  },
  companyCard: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  companyName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  companyInfo: { fontSize: 12, marginBottom: 2 },
  planInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  companyActions: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 8 },
  actionText: { fontSize: 12, fontWeight: '600' },
  actionButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, alignItems: 'center' },
  actionButtonText: { fontWeight: '700', fontSize: 12, color: '#fff' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', maxWidth: 400, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
});
