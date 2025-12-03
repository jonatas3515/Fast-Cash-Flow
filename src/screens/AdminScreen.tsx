import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Platform, Modal, TextInput, Switch, Image, Linking } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quickSync } from '../lib/sync';
import { useSettings } from '../settings/SettingsProvider';
import * as ImagePicker from 'expo-image-picker';
import { capitalizeCompanyName } from '../utils/string';
import DebtsScreen from './DebtsScreen';

export default function AdminScreen() {
  const { theme, mode, setMode } = useThemeCtx();
  const qc = useQueryClient();
  const { settings, setLogoUrl } = useSettings();
  const [logo, setLogo] = React.useState(settings.logoUrl || '');
  const [tab, setTab] = React.useState<'empresas' | 'config' | 'debts'>('empresas');
  const [online, setOnline] = React.useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncing, setSyncing] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [companyOpen, setCompanyOpen] = React.useState(false);
  const [selectedCompany, setSelectedCompany] = React.useState<{ id: string; name: string } | null>(null);
  const [companyReq, setCompanyReq] = React.useState<any>(null);
  const [newCompanyPass, setNewCompanyPass] = React.useState('');
  const [selectCompanyOpen, setSelectCompanyOpen] = React.useState(false);
  const [companyForConfig, setCompanyForConfig] = React.useState<{ id: string|null; name: string } | null>(null);
  const companiesQ = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
  });

  React.useEffect(() => {
    (async () => {
      try {
        await supabase.from('companies').upsert({ name: 'fastsavorys' }, { onConflict: 'name' } as any);
        await qc.invalidateQueries({ queryKey: ['companies'] });
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const updateOnline = () => setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    try {
      window.addEventListener('online', updateOnline);
      window.addEventListener('offline', updateOnline);
    } catch {}
    const id = setInterval(() => {
      try {
        const raw = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem('sync_outbox') : null;
        if (raw) {
          const arr = JSON.parse(raw);
          setPendingCount(Array.isArray(arr) ? arr.length : 0);
        } else {
          setPendingCount(0);
        }
      } catch { setPendingCount(0); }
    }, 2000);
    return () => { try { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline); } catch {}; clearInterval(id); };
  }, []);
  const requestsQ = useQuery({
    queryKey: ['company_requests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; company_name: string; owner_name: string; phone: string; address: string; cnpj: string; founded_on: string | null; approved: boolean; approved_company_id?: string | null; approved_at?: string | null; trial_until?: string | null }>;
    },
  });
  const approveMut = useMutation({
    mutationFn: async (payload: { id: string; username: string; tempPass: string; trial: boolean; blocked: boolean, company_name: string }) => {
      // 1) Upsert company
      const { data: compIns, error: compErr } = await supabase
        .from('companies')
        .insert({ name: payload.company_name })
        .select('id')
        .single();
      if (compErr) throw compErr;
      const company_id = compIns.id as string;

      // 2) Generate placeholder user_id (until real auth user exists)
      const user_id = (globalThis as any).crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

      // 3) Insert membership as owner
      const { error: memErr } = await supabase
        .from('company_members')
        .insert({ company_id, user_id, role: 'owner' });
      if (memErr) throw memErr;

      // 4) Update request with approval meta
      const trial_until = payload.trial ? new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10) : null;
      const { error } = await supabase.from('company_requests').update({
        approved: true,
        approved_at: new Date().toISOString(),
        approved_username: payload.username,
        approved_temp_password: payload.tempPass,
        trial_until,
        blocked: payload.blocked,
        approved_user_id: user_id,
        approved_company_id: company_id,
      }).eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: async () => { await Promise.all([
      qc.invalidateQueries({ queryKey: ['company_requests'] }),
      qc.invalidateQueries({ queryKey: ['companies'] }),
    ]); },
  });
  const rejectMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('company_requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['company_requests'] }); },
  });

  const [modalVisible, setModalVisible] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState('');
  const [tempPass, setTempPass] = React.useState('');
  const [trial, setTrial] = React.useState(true);
  const [blocked, setBlocked] = React.useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = React.useState('');
  const [selectedPhone, setSelectedPhone] = React.useState<string>('');
  const openApprove = (id: string, suggested?: string, companyName?: string, phone?: string) => {
    setSelectedId(id);
    setSelectedCompanyName(companyName || '');
    setUsername(suggested || '');
    setTempPass('123456');
    setTrial(true);
    setBlocked(false);
    setModalVisible(true);
    setSelectedPhone(phone || '');
  };

  // build merged companies list (DB companies + approved requests names)
  const mergedCompanies = React.useMemo(() => {
    const list: { id: string|null; name: string }[] = [];
    const db = (companiesQ.data || []);
    db.forEach(c => list.push({ id: c.id, name: c.name }));
    (requestsQ.data || []).filter(r => r.approved).forEach(r => {
      const exists = list.some(x => x.name.toLowerCase() === (r.company_name||'').toLowerCase());
      if (!exists) list.push({ id: r.approved_company_id || null, name: r.company_name });
    });
    // Ensure fastsavorys always present
    if (!list.some(x => x.name.toLowerCase() === 'fastsavorys')) list.push({ id: null, name: 'fastsavorys' });
    return list;
  }, [companiesQ.data, requestsQ.data]);

  React.useEffect(() => {
    if (!companyForConfig && mergedCompanies.length > 0) setCompanyForConfig(mergedCompanies[0]);
  }, [mergedCompanies, companyForConfig]);

  // helper: find request by company
  const reqByCompany = React.useCallback((name: string) => {
    const reqs = (requestsQ.data || []);
    const low = (name||'').toLowerCase();
    return reqs.find(r => (r.company_name||'').toLowerCase() === low) || null;
  }, [requestsQ.data]);
  const planLabel = (name: string) => {
    if ((name||'').toLowerCase() === 'fastsavorys') return 'Plano: Vitalício';
    const req = reqByCompany(name);
    if (req && req.approved) return 'Plano: Mensal';
    return 'Plano: -';
  };
  const trialInfo = (name: string) => {
    if ((name||'').toLowerCase() === 'fastsavorys') return '';
    const req = reqByCompany(name);
    if (!req || !req.trial_until) return '';
    try {
      const today = new Date().toISOString().slice(0,10);
      const d1 = new Date(today).getTime();
      const d2 = new Date(req.trial_until).getTime();
      const diff = Math.ceil((d2 - d1) / (1000*60*60*24));
      const days = Math.max(0, diff);
      return `Teste Grátis: ${days} dia${days===1?'':'s'} restantes`;
    } catch { return ''; }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Image
            source={settings.logoUrl ? { uri: settings.logoUrl } : (mode === 'dark' ? require('../../Logo White.png') : require('../../Logo Black.png'))}
            resizeMode="contain"
            style={{ width: 60, height: 34 }}
          />
          <View style={{ gap: 0 }}>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800', lineHeight: 16 }}>FAST</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800', lineHeight: 16 }}>CASH</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800', lineHeight: 16 }}>FLOW</Text>
          </View>
          <Text style={{ color: theme.text, marginLeft: 12 }}>Bem-vindo(a), Jonatas</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: online ? '#14532D' : '#7F1D1D' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{online ? 'Online' : 'Offline'}</Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#1F2937' }}>
            <Text style={{ color: '#fff' }}>{syncing ? 'Sincronizando…' : `Pendentes: ${pendingCount}`}</Text>
          </View>
          <TouchableOpacity onPress={() => quickSync()} style={{ paddingHorizontal: 8, paddingVertical: 6, marginRight: 4 }}>
            <Text style={{ color: '#16A34A', fontSize: 20, lineHeight: 20 }}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 6 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              try {
                if (Platform.OS === 'web') {
                  try { window.sessionStorage.removeItem('auth_ok'); window.sessionStorage.removeItem('auth_role'); } catch {}
                } else {
                  await SecureStore.deleteItemAsync('auth_ok');
                  await SecureStore.deleteItemAsync('auth_role');
                }
                await supabase.auth.signOut();
              } finally {
                if (Platform.OS === 'web') { try { window.location.reload(); } catch {} }
              }
            }}
            style={{ backgroundColor: '#D90429', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginRight: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity onPress={() => setTab('empresas')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FFC300' }}>
          <Text style={{ color: '#111', fontWeight: '800' }}>Empresas</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('config')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FFC300' }}>
          <Text style={{ color: '#111', fontWeight: '800' }}>Config</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('debts')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FFC300' }}>
          <Text style={{ color: '#111', fontWeight: '800' }}>Débitos</Text>
        </TouchableOpacity>
      </View>

      {tab === 'empresas' && (
        <>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>Empresas cadastradas</Text>
          <FlatList
            data={mergedCompanies}
            keyExtractor={(i, idx) => i.id || `${i.name}-${idx}`}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>{capitalizeCompanyName(item.name)}</Text>
                  <Text style={{ color: theme.text }}>{planLabel(item.name)}</Text>
                  {trialInfo(item.name) ? (<Text style={{ color: '#888' }}>{trialInfo(item.name)}</Text>) : null}
                </View>
                <TouchableOpacity style={{ backgroundColor: '#111', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 }} onPress={async () => {
                  setSelectedCompany(item as any);
                  setNewCompanyPass('');
                  let data: any = null;
                  if (item.id) {
                    ({ data } = await supabase.from('company_requests').select('*').eq('approved_company_id', item.id).maybeSingle());
                  }
                  if (!data) {
                    const { data: d2 } = await supabase.from('company_requests').select('*').eq('company_name', item.name).order('created_at', { ascending: false }).limit(1).maybeSingle();
                    data = d2 || null;
                  }
                  setCompanyReq(data);
                  setCompanyOpen(true);
                }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Entrar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => rejectMut.mutate(item.id as any)} style={{ backgroundColor: '#D90429', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Remover</Text>
                </TouchableOpacity>
              </View>
            )}
          />
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', marginTop: 12 }}>Solicitações</Text>
          {(() => {
            const reqs = requestsQ.data || [];
            if (reqs.length === 0) return <Text style={{ color: '#888' }}>Nenhuma solicitação pendente.</Text>;
            return (
              <FlatList
                data={reqs}
                keyExtractor={(i) => i.id}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '600' }}>{capitalizeCompanyName(item.company_name)} — {item.owner_name}</Text>
                      <Text style={{ color: '#888' }}>{item.phone} • {item.cnpj}</Text>
                      <Text style={{ color: '#888' }}>{item.address}</Text>
                      <Text style={{ color: theme.text }}>{planLabel(item.company_name)}</Text>
                      {((item.company_name||'').toLowerCase() !== 'fastsavorys') && item.trial_until ? (
                        <Text style={{ color: '#888' }}>{trialInfo(item.company_name)}</Text>
                      ) : null}
                    </View>
                    {!item.approved ? (
                      <TouchableOpacity onPress={() => openApprove(item.id, (item.company_name||'').toLowerCase().replace(/\s+/g,'').slice(0,16), item.company_name, item.phone)} style={{ backgroundColor: '#16A34A', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>Aprovar e enviar WhatsApp</Text>
                      </TouchableOpacity>
                    ) : (
                      ((item.company_name||'').toLowerCase() !== 'fastsavorys') ? (
                        <TouchableOpacity onPress={async () => {
                          const trial_until = new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10);
                          await supabase.from('company_requests').update({ trial_until }).eq('id', item.id);
                          await requestsQ.refetch();
                        }} style={{ backgroundColor: '#16A34A', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 }}>
                          <Text style={{ color: '#fff', fontWeight: '700' }}>Liberar Teste Grátis (30 dias)</Text>
                        </TouchableOpacity>
                      ) : null
                    )}
                    <TouchableOpacity onPress={() => rejectMut.mutate(item.id)} style={{ backgroundColor: '#D90429', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>Recusar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            );
          })()}
        </>
      )}

      {tab === 'config' && (
        <View style={{ gap: 12 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>Configurações</Text>
          <Text style={{ color: theme.text }}>Empresa selecionada: {companyForConfig ? capitalizeCompanyName(companyForConfig.name) : '-'}</Text>
          <TouchableOpacity onPress={() => setSelectCompanyOpen(true)} style={{ backgroundColor: '#FFC300', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' }}>
            <Text style={{ color: '#111', fontWeight: '800' }}>Trocar empresa</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.text }}>Alterar logo do app</Text>
          <TextInput 
            value={logo} 
            onChangeText={(v) => { setLogo(v); setLogoUrl(v || null); }} 
            placeholder="URL da logo (https://...)" 
            placeholderTextColor={theme.inputPlaceholder || "#999"} 
            style={{ 
              borderWidth: 1, 
              borderColor: theme.inputBorder || '#555', 
              borderRadius: 8, 
              padding: 12, 
              color: theme.text, 
              backgroundColor: theme.input 
            }} 
          />
          <View style={{ flexDirection:'row', gap: 8 }}>
            <TouchableOpacity style={{ backgroundColor: '#FFC300', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }} onPress={async () => { await setLogoUrl(logo || null); }}>
              <Text style={{ color: '#111', fontWeight: '800' }}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#16A34A', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }} onPress={async () => {
              const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (perm.status !== 'granted') return;
              const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
              if (!res.canceled && res.assets && res.assets[0]?.uri) {
                setLogo(res.assets[0].uri);
                await setLogoUrl(res.assets[0].uri);
              }
            }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Escolher imagem</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 12 }} />
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>Alterar senha</Text>
          <TextInput 
            value={newCompanyPass} 
            onChangeText={setNewCompanyPass} 
            placeholder="Nova senha" 
            placeholderTextColor={theme.inputPlaceholder || "#999"} 
            secureTextEntry 
            style={{ 
              borderWidth: 1, 
              borderColor: theme.inputBorder || '#555', 
              borderRadius: 8, 
              padding: 12, 
              color: theme.text, 
              backgroundColor: theme.input 
            }} 
          />
          <TouchableOpacity onPress={async () => {
            if (!companyForConfig) return;
            // Regra: 1 alteração a cada 30 dias por empresa
            let comp: any = null;
            try {
              const { data } = await supabase.from('companies').select('id,last_password_change').eq('name',companyForConfig.name).maybeSingle();
              comp = data;
            } catch {}
            const now = new Date();
            const last = comp?.last_password_change ? new Date(comp.last_password_change) : null;
            if (last && (now.getTime() - last.getTime()) < 30*24*60*60*1000) {
              alert('Você só pode alterar a senha a cada 30 dias.');
              return;
            }
            try { await supabase.from('companies').update({ last_password_change: now.toISOString() }).eq('name',companyForConfig.name); } catch {}
            try { await supabase.from('company_requests').update({ approved_temp_password: newCompanyPass }).eq('company_name',companyForConfig.name); } catch {}
            setNewCompanyPass('');
            alert('Senha alterada com sucesso.');
          }} style={{ backgroundColor: '#16A34A', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Salvar nova senha</Text>
          </TouchableOpacity>
          <Text style={{ color: '#888' }}>Regra: apenas 1 alteração a cada 30 dias.</Text>
        </View>
      )}


      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex:1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems:'center', justifyContent:'center' }}>
          <View style={{ width: 480, maxWidth: '90%', backgroundColor: theme.card, borderRadius: 12, padding: 16, gap: 10 }}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Aprovar solicitação</Text>
            <TextInput 
              value={username} 
              onChangeText={setUsername} 
              placeholder="Nome de usuário" 
              placeholderTextColor={theme.inputPlaceholder || "#999"} 
              autoCapitalize="none" 
              style={{ 
                borderWidth: 1, 
                borderColor: theme.inputBorder || '#555', 
                borderRadius: 8, 
                padding: 12, 
                color: theme.text, 
                backgroundColor: theme.input 
              }} 
            />
            <TextInput 
              value={tempPass} 
              onChangeText={setTempPass} 
              placeholder="Senha provisória" 
              placeholderTextColor={theme.inputPlaceholder || "#999"} 
              autoCapitalize="none" 
              style={{ 
                borderWidth: 1, 
                borderColor: theme.inputBorder || '#555', 
                borderRadius: 8, 
                padding: 12, 
                color: theme.text, 
                backgroundColor: theme.input 
              }} 
            />
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
              {(selectedCompanyName||'').toLowerCase() !== 'fastsavorys' ? (
                <>
                  <Text style={{ color: theme.text }}>Teste Grátis de 30 dias</Text>
                  <Switch value={trial} onValueChange={setTrial} />
                </>
              ) : (
                <Text style={{ color: theme.text }}>Plano: Vitalício</Text>
              )}
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
              <Text style={{ color: theme.text }}>Bloquear por inadimplência</Text>
              <Switch value={blocked} onValueChange={setBlocked} />
            </View>
            <View style={{ flexDirection:'row', justifyContent:'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                if (!selectedId) return;
                await approveMut.mutateAsync({ id: selectedId, username, tempPass, trial, blocked, company_name: selectedCompanyName });
                setModalVisible(false);
                // Build WhatsApp message
                const msg = `Olá! Sua empresa ${selectedCompanyName} foi aprovada.\nLogin: ${username}\nSenha provisória: ${tempPass}\nTeste Grátis: 30 dias. Acesse o sistema e altere a senha no primeiro acesso.`;
                const phone = (selectedPhone || '').replace(/\D/g,'');
                try {
                  if (Platform.OS === 'web') {
                    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
                    window.open(url, '_blank');
                  } else {
                    const url = `whatsapp://send?phone=55${phone}&text=${encodeURIComponent(msg)}`;
                    Linking.openURL(url);
                  }
                } catch {}
              }} style={{ backgroundColor: '#16A34A', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Aprovar e enviar WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={selectCompanyOpen} transparent animationType="fade" onRequestClose={() => setSelectCompanyOpen(false)}>
        <View style={{ flex:1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems:'center', justifyContent:'center' }}>
          <View style={{ width: 520, maxWidth: '92%', backgroundColor: theme.card, borderRadius: 12, padding: 16, gap: 10 }}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Escolher empresa</Text>
            <FlatList
              data={mergedCompanies}
              keyExtractor={(i, idx) => i.id || `${i.name}-${idx}`}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setCompanyForConfig(item); setSelectCompanyOpen(false); }} style={{ padding: 12, borderWidth: 1, borderColor: '#444', borderRadius: 8 }}>
                  <Text style={{ color: theme.text }}>{capitalizeCompanyName(item.name)}</Text>
                </TouchableOpacity>
              )}
            />
            <View style={{ flexDirection:'row', justifyContent:'flex-end' }}>
              <TouchableOpacity onPress={() => setSelectCompanyOpen(false)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Config modal removed: replaced by Config tab above */}

      <Modal visible={companyOpen} transparent animationType="fade" onRequestClose={() => setCompanyOpen(false)}>
        <View style={{ flex:1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems:'center', justifyContent:'center' }}>
          <View style={{ width: 520, maxWidth: '92%', backgroundColor: theme.card, borderRadius: 12, padding: 16, gap: 10 }}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Empresa</Text>
            <Text style={{ color: theme.text }}>Nome: {capitalizeCompanyName(selectedCompany?.name || '')}</Text>
            {companyReq ? (
              <>
                <Text style={{ color: theme.text }}>Proprietário: {companyReq.owner_name}</Text>
                <Text style={{ color: theme.text }}>Telefone: {companyReq.phone}</Text>
                <Text style={{ color: theme.text }}>Endereço: {companyReq.address || '-'}</Text>
                <Text style={{ color: theme.text }}>CNPJ: {companyReq.cnpj || '-'}</Text>
                <Text style={{ color: theme.text }}>Trial até: {companyReq.trial_until || '-'}</Text>
              </>
            ) : (
              <Text style={{ color: '#888' }}>Sem solicitação vinculada.</Text>
            )}
            <View style={{ height: 8 }} />
            <Text style={{ color: theme.text, fontWeight: '700' }}>Redefinir senha provisória</Text>
            <TextInput 
              value={newCompanyPass} 
              onChangeText={setNewCompanyPass} 
              placeholder="Nova senha" 
              placeholderTextColor={theme.inputPlaceholder || "#999"} 
              secureTextEntry 
              style={{ 
                borderWidth: 1, 
                borderColor: theme.inputBorder || '#555', 
                borderRadius: 8, 
                padding: 12, 
                color: theme.text, 
                backgroundColor: theme.input 
              }} 
            />
            <View style={{ flexDirection:'row', gap: 8, justifyContent:'flex-end' }}>
              <TouchableOpacity onPress={() => setCompanyOpen(false)} style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => { if (!selectedCompany) return; if (!newCompanyPass || newCompanyPass.length < 4) return; await supabase.from('company_requests').update({ approved_temp_password: newCompanyPass }).eq('approved_company_id', selectedCompany.id); setNewCompanyPass(''); setCompanyOpen(false); }} style={{ backgroundColor: '#16A34A', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
