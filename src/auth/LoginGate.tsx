import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, Image } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useSettings } from '../settings/SettingsProvider';
import { syncAll } from '../lib/sync';
import { useNavigation } from '@react-navigation/native';

const USER = 'fastsavorys';
const PASS = 'jerosafast';
const ADMIN_USER = 'jonatas';
const ADMIN_PASS = 'fastcashflow';
const ADMIN_EMAIL = 'admin@fastcashflow.com';
const KEY = 'auth_ok';
const ROLE_KEY = 'auth_role';

type Props = { onOk: (role: 'admin' | 'user') => void };

export default function LoginGate({ onOk }: Props) {
  const [user, setUser] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [error, setError] = React.useState('');
  const [checking, setChecking] = React.useState(true);
  const [showPass, setShowPass] = React.useState(false);
  const { mode, setMode, theme } = useThemeCtx();
  const nav = useNavigation<any>();
  const { setLogoUrl } = useSettings();
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
      } catch {}
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          const v = window.sessionStorage.getItem(KEY);
          const role = (window.sessionStorage.getItem(ROLE_KEY) as 'admin' | 'user') || 'user';
          if (v === '1') { onOk(role); return; }
          try {
            const r = window.localStorage.getItem('remember_user') === '1';
            const name = window.localStorage.getItem('remember_name') || '';
            setRemember(r);
            if (r && name) setUser(name);
          } catch {}
        } else {
          const v = await SecureStore.getItemAsync(KEY);
          const role = (await SecureStore.getItemAsync(ROLE_KEY) as 'admin' | 'user') || 'user';
          if (v === '1') { onOk(role); return; }
          try {
            const r = (await SecureStore.getItemAsync('remember_user')) === '1';
            const name = (await SecureStore.getItemAsync('remember_name')) || '';
            setRemember(r);
            if (r && name) setUser(name);
          } catch {}
        }
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const finishSession = async (role: 'admin' | 'user', u: string) => {
    if (Platform.OS === 'web') { window.sessionStorage.setItem(KEY, '1'); window.sessionStorage.setItem(ROLE_KEY, role); window.sessionStorage.setItem('auth_name', u.trim()); }
    else { await SecureStore.setItemAsync(KEY, '1'); await SecureStore.setItemAsync(ROLE_KEY, role); await SecureStore.setItemAsync('auth_name', u.trim()); }

    try {
      let compRes = await supabase.from('companies').select('id,name,username,logo_url,status,trial_end,deleted_at').ilike('username', u).maybeSingle();
      let comp = compRes.data as any;
      if (!comp?.id) {
        const byName = await supabase.from('companies').select('id,name,username,logo_url,status,trial_end,deleted_at').ilike('name', u).maybeSingle();
        comp = byName.data as any;
      }
      if (comp?.id) {
        // Bloqueio para empresas excluídas (soft delete)
        if (comp.deleted_at) {
          const deletedAt = new Date(comp.deleted_at);
          const days = Math.max(0, 90 - Math.floor((Date.now() - deletedAt.getTime()) / (1000*60*60*24)));
          setError(`Empresa bloqueada. Entre em contato e regularize para voltar a ter acesso. Restam ${days} dia${days===1?'':'s'} para exclusão definitiva. Contato: (79) 9 0000-0000`);
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
        
        if (Platform.OS === 'web') { window.sessionStorage.setItem('auth_company_id', comp.id); }
        else { await SecureStore.setItemAsync('auth_company_id', comp.id); }
        try { await setLogoUrl(comp.logo_url || null); } catch {}
      }
    } catch {}

    try {
      if (remember) {
        if (Platform.OS === 'web') { window.localStorage.setItem('remember_user','1'); window.localStorage.setItem('remember_name', u.trim()); }
        else { await SecureStore.setItemAsync('remember_user','1'); await SecureStore.setItemAsync('remember_name', u.trim()); }
      } else {
        if (Platform.OS === 'web') { window.localStorage.removeItem('remember_user'); window.localStorage.removeItem('remember_name'); }
        else { await SecureStore.deleteItemAsync('remember_user'); await SecureStore.deleteItemAsync('remember_name'); }
      }
    } catch {}
    try { await syncAll(); } catch {}
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
        } catch {}
      }
    } else if (u === USER && pass === PASS) {
      role = 'user';
      // Ensure Supabase session for a shared user across devices
      const email = 'fastsavorys@supabase.com';
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password: PASS });
        if (error) throw error;
      } catch (e: any) {
        try {
          await supabase.auth.signUp({ email, password: PASS });
          await supabase.auth.signInWithPassword({ email, password: PASS });
        } catch (e2: any) {
          setError('Falha ao autenticar no Supabase');
          return;
        }
      }
    } else {
      // Fluxo para empresas aprovadas pelo admin (usa colunas novas)
      try {
        // 1) tentar primeiro senha permanente (não abre modal)
        const reqPerm = await supabase
          .from('company_requests')
          .select('id, status, approved_username, temp_password, permanent_password')
          .eq('status', 'approved' as any)
          .ilike('approved_username', u)
          .maybeSingle();
        const okPerm = !reqPerm.error && reqPerm.data && (reqPerm.data as any).status === 'approved' && (reqPerm.data as any).permanent_password && normalizeLogin((reqPerm.data as any).approved_username || '') === u && (reqPerm.data as any).permanent_password === pass;
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
          const ok = !req.error && req.data && (req.data as any).status === 'approved' && normalizeLogin((req.data as any).approved_username || '') === u && (req.data as any).temp_password === pass;
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
            const matchPerm = Array.isArray(many.data) ? (many.data as any[]).find(r => r.status === 'approved' && normalizeLogin(r.approved_username || '') === u && r.permanent_password === pass) : null;
            if (matchPerm) {
              role = 'user';
            } else {
              const matchTemp = Array.isArray(many.data) ? (many.data as any[]).find(r => r.status === 'approved' && normalizeLogin(r.approved_username || '') === u && r.temp_password === pass) : null;
              if (matchTemp) { role = 'user'; approvedMatchId = matchTemp.id; }
            }
          }
        }
      } catch (e: any) {
        // Ignorar erro aqui, continuamos para mensagem final se role continuar null
      }
    }
    if (!role) { setError('Credenciais inválidas'); return; }
    if (role === 'user' && approvedMatchId) {
      setMatchedReqId(approvedMatchId);
      setPendingUsername(u);
      setFirstLoginVisible(true);
      return;
    }
    await finishSession(role, u);
  };

  // registration is handled in a separate screen now

  if (checking) return null;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background, padding: 16 }}>
      <View style={{ position: 'absolute', top: 16, right: 16 }}>
        <TouchableOpacity onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: theme.text, fontWeight: '700' }}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Image
          source={mode === 'dark' ? require('../../Logo White.png') : require('../../Logo Black.png')}
          resizeMode="contain"
          style={{ width: 120, height: 60, marginBottom: 8 }}
        />
        <Text style={{ color: theme.text, fontSize: 25, fontWeight: '800' }}>FAST CASH FLOW</Text>
      </View>
      <TextInput
        value={user}
        onChangeText={(txt) => setUser(normalizeLogin(txt))}
        autoCapitalize="none"
        placeholder="Login"
        placeholderTextColor="#777676ff"
        style={{
          width: '100%',
          maxWidth: 360,
          borderWidth: 1,
          borderColor: '#374151',
          borderRadius: 8,
          padding: 12,
          color: mode === 'dark' ? '#111' : theme.text,
          backgroundColor: mode === 'dark' ? '#eFFFFF' : '#eFFFFF',
        }}
      />
      <View style={{ width: '100%', maxWidth: 360, position: 'relative', marginTop: 12 }}>
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
      <TouchableOpacity onPress={() => setRemember(r => !r)} style={{ width: '100%', maxWidth: 360, paddingVertical: 8, alignItems: 'flex-start', marginTop: 4 }}>
        <Text style={{ color: theme.text }}>{remember ? '☑' : '☐'} Lembrar nome de usuário</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={login} style={{ width: '100%', maxWidth: 360, backgroundColor: '#D90429', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Entrar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => {
        const msg = encodeURIComponent('Gostaria de solicitar uma nova senha.');
        const url = `https://wa.me/${whatsappNumber}?text=${msg}`;
        if (Platform.OS === 'web') { window.open(url, '_blank'); } else { require('react-native').Linking.openURL(url); }
      }} style={{ width: '100%', maxWidth: 360, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: theme.text, fontWeight: '600', textDecorationLine: 'underline' }}>Esqueci a senha</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => nav.navigate('Cadastro')} style={{ width: '100%', maxWidth: 360, backgroundColor: '#FFC300', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 }}>
        <Text style={{ color: '#111', fontWeight: '800' }}>Teste {trialDays} dias Grátis!</Text>
      </TouchableOpacity>

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
              if (!matchedReqId) { setFirstLoginVisible(false); await finishSession('user', pendingUsername || ''); return; }
              if (!newPass1 || newPass1.length < 4) { setError('Senha deve ter no mínimo 4 caracteres'); return; }
              if (newPass1 !== newPass2) { setError('As senhas não conferem'); return; }
              const upd = await supabase.from('company_requests').update({ permanent_password: newPass1, temp_password: null } as any).eq('id', matchedReqId);
              if (upd.error) { setError('Falha ao atualizar a senha'); return; }
              setFirstLoginVisible(false);
              setNewPass1(''); setNewPass2(''); setShowNewPass1(false); setShowNewPass2(false);
              await finishSession('user', pendingUsername || '');
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
