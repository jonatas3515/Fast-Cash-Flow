import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, Image } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useSettings } from '../settings/SettingsProvider';
import { syncAll, clearCompanyIdCache } from '../lib/sync';
import { useNavigation } from '@react-navigation/native';

const USER = 'fastsavorys';
const PASS = 'jerosafast';
const ADMIN_USER = 'jonatas';
const ADMIN_PASS = 'fastcashflow';
const ADMIN_EMAIL = 'admin@fastcashflow.com';
const KEY = 'auth_ok';
const ROLE_KEY = 'auth_role';

type Props = { onOk: (role: 'admin' | 'user') => void; onBack?: () => void };

export default function LoginGate({ onOk, onBack }: Props) {
  const [user, setUser] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [error, setError] = React.useState('');
  const [checking, setChecking] = React.useState(true);
  const [showPass, setShowPass] = React.useState(false);
  const { mode, theme } = useThemeCtx();
  const nav = useNavigation<any>();
  const { setLogoUrl, refreshCompanyProfile } = useSettings();
  const [remember, setRemember] = React.useState(false);
  const [trialDays, setTrialDays] = React.useState(30);
  const [monthlyPrice, setMonthlyPrice] = React.useState('9.99');
  const [yearlyPrice, setYearlyPrice] = React.useState('99.99');
  const [whatsappNumber, setWhatsappNumber] = React.useState('5573999348552');
  const [firstLoginVisible, setFirstLoginVisible] = React.useState(false);
  const [newPass1, setNewPass1] = React.useState('');
  const [newPass2, setNewPass2] = React.useState('');
  const [showNewPass1, setShowNewPass1] = React.useState(false);
  const [showNewPass2, setShowNewPass2] = React.useState(false);
  const [matchedReqId, setMatchedReqId] = React.useState<string | null>(null);
  const [pendingUsername, setPendingUsername] = React.useState<string | null>(null);
  const [upgradeVisible, setUpgradeVisible] = React.useState(false);
  const [expiredCompanyId, setExpiredCompanyId] = React.useState<string | null>(null);

  const ensureSupabaseCompanySession = React.useCallback(async (approvedUsername: string, password: string) => {
    try {
      const query = supabase
        .from('company_requests')
        .select('email')
        .ilike('approved_username', approvedUsername)
        .limit(1)
        .maybeSingle();

      let email: string | null = null;

      // Prefer status='approved' but tolerate schemas that don't have status
      {
        const { data, error } = await (query as any).eq('status', 'approved');
        if (!error) email = (data as any)?.email ?? null;
      }

      if (!email) {
        const { data, error } = await (query as any).eq('approved', true);
        if (!error) email = (data as any)?.email ?? null;
      }

      if (!email) return;

      let { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) return;

      try { await supabase.auth.signUp({ email, password }); } catch { }
      ({ error } = await supabase.auth.signInWithPassword({ email, password }));
      if (error) {
        console.warn('[LOGIN] Falha ao autenticar Supabase para empresa:', error.message);
      }
    } catch (e) {
      console.warn('[LOGIN] Falha ao preparar sessão Supabase da empresa:', e);
    }
  }, []);

  // Load admin settings from localStorage for trial days, prices and WhatsApp
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('fastcashflow_admin_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.trialDays) setTrialDays(parseInt(parsed.trialDays, 10) || 30);
          if (parsed.monthlyPrice) setMonthlyPrice(parsed.monthlyPrice);
          if (parsed.yearlyPrice) setYearlyPrice(parsed.yearlyPrice);
          if (parsed.whatsappNumber) setWhatsappNumber(parsed.whatsappNumber);
        }
      } catch { }
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          // Usar localStorage para persistir sessão entre refreshes
          const v = window.localStorage.getItem(KEY);
          const role = (window.localStorage.getItem(ROLE_KEY) as 'admin' | 'user') || 'user';
          if (v === '1') { onOk(role); return; }
          try {
            const r = window.localStorage.getItem('remember_user') === '1';
            const name = window.localStorage.getItem('remember_name') || '';
            console.log('[LOGIN] Carregando remember:', r, 'name:', name);
            setRemember(r);
            if (r && name) {
              setUser(name);
              console.log('[LOGIN] Nome de usuário restaurado:', name);
            }
          } catch (e) {
            console.error('[LOGIN] Erro ao carregar remember:', e);
          }
        } else {
          const v = await SecureStore.getItemAsync(KEY);
          const role = (await SecureStore.getItemAsync(ROLE_KEY) as 'admin' | 'user') || 'user';
          if (v === '1') { onOk(role); return; }
          try {
            const r = (await SecureStore.getItemAsync('remember_user')) === '1';
            const name = (await SecureStore.getItemAsync('remember_name')) || '';
            setRemember(r);
            if (r && name) setUser(name);
          } catch { }
        }
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const finishSession = async (role: 'admin' | 'user', u: string, originalUsername?: string) => {
    // Salvar sessão inicial (será atualizado com nome real da empresa abaixo)
    // u é o nome normalizado, originalUsername é o que o usuário digitou
    const displayName = originalUsername || u;
    // Usar localStorage para persistir sessão entre refreshes da página
    if (Platform.OS === 'web') { window.localStorage.setItem(KEY, '1'); window.localStorage.setItem(ROLE_KEY, role); window.localStorage.setItem('auth_name', displayName.trim()); }
    else { await SecureStore.setItemAsync(KEY, '1'); await SecureStore.setItemAsync(ROLE_KEY, role); await SecureStore.setItemAsync('auth_name', displayName.trim()); }

    try {
      let compRes = await supabase.from('companies').select('id,name,username,logo_url,status,trial_end,deleted_at').ilike('username', u).maybeSingle();
      let comp = compRes.data as any;
      if (!comp?.id) {
        const byName = await supabase.from('companies').select('id,name,username,logo_url,status,trial_end,deleted_at').ilike('name', u).maybeSingle();
        comp = byName.data as any;
      }
      if (comp?.id) {
        // Atualizar auth_name com o nome REAL da empresa do banco (preserva espaços e caracteres especiais)
        const realCompanyName = comp.name || u.trim();
        if (Platform.OS === 'web') { window.localStorage.setItem('auth_name', realCompanyName); }
        else { await SecureStore.setItemAsync('auth_name', realCompanyName); }

        // Bloqueio para empresas excluídas (soft delete)
        if (comp.deleted_at) {
          const deletedAt = new Date(comp.deleted_at);
          const days = Math.max(0, 90 - Math.floor((Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)));
          setError(`Empresa bloqueada. Entre em contato e regularize para voltar a ter acesso. Restam ${days} dia${days === 1 ? '' : 's'} para exclusão definitiva. Contato: (79) 9 0000-0000`);
          return;
        }
        // Verificar se trial expirou
        if (comp.status === 'trial' && comp.trial_end) {
          const trialEnd = new Date(comp.trial_end);
          const now = new Date();
          if (now > trialEnd) {
            // Trial expirado - mostrar modal de upgrade
            setExpiredCompanyId(comp.id);
            setUpgradeVisible(true);
            setError('');
            return;
          }
        }

        // Verificar se está bloqueado ou expirado
        if (comp.status === 'blocked' || comp.status === 'expired') {
          setExpiredCompanyId(comp.id);
          setUpgradeVisible(true);
          setError('');
          return;
        }

        // Limpar cache de sync antes de trocar de empresa
        clearCompanyIdCache();

        if (Platform.OS === 'web') { window.localStorage.setItem('auth_company_id', comp.id); }
        else { await SecureStore.setItemAsync('auth_company_id', comp.id); }

        console.log('[🔐 LOGIN] Company ID salvo:', comp.id);
        try { await setLogoUrl(comp.logo_url || null); } catch { }
        try { await refreshCompanyProfile(); } catch { }
      }
    } catch { }

    try {
      // Usar o nome original que o usuário digitou para o remember
      const nameToSave = originalUsername || displayName;
      console.log('[LOGIN] Salvando remember:', remember, 'username:', nameToSave);
      if (remember) {
        if (Platform.OS === 'web') {
          window.localStorage.setItem('remember_user', '1');
          window.localStorage.setItem('remember_name', nameToSave.trim());
          console.log('[LOGIN] Remember salvo no localStorage:', nameToSave.trim());
        }
        else {
          await SecureStore.setItemAsync('remember_user', '1');
          await SecureStore.setItemAsync('remember_name', nameToSave.trim());
          console.log('[LOGIN] Remember salvo no SecureStore:', nameToSave.trim());
        }
      } else {
        if (Platform.OS === 'web') {
          window.localStorage.removeItem('remember_user');
          window.localStorage.removeItem('remember_name');
          console.log('[LOGIN] Remember removido do localStorage');
        }
        else {
          await SecureStore.deleteItemAsync('remember_user');
          await SecureStore.deleteItemAsync('remember_name');
          console.log('[LOGIN] Remember removido do SecureStore');
        }
      }
    } catch (e) {
      console.error('[LOGIN] Erro ao salvar remember:', e);
    }
    try { await syncAll(); } catch { }
    onOk(role);
  };

  const normalizeLogin = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const login = async () => {
    setError('');
    const u = normalizeLogin(user.trim());
    let role: 'admin' | 'user' | null = null;
    let approvedMatchId: string | null = null;
    if (u === ADMIN_USER && pass === ADMIN_PASS) {
      role = 'admin';
      // Establish Supabase session for admin to access protected resources
      try {
        const { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASS });
        if (error) throw error;
      } catch (e: any) {
        try {
          await supabase.auth.signUp({ email: ADMIN_EMAIL, password: ADMIN_PASS });
          await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASS });
        } catch { }
      }
    } else if (u === USER && pass === PASS) {
      role = 'user';
      // Ensure Supabase session for a shared user across devices
      // Buscar email real da empresa em vez de usar email fictício
      let companyEmail = 'fastsavorys@supabase.com'; // fallback

      try {
        // Tentar buscar email da tabela companies
        const { data: companyData } = await supabase
          .from('companies')
          .select('email')
          .ilike('name', 'FastSavory\'s')
          .maybeSingle();

        if (companyData?.email) {
          companyEmail = companyData.email;
        }
      } catch (e) {
        console.warn('Erro ao buscar email da empresa:', e);
      }

      try {
        const { error } = await supabase.auth.signInWithPassword({ email: companyEmail, password: PASS });
        if (error) throw error;
      } catch (e: any) {
        try {
          await supabase.auth.signUp({ email: companyEmail, password: PASS });
          await supabase.auth.signInWithPassword({ email: companyEmail, password: PASS });
        } catch { }
      }
    } else {
      // Fluxo para empresas aprovadas pelo admin (usa colunas novas)
      try {
        console.log('[LOGIN DEBUG] Tentando login para username:', u, 'senha:', pass);

        // 1) tentar primeiro senha permanente (não abre modal)
        const reqPerm = await supabase
          .from('company_requests')
          .select('id, status, approved_username, temp_password, permanent_password')
          .eq('status', 'approved' as any)
          .ilike('approved_username', u)
          .maybeSingle();

        console.log('[LOGIN DEBUG] reqPerm result:', reqPerm);

        const okPerm = !reqPerm.error && reqPerm.data && (reqPerm.data as any).status === 'approved' && (reqPerm.data as any).permanent_password && normalizeLogin((reqPerm.data as any).approved_username || '') === u && (reqPerm.data as any).permanent_password === pass;
        console.log('[LOGIN DEBUG] okPerm:', okPerm);

        if (okPerm) {
          role = 'user';
        } else {
          // 2) tentar senha temporária (abre modal de primeira troca)
          const req = await supabase
            .from('company_requests')
            .select('id, status, approved_username, temp_password')
            .eq('status', 'approved' as any)
            .ilike('approved_username', u)
            .maybeSingle();

          console.log('[LOGIN DEBUG] req (temp) result:', req);

          const ok = !req.error && req.data && (req.data as any).status === 'approved' && normalizeLogin((req.data as any).approved_username || '') === u && (req.data as any).temp_password === pass;
          console.log('[LOGIN DEBUG] ok (temp):', ok);

          if (ok) {
            role = 'user';
            approvedMatchId = (req.data as any).id;
          } else {
            // 3) fallback: múltiplos registros aprovados
            const many = await supabase
              .from('company_requests')
              .select('id, status, approved_username, temp_password, permanent_password')
              .eq('status', 'approved' as any)
              .ilike('approved_username', u);

            console.log('[LOGIN DEBUG] many result:', many);

            const matchPerm = Array.isArray(many.data) ? (many.data as any[]).find(r => r.status === 'approved' && normalizeLogin(r.approved_username || '') === u && r.permanent_password === pass) : null;
            console.log('[LOGIN DEBUG] matchPerm:', matchPerm);

            if (matchPerm) {
              role = 'user';
            } else {
              const matchTemp = Array.isArray(many.data) ? (many.data as any[]).find(r => r.status === 'approved' && normalizeLogin(r.approved_username || '') === u && r.temp_password === pass) : null;
              console.log('[LOGIN DEBUG] matchTemp:', matchTemp);
              if (matchTemp) { role = 'user'; approvedMatchId = matchTemp.id; }
            }
          }
        }
      } catch (e: any) {
        console.log('[LOGIN DEBUG] Erro no fluxo de login:', e);
        // Ignorar erro aqui, continuamos para mensagem final se role continuar null
      }
    }
    if (!role) { setError('Credenciais inválidas'); return; }
    if (role === 'user' && approvedMatchId) {
      setMatchedReqId(approvedMatchId);
      setPendingUsername(user.trim()); // Salvar nome original, não normalizado
      setFirstLoginVisible(true);
      return;
    }

    // Para empresas aprovadas (não-admin), garantir sessão Supabase para que RLS permita ler companies.segment
    if (role === 'user' && u !== USER) {
      await ensureSupabaseCompanySession(u, pass);
    }
    await finishSession(role, u, user.trim()); // Passar nome original como terceiro parâmetro
  };

  // registration is handled in a separate screen now

  if (checking) return null;

  const loginFormContent = (
    <View style={{ width: '100%' }}>
      <TextInput
        value={user}
        onChangeText={(txt) => setUser(normalizeLogin(txt))}
        autoCapitalize="none"
        placeholder="Login"
        placeholderTextColor="#777676ff"
        style={{
          width: '100%',
          borderWidth: 1,
          borderColor: '#374151',
          borderRadius: 8,
          padding: 12,
          color: mode === 'dark' ? '#111' : theme.text,
          backgroundColor: mode === 'dark' ? '#eFFFFF' : '#eFFFFF',
        }}
      />
      <View style={{ width: '100%', position: 'relative', marginTop: 12 }}>
        <TextInput
          value={pass}
          onChangeText={setPass}
          autoCapitalize="none"
          secureTextEntry={!showPass}
          placeholder="Senha"
          placeholderTextColor="#777676ff"
          style={{
            width: '100%',
            borderWidth: 1,
            borderColor: '#374151',
            borderRadius: 8,
            padding: 12,
            paddingRight: 44,
            color: mode === 'dark' ? '#111' : theme.text,
            backgroundColor: mode === 'dark' ? '#FFFFFF' : '#eFFFFF',
          }}
        />
        <TouchableOpacity onPress={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 8, top: 8, padding: 8 }}>
          <Text>{showPass ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={{ color: '#D90429', marginTop: 8 }}>{error}</Text> : null}
      <TouchableOpacity onPress={() => setRemember(r => !r)} style={{ width: '100%', paddingVertical: 8, alignItems: 'flex-start', marginTop: 4 }}>
        <Text style={{ color: theme.text }}>{remember ? '☑' : '☐'} Lembrar nome de usuário</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={login} style={{ width: '100%', backgroundColor: '#D90429', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Entrar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => {
        const msg = encodeURIComponent('Gostaria de solicitar uma nova senha.');
        const url = `https://wa.me/${whatsappNumber}?text=${msg}`;
        if (Platform.OS === 'web') { window.open(url, '_blank'); } else { require('react-native').Linking.openURL(url); }
      }} style={{ width: '100%', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: theme.text, fontWeight: '600', textDecorationLine: 'underline' }}>Esqueci a senha</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => nav.navigate('Cadastro')} style={{ width: '100%', backgroundColor: '#FFC300', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 }}>
        <Text style={{ color: '#111', fontWeight: '800', fontSize: 15 }}>Comece agora – {trialDays} dias grátis</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <View style={{ width: '100%', maxWidth: 420, backgroundColor: theme.card, borderRadius: 12, padding: 20 }}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Image
              source={mode === 'dark'
                ? require('../../assets/landing/Logo White.png')
                : require('../../assets/landing/Logo Black.png')}
              resizeMode="contain"
              style={{ width: 140, height: 50 }}
            />
          </View>
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 12, textAlign: 'center' }}>Entrar</Text>
          {loginFormContent}
        </View>
        {/* Back Button */}
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={{ marginTop: 16, paddingVertical: 12, paddingHorizontal: 24 }}
          >
            <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>← Voltar à Tela Inicial</Text>
          </TouchableOpacity>
        )}
      </View>

      {firstLoginVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <View style={{ width: '100%', maxWidth: 420, backgroundColor: theme.card, borderRadius: 12, padding: 20 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800', marginBottom: 8 }}>🔐 Primeiro acesso</Text>
            <Text style={{ color: '#888', marginBottom: 16 }}>Por segurança, você deve criar uma nova senha permanente agora.</Text>
            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ color: theme.text, marginBottom: 4 }}>Nova senha *</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={newPass1}
                    onChangeText={setNewPass1}
                    secureTextEntry={!showNewPass1}
                    placeholder="Digite sua nova senha"
                    placeholderTextColor="#999"
                    style={{ borderWidth: 1, borderColor: '#374151', borderRadius: 8, padding: 12, paddingRight: 44, color: theme.text, backgroundColor: theme.background }}
                  />
                  <TouchableOpacity onPress={() => setShowNewPass1(s => !s)} style={{ position: 'absolute', right: 8, top: 8, padding: 8 }}>
                    <Text>{showNewPass1 ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View>
                <Text style={{ color: theme.text, marginBottom: 4 }}>Confirmar nova senha *</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={newPass2}
                    onChangeText={setNewPass2}
                    secureTextEntry={!showNewPass2}
                    placeholder="Digite novamente sua senha"
                    placeholderTextColor="#999"
                    style={{ borderWidth: 1, borderColor: '#374151', borderRadius: 8, padding: 12, paddingRight: 44, color: theme.text, backgroundColor: theme.background }}
                  />
                  <TouchableOpacity onPress={() => setShowNewPass2(s => !s)} style={{ position: 'absolute', right: 8, top: 8, padding: 8 }}>
                    <Text>{showNewPass2 ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {newPass1 && newPass2 && newPass1 !== newPass2 && (
                <Text style={{ color: '#D90429', fontSize: 12 }}>⚠️ As senhas não conferem</Text>
              )}
              {newPass1 && newPass2 && newPass1 === newPass2 && (
                <Text style={{ color: '#16A34A', fontSize: 12 }}>✓ As senhas conferem</Text>
              )}
            </View>
            <TouchableOpacity onPress={async () => {
              const normalizedName = normalizeLogin(pendingUsername || '');
              if (!matchedReqId) { setFirstLoginVisible(false); await finishSession('user', normalizedName, pendingUsername || ''); return; }
              if (!newPass1 || newPass1.length < 4) { setError('Senha deve ter no mínimo 4 caracteres'); return; }
              if (newPass1 !== newPass2) { setError('As senhas não conferem'); return; }
              const upd = await supabase.from('company_requests').update({ permanent_password: newPass1, temp_password: null } as any).eq('id', matchedReqId);
              if (upd.error) { setError('Falha ao atualizar a senha'); return; }
              setFirstLoginVisible(false);
              setNewPass1(''); setNewPass2(''); setShowNewPass1(false); setShowNewPass2(false);
              await ensureSupabaseCompanySession(normalizedName, newPass1);
              await finishSession('user', normalizedName, pendingUsername || '');
            }} style={{ width: '100%', backgroundColor: '#16A34A', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Alterar Senha Agora</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Upgrade Modal - Trial Expirado ou Bloqueado */}
      {upgradeVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <View style={{ width: '100%', maxWidth: 420, backgroundColor: theme.card, borderRadius: 12, padding: 20 }}>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>⏰ Período de Teste Expirado</Text>
            <Text style={{ color: '#888', marginBottom: 20, textAlign: 'center' }}>
              Seu teste gratuito terminou. Escolha um plano para continuar usando o Fast Cash Flow:
            </Text>

            {/* Plano Mensal */}
            <TouchableOpacity
              onPress={() => {
                const msg = encodeURIComponent(`Olá! Gostaria de assinar o plano MENSAL (R$ ${monthlyPrice}/mês) do Fast Cash Flow.`);
                const url = `https://wa.me/${whatsappNumber}?text=${msg}`;
                if (Platform.OS === 'web') { window.open(url, '_blank'); } else { require('react-native').Linking.openURL(url); }
              }}
              style={{ backgroundColor: '#2563EB', padding: 16, borderRadius: 8, marginBottom: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>💳 Plano Mensal</Text>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 }}>R$ {monthlyPrice}/mês</Text>
              <Text style={{ color: '#ddd', fontSize: 12, marginTop: 4 }}>Pagamento via cartão de crédito</Text>
            </TouchableOpacity>

            {/* Plano Anual */}
            <TouchableOpacity
              onPress={() => {
                const msg = encodeURIComponent(`Olá! Gostaria de assinar o plano ANUAL (R$ ${yearlyPrice}/ano) do Fast Cash Flow.`);
                const url = `https://wa.me/${whatsappNumber}?text=${msg}`;
                if (Platform.OS === 'web') { window.open(url, '_blank'); } else { require('react-native').Linking.openURL(url); }
              }}
              style={{ backgroundColor: '#16A34A', padding: 16, borderRadius: 8, marginBottom: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>💎 Plano Anual</Text>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 }}>R$ {yearlyPrice}/ano</Text>
              <Text style={{ color: '#FFC300', fontSize: 14, fontWeight: '700', marginTop: 4 }}>🎉 Economize 2 meses!</Text>
              <Text style={{ color: '#ddd', fontSize: 12, marginTop: 4 }}>Pagamento via cartão de crédito</Text>
            </TouchableOpacity>

            {/* Botão de WhatsApp */}
            <TouchableOpacity
              onPress={() => {
                const msg = encodeURIComponent('Olá! Preciso de ajuda com minha assinatura do Fast Cash Flow.');
                const url = `https://wa.me/${whatsappNumber}?text=${msg}`;
                if (Platform.OS === 'web') { window.open(url, '_blank'); } else { require('react-native').Linking.openURL(url); }
              }}
              style={{ backgroundColor: '#25D366', padding: 12, borderRadius: 8, marginBottom: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>💬 Falar com o suporte no WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setUpgradeVisible(false);
                setExpiredCompanyId(null);
              }}
              style={{ padding: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#888', textDecorationLine: 'underline' }}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
