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
          if (v === '1') {
            // IMPORTANTE: Verificar se company_id existe, se não, tentar restaurar
            let companyId = window.localStorage.getItem('auth_company_id');

            if (!companyId) {
              console.log('[🔄 LOGIN] company_id não encontrado, iniciando protocolos de restauração...');

              // ESTRATÉGIA 1: Tentar pelo nome salvo (auth_name)
              let authName = window.localStorage.getItem('auth_name');

              // ESTRATÉGIA 2: Tentar pelo remember_name se auth_name falhar
              if (!authName) {
                authName = window.localStorage.getItem('remember_name');
                if (authName) console.log('[🔄 LOGIN] Tentando restaurar usando remember_name:', authName);
              }

              if (authName) {
                try {
                  // Tentar buscar empresa pelo nome ou username
                  let compRes = await supabase.from('companies').select('id').ilike('name', authName).maybeSingle();
                  let comp = compRes.data as any;

                  if (!comp?.id) {
                    compRes = await supabase.from('companies').select('id').ilike('username', authName).maybeSingle();
                    comp = compRes.data as any;
                  }

                  if (comp?.id) {
                    window.localStorage.setItem('auth_company_id', comp.id);
                    companyId = comp.id;
                    console.log('[✅ LOGIN] company_id restaurado via NOME:', comp.id);
                  }
                } catch (e) {
                  console.error('[❌ LOGIN] Erro ao restaurar por nome:', e);
                }
              }

              // ESTRATÉGIA 3: Tentar pelo usuário logado no Supabase (último recurso)
              if (!companyId) {
                console.log('[🔄 LOGIN] Tentando restaurar via Sessão Supabase...');
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user?.email) {
                    // Tenta achar empresa onde o email é o dono ou tem acesso (simplificado pelo email/username)
                    // Nota: Isso é um "tiro no escuro" baseado no email, assumindo que o username pode ser o email
                    // ou tentando achar pelo metadados se houver.
                    // Por enquanto vamos tentar usar o email como username (comum em alguns casos)
                    // ou buscar na tabela de companies se houver coluna de email (não padrão aqui, mas...)

                    // Busca genérica tentando match no username
                    const possibleUsername = user.email.split('@')[0];
                    const compRes = await supabase.from('companies').select('id').ilike('username', possibleUsername).maybeSingle();
                    if (compRes.data?.id) {
                      window.localStorage.setItem('auth_company_id', compRes.data.id);
                      companyId = compRes.data.id;
                      console.log('[✅ LOGIN] company_id restaurado via SUPABASE USER:', companyId);
                    }
                  }
                } catch (e) {
                  console.error('[❌ LOGIN] Erro ao restaurar por usuário Supabase:', e);
                }
              }

              // SEPARAR SYNC DE RESTAURAÇÃO:
              // Se restaurou o companyId, garantir sync
              if (companyId) {
                // Antes de prosseguir, garantir sync inicial se possível
                // syncAll() verifica auth_company_id internamente, que acabamos de garantir se possível
                try {
                  console.log('[🔄 LOGIN] Sessão restaurada, sincronizando...');
                  // Não aguardar sync para não bloquear UI, mas disparar
                  syncAll().catch(e => console.warn('Sync background failed:', e));
                } catch { }
              }

              // CHECK FINAL: Se ainda não temos company_id, a sessão está corrompida.
              // Devemos limpar tudo para forçar um login limpo e evitar o loop de sync infinito.
              if (!companyId) {
                console.warn('[⛔ LOGIN] FALHA CRÍTICA na restauração. Sessão corrompida. Forçando logout...');
                window.localStorage.removeItem(KEY);
                window.localStorage.removeItem(ROLE_KEY);
                window.localStorage.removeItem('auth_name');
                window.localStorage.removeItem('auth_company_id');
                setChecking(false); // Para de verificar e mostra tela de login
                return; // Encerra aqui
              }
            }

            // Se chegou aqui, temos (ou recuperamos) o company_id
            onOk(role);
            return;
          }
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
          if (v === '1') {
            // IMPORTANTE: Verificar se company_id existe, se não, tentar restaurar
            let companyId = await SecureStore.getItemAsync('auth_company_id');
            if (!companyId) {
              console.log('[🔄 LOGIN] company_id não encontrado, tentando restaurar...');
              const authName = await SecureStore.getItemAsync('auth_name');
              if (authName) {
                try {
                  let compRes = await supabase.from('companies').select('id').ilike('name', authName).maybeSingle();
                  let comp = compRes.data as any;
                  if (!comp?.id) {
                    compRes = await supabase.from('companies').select('id').ilike('username', authName).maybeSingle();
                    comp = compRes.data as any;
                  }
                  if (comp?.id) {
                    await SecureStore.setItemAsync('auth_company_id', comp.id);
                    console.log('[✅ LOGIN] company_id restaurado:', comp.id);
                  } else {
                    console.warn('[⚠️ LOGIN] Não foi possível restaurar company_id para:', authName);
                  }
                } catch (e) {
                  console.error('[❌ LOGIN] Erro ao restaurar company_id:', e);
                }
              }
            }
            // For one last check, if we still don't have companyId, we should force clear to avoid corrupt state loops
            // BUT: only if role is user. Admin doesn't need companyId.
            if (role === 'user') {
              const finalCheck = await SecureStore.getItemAsync('auth_company_id');
              if (!finalCheck) {
                console.warn('[⛔ LOGIN] Falha crítica: role=user mas sem company_id no SecureStore. Logout forçado.');
                await SecureStore.deleteItemAsync(KEY);
                await SecureStore.deleteItemAsync(ROLE_KEY);
                await SecureStore.deleteItemAsync('auth_name');
                setChecking(false);
                return;
              }
            }
            onOk(role);
            return;
          }
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
    // u é o nome normalizado, originalUsername é o que o usuário digitou
    const displayName = originalUsername || u;

    // Caso especial para admin: não precisa de company logic
    if (role === 'admin') {
      if (Platform.OS === 'web') {
        window.localStorage.setItem(KEY, '1');
        window.localStorage.setItem(ROLE_KEY, 'admin');
        window.localStorage.removeItem('auth_company_id'); // Admin não tem empresa
      } else {
        await SecureStore.setItemAsync(KEY, '1');
        await SecureStore.setItemAsync(ROLE_KEY, 'admin');
        await SecureStore.deleteItemAsync('auth_company_id');
      }
      onOk('admin');
      return;
    }

    // Fluxo normal para users / companies
    // IMPORTANTE: Buscar e salvar company_id PRIMEIRO, antes de qualquer outra coisa
    // Isso garante que quando App.tsx chamar syncAll(), o company_id já estará disponível
    let companyIdSaved = false;

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

        // CRÍTICO: Salvar company_id PRIMEIRO, antes de tudo
        if (Platform.OS === 'web') {
          window.localStorage.setItem('auth_company_id', comp.id);
        } else {
          await SecureStore.setItemAsync('auth_company_id', comp.id);
        }
        companyIdSaved = true;
        console.log('[🔐 LOGIN] Company ID salvo PRIMEIRO:', comp.id);

        // Agora salvar os outros dados de sessão
        const realCompanyName = comp.name || u.trim();
        if (Platform.OS === 'web') {
          window.localStorage.setItem(KEY, '1');
          window.localStorage.setItem(ROLE_KEY, 'user'); // Força 'user'
          window.localStorage.setItem('auth_name', realCompanyName);
        } else {
          await SecureStore.setItemAsync(KEY, '1');
          await SecureStore.setItemAsync(ROLE_KEY, 'user'); // Força 'user'
          await SecureStore.setItemAsync('auth_name', realCompanyName);
        }

        try { await setLogoUrl(comp.logo_url || null); } catch { }
        try { await refreshCompanyProfile(); } catch { }
      } else {
        console.warn('[LOGIN] Não foi encontrado registro de empresa para:', u);
        setError('Erro ao carregar dados da empresa. Contate o suporte.');
        return; // Não prosseguir se não achou a empresa
      }
    } catch (e) {
      console.error('[LOGIN] Erro ao buscar/salvar company:', e);
      setError('Erro de conexão ao buscar empresa.');
      return;
    }

    if (!companyIdSaved) {
      // Se falhou em salvar company id, é crítico para users
      setError('Falha crítica de sessão. Tente novamente.');
      return;
    }

    // ... Remember user logic ok to keep ...
    // Salvar preferência de "lembrar usuário"
    try {
      const nameToSave = originalUsername || displayName;
      console.log('[LOGIN] Salvando remember:', remember, 'username:', nameToSave);
      if (remember) {
        if (Platform.OS === 'web') {
          window.localStorage.setItem('remember_user', '1');
          window.localStorage.setItem('remember_name', nameToSave.trim());
        }
        else {
          await SecureStore.setItemAsync('remember_user', '1');
          await SecureStore.setItemAsync('remember_name', nameToSave.trim());
        }
      } else {
        if (Platform.OS === 'web') {
          window.localStorage.removeItem('remember_user');
          window.localStorage.removeItem('remember_name');
        }
        else {
          await SecureStore.deleteItemAsync('remember_user');
          await SecureStore.deleteItemAsync('remember_name');
        }
      }
    } catch (e) {
      console.error('[LOGIN] Erro ao salvar remember:', e);
    }

    // Fazer sync inicial e AGUARDAR completar antes de navegar
    console.log('[🔄 LOGIN] Iniciando sync antes de onOk...');
    try {
      await syncAll();
      console.log('[✅ LOGIN] Sync concluído, chamando onOk');
    } catch (e) {
      console.warn('[⚠️ LOGIN] Sync falhou, mas continuando:', e);
    }

    onOk('user');
  };

  const normalizeLogin = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const login = async () => {
    setError('');
    const u = normalizeLogin(user.trim());
    let role: 'admin' | 'user' | null = null;
    let approvedMatchId: string | null = null;
    if (u === ADMIN_USER && pass === ADMIN_PASS) {
      role = 'admin';
      // Estabelecer sessão Supabase para admin (necessário para RLS e Storage)
      try {
        const { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASS });
        if (error) {
          console.log('[LOGIN ADMIN] Erro no signIn, tentando criar usuário admin...', error.message);
          // Se falhar (ex: usuário não existe), tenta criar e logar de novo
          const signUpRes = await supabase.auth.signUp({ email: ADMIN_EMAIL, password: ADMIN_PASS });
          if (signUpRes.error) console.warn('[LOGIN ADMIN] Warn no signUp:', signUpRes.error.message);

          const retry = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASS });
          if (retry.error) console.error('[LOGIN ADMIN] Falha fatal no sign in do admin:', retry.error.message);
        }
      } catch (e: any) {
        console.error('[LOGIN ADMIN] Exceção no fluxo de auth:', e);
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
