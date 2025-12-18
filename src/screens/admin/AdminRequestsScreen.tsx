import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { useToast } from '../../ui/ToastProvider';
import { useI18n } from '../../i18n/I18nProvider';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../lib/supabase';
import { Platform, TextInput } from 'react-native';

interface CompanyRequest {
  id: string;
  company_name: string;
  owner_name: string;
  phone: string;
  address: string | null;
  cnpj: string | null;
  founded_on: string | null;
  segment?: string | null;
  discount_coupon_code?: string | null;
  created_at: string;
  approved?: boolean;
}

// Função para normalizar username
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Função para enviar mensagem de aprovação por WhatsApp
const sendWhatsAppApproval = (username: string, tempPassword: string, phone: string) => {
  const message = encodeURIComponent(
    `🎉 *BEM-VINDO(A) AO FAST CASH FLOW!*\n\n` +
    `Sua empresa foi aprovada e você já pode começar a usar nosso sistema!\n\n` +
    `📋 *SEUS DADOS DE ACESSO:*\n` +
    `👤 *Login:* ${username}\n` +
    `🔑 *Senha Provisória:* ${tempPassword}\n\n` +
    `🎁 *30 DIAS GRÁTIS* de trial estão ativados!\n` +
    `Aproveite para testar todas as funcionalidades.\n\n` +
    `📱 *ACESSE AGORA:* https://fast-cash-flow.com\n\n` +
    `Dúvidas? Entre em contato conosco!\n` +
    `Atenciosamente,\n` +
    `Equipe Fast Cash Flow 💚`
  );
  
  const cleanPhone = phone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${message}`;
  
  if (Platform.OS === 'web') {
    window.open(whatsappUrl, '_blank');
  } else {
    require('react-native').Linking.openURL(whatsappUrl);
  }
};

// Repository functions
async function getCompanyRequests(): Promise<CompanyRequest[]> {
  // Buscar apenas solicitações PENDENTES (status = 'pending' ou NULL)
  const { data, error } = await supabase
    .from('company_requests')
    .select('*')
    .or('status.eq.pending,status.is.null')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return (data as any) || [];
}

async function approveRequest(id: string, tempPassword: string, username: string): Promise<{company_id: string, message: string}> {
  console.log('🔄 Iniciando aprovação:', { id, username, tempPassword });
  
  // Usar RPC function que cria empresa com trial de 30 dias automaticamente
  const { data, error } = await supabase.rpc('approve_company_request', {
    request_id: id,
    approved_user: username,
    temp_pass: tempPassword
  });
  
  console.log('📡 Resposta do RPC approve:', { data, error });
  
  if (error) {
    console.error('❌ Erro detalhado ao aprovar:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw new Error(error.message || 'Erro ao aprovar empresa');
  }
  
  console.log('✅ Empresa aprovada com trial de 30 dias. ID:', data);
  
  // Retornar dados da empresa aprovada
  return data as {company_id: string, message: string};
}

async function rejectRequest(id: string): Promise<void> {
  // Tenta deletar primeiro (se política permitir), senão faz update para tirar da fila
  let del = await supabase.from('company_requests').delete().eq('id', id);
  if (del.error) {
    const upd = await supabase
      .from('company_requests')
      .update({ approved: true, rejected_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (upd.error) throw upd.error;
  }
}

export default function AdminRequestsScreen() {
  const qc = useQueryClient();
  const { theme } = useThemeCtx();
  const toast = useToast();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 1024;

  const [approveVisible, setApproveVisible] = React.useState(false);
  const [approving, setApproving] = React.useState<CompanyRequest | null>(null);
  const [tempPassword, setTempPassword] = React.useState('');
  const [newUsername, setNewUsername] = React.useState('');
  const [rejectVisible, setRejectVisible] = React.useState(false);
  const [rejecting, setRejecting] = React.useState<CompanyRequest | null>(null);
  const [showPass, setShowPass] = React.useState(false);
  const autoWARef = React.useRef(false);

  const requestsQuery = useQuery({
    queryKey: ['admin-requests'],
    queryFn: getCompanyRequests,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });

  const approveMut = useMutation({
    mutationFn: ({ id, tempPassword, username }: { id: string; tempPassword: string; username: string }) => approveRequest(id, tempPassword, username),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      // fechar modal e limpar estado
      const phone = approving?.phone || '';
      setApproveVisible(false);
      setApproving(null);
      setTempPassword('');
      setNewUsername('');
      // Enviar WhatsApp automaticamente se solicitado
      if (autoWARef.current) {
        try { sendWhatsAppApproval(variables.username, variables.tempPassword, phone); } catch {}
        autoWARef.current = false;
      }
      toast.show('Empresa aprovada com sucesso!', 'success');
    },
    onError: (e: any) => { console.error('Approve error', e); toast.show(`Erro ao aprovar empresa: ${e?.message || e || 'verifique permissões e campos obrigatórios'}`, 'error'); },
  });

  const rejectMut = useMutation({
    mutationFn: rejectRequest,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['admin-requests'] });
      const prev = qc.getQueryData<CompanyRequest[]>(['admin-requests']) || [];
      qc.setQueryData<CompanyRequest[]>(['admin-requests'], prev.filter(r => r.id !== id));
      return { prev };
    },
    onError: (e: any, _id, ctx) => {
      console.error('Reject error', e);
      if (ctx?.prev) qc.setQueryData(['admin-requests'], ctx.prev);
      toast.show(`Erro ao recusar solicitação: ${e?.message || e}`, 'error');
    },
    onSuccess: () => {
      toast.show('Solicitação recusada e excluída', 'success');
      setRejectVisible(false);
      setRejecting(null);
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
    },
  });

  const openApprove = (request: CompanyRequest) => {
    setApproving(request);
    setTempPassword('');
    setNewUsername(normalize((request.company_name || '').replace(/\s+/g, '')));
    setApproveVisible(true);
  };

  const handleApprove = () => {
    if (!approving || !tempPassword || !newUsername) {
      Alert.alert('Informe uma senha provisória');
      return;
    }
    autoWARef.current = false;
    approveMut.mutate({ id: approving.id, tempPassword, username: normalize(newUsername) });
  };

  const handleApproveAndWhatsApp = () => {
    if (!approving || !tempPassword || !newUsername) {
      Alert.alert('Informe uma senha provisória');
      return;
    }
    autoWARef.current = true;
    approveMut.mutate({ id: approving.id, tempPassword, username: normalize(newUsername) });
  };

  const handleReject = (request: CompanyRequest) => {
    setRejecting(request);
    setRejectVisible(true);
  };

  const renderRequest = ({ item }: { item: CompanyRequest }) => {
    return (
      <View style={[styles.requestCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.companyName, { color: theme.text }]}>{item.company_name}</Text>
          <Text style={[styles.requestInfo, { color: theme.textSecondary }]}>Proprietário: {item.owner_name}</Text>
          <Text style={[styles.requestInfo, { color: theme.textSecondary }]}>Telefone: {item.phone}</Text>
          {item.segment ? <Text style={[styles.requestInfo, { color: theme.textSecondary }]}>Segmento: {item.segment}</Text> : null}
          {item.discount_coupon_code ? <Text style={[styles.requestInfo, { color: theme.textSecondary }]}>Cupom: {item.discount_coupon_code}</Text> : null}
          {item.cnpj ? <Text style={[styles.requestInfo, { color: theme.textSecondary }]}>CNPJ: {item.cnpj}</Text> : null}
          {item.address ? <Text style={[styles.requestInfo, { color: theme.textSecondary }]}>Endereço: {item.address}</Text> : null}
          {item.founded_on ? <Text style={[styles.requestInfo, { color: theme.textSecondary }]}>Fundada em: {item.founded_on}</Text> : null}

          <Text style={[styles.requestDate, { color: theme.textSecondary }]}>
            Solicitado em: {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </Text>
        </View>

        <View style={styles.requestActions}>
          <TouchableOpacity onPress={() => openApprove(item)} style={{ backgroundColor: '#22c55e', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Aprovar e enviar WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleReject(item)} style={{ backgroundColor: '#D90429', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Recusar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80, padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.text }]}>Solicitações de Cadastro</Text>
        
        <View style={{ flexDirection: isWideWeb ? 'row' : 'column', gap: 16, flex: 1 }}>
          <View style={{ flex: 1 }}>
            <FlatList
              data={requestsQuery.data || []}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={renderRequest}
              refreshing={requestsQuery.isFetching}
              onRefresh={() => requestsQuery.refetch()}
              ListEmptyComponent={
                <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 20 }}>
                  Nenhuma solicitação pendente
                </Text>
              }
            />
          </View>
        </View>
      </ScrollView>

      {/* Approve Modal */}
      {approveVisible && approving && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Aprovar Empresa</Text>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{approving.company_name}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{approving.phone}</Text>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: theme.text }}>Login (nome de usuário)</Text>
              <TextInput
                value={newUsername}
                onChangeText={setNewUsername}
                placeholder="Defina o login da empresa"
                placeholderTextColor="#999"
                style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
              />

              <Text style={{ color: theme.text }}>Senha provisória</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={tempPassword}
                  onChangeText={setTempPassword}
                  placeholder="Digite uma senha provisória"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPass}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background, paddingRight: 44 }]}
                />
                <TouchableOpacity onPress={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 8, top: 8, padding: 8 }}>
                  <Text style={{ color: '#888' }}>{showPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: '#888', fontSize: 11 }}>
                Esta senha será enviada para o contato e deverá ser alterada no primeiro acesso.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setApproveVisible(false); setApproving(null); }} style={[styles.modalBtn, { backgroundColor: '#666' }]}> 
                <Text style={{ color: '#fff' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleApproveAndWhatsApp} style={[styles.modalBtn, { backgroundColor: '#22c55e' }]}> 
                <Text style={{ color: '#fff' }}>Aprovar e enviar WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Reject Confirm Modal */}
      {rejectVisible && rejecting && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: theme.card }] }>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Recusar solicitação?</Text>
            <Text style={{ color: '#888', marginBottom: 16 }}>Esta ação excluirá a solicitação da empresa "{rejecting.company_name}".</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setRejectVisible(false); setRejecting(null); }} style={[styles.modalBtn, { backgroundColor: '#666' }]}>
                <Text style={{ color: '#fff' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => rejectMut.mutate(rejecting.id)} style={[styles.modalBtn, { backgroundColor: '#D90429' }]}>
                <Text style={{ color: '#fff' }}>Recusar</Text>
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
  requestCard: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  companyName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  requestInfo: { fontSize: 12, marginBottom: 2 },
  messageBox: { marginTop: 8, padding: 8, borderRadius: 6 },
  messageLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  messageText: { fontSize: 12 },
  requestDate: { fontSize: 11, marginTop: 8 },
  requestActions: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 8 },
  actionText: { fontSize: 12, fontWeight: '600' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', maxWidth: 400, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
});
