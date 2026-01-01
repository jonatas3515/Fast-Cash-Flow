import React from 'react';
import { View, Text, StyleSheet, Switch, TextInput, Button, TouchableOpacity, Platform, ScrollView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useSettings } from '../settings/SettingsProvider';
import { useToast } from '../ui/ToastProvider';
import * as ImagePicker from 'expo-image-picker';
import { useI18n } from '../i18n/I18nProvider';
import { useNavigation } from '@react-navigation/native';
import ScreenTitle from '../components/ScreenTitle';
import {
  getCompanyProfile,
  updateCompanyProfile,
  BUSINESS_TYPE_OPTIONS,
  REVENUE_RANGE_OPTIONS,
  MAIN_GOAL_OPTIONS,
  type CompanyProfile
} from '../repositories/company_profile';
import { getCurrentCompanyId } from '../lib/company';

export default function SettingsScreen() {
  const { mode } = useThemeCtx();
  const dark = mode === 'dark';
  const { theme } = useThemeCtx();
  const { settings, setLogoUrl } = useSettings();
  const [logo, setLogo] = React.useState(settings.logoUrl || '');
  const [companyEmail, setCompanyEmail] = React.useState('');
  const [savingEmail, setSavingEmail] = React.useState(false);
  const toast = useToast();
  const { lang, setLang, currency, setCurrency } = useI18n();
  const [newPass, setNewPass] = React.useState('');
  const [changing, setChanging] = React.useState(false);
  const [trialDays, setTrialDays] = React.useState(30);
  const [monthlyPrice, setMonthlyPrice] = React.useState('9.99');
  const [yearlyPrice, setYearlyPrice] = React.useState('99.99');
  const navigation = useNavigation<any>();

  // Estados para o perfil do negócio
  const [companyProfile, setCompanyProfile] = React.useState<CompanyProfile | null>(null);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [showBusinessTypeDropdown, setShowBusinessTypeDropdown] = React.useState(false);
  const [showRevenueDropdown, setShowRevenueDropdown] = React.useState(false);
  const [showGoalDropdown, setShowGoalDropdown] = React.useState(false);

  // Dados do Cupom Fiscal
  const [ownerName, setOwnerName] = React.useState('');
  const [companyAddress, setCompanyAddress] = React.useState('');
  const [savingReceiptInfo, setSavingReceiptInfo] = React.useState(false);

  // Carregar perfil do negócio ao iniciar
  React.useEffect(() => {
    loadCompanyProfile();
    loadCompanyEmail();
  }, []);

  const loadCompanyEmail = async () => {
    try {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return;

      const { data, error } = await supabase
        .from('companies')
        .select('email, owner_name, address')
        .eq('id', companyId)
        .single();

      if (!error && data) {
        if (data.email) setCompanyEmail(data.email);
        if (data.owner_name) setOwnerName(data.owner_name);
        if (data.address) setCompanyAddress(data.address);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const saveCompanyEmail = async () => {
    try {
      setSavingEmail(true);
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');

      const { error } = await supabase
        .from('companies')
        .update({ email: companyEmail })
        .eq('id', companyId);

      if (error) throw error;

      toast.show('Email da empresa atualizado!', 'success');
    } catch (error: any) {
      toast.show('Erro ao salvar email: ' + error.message, 'error');
    } finally {
      setSavingEmail(false);
    }
  };

  const saveReceiptInfo = async () => {
    try {
      setSavingReceiptInfo(true);
      const companyId = await getCurrentCompanyId();
      console.log('Salvando dados do cupom:', { companyId, ownerName, companyAddress }); // Debug
      if (!companyId) throw new Error('Empresa não identificada');

      const { data, error } = await supabase
        .from('companies')
        .update({
          owner_name: ownerName,
          address: companyAddress
        })
        .eq('id', companyId)
        .select();

      console.log('Resultado do update:', { data, error }); // Debug

      if (error) throw error;

      toast.show('Dados do cupom atualizados!', 'success');
    } catch (error: any) {
      console.error('Erro ao salvar dados do cupom:', error); // Debug
      toast.show('Erro ao salvar: ' + error.message, 'error');
    } finally {
      setSavingReceiptInfo(false);
    }
  };

  const loadCompanyProfile = async () => {
    try {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return;

      const profile = await getCompanyProfile(companyId);
      setCompanyProfile(profile);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const saveCompanyProfile = async () => {
    if (!companyProfile) return;

    try {
      setSavingProfile(true);
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');

      await updateCompanyProfile(companyId, {
        business_type: companyProfile.business_type,
        monthly_revenue_range: companyProfile.monthly_revenue_range,
        main_goal: companyProfile.main_goal,
      });

      toast.show('Perfil do negócio atualizado com sucesso!', 'success');
    } catch (error: any) {
      toast.show('Erro ao salvar perfil: ' + error.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const updateProfileField = (field: keyof CompanyProfile, value: string) => {
    if (!companyProfile) return;
    setCompanyProfile({ ...companyProfile, [field]: value });
  };

  const changePassword = async () => {
    try {
      setChanging(true);
      const name = (typeof window !== 'undefined' ? (window.localStorage.getItem('auth_name') || '') : '').toLowerCase();
      if (!name) { toast.show('Não autenticado', 'error'); return; }
      // Encontrar empresa pelo nome
      const { data: comp, error: cErr } = await supabase.from('companies').select('id,name,last_password_change').ilike('name', name).maybeSingle();
      if (cErr) throw cErr;
      if (!comp) { toast.show('Empresa não encontrada', 'error'); return; }
      // Regra: 1 vez por mês
      if (comp.last_password_change) {
        const last = new Date(comp.last_password_change);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 30) { toast.show(`Você só pode alterar a senha a cada 30 dias. Restam ${30 - diffDays} dias.`, 'error'); return; }
      }
      if (!newPass || newPass.length < 4) { toast.show('Informe uma nova senha (mínimo 4 caracteres)', 'error'); return; }
      // Atualiza senha provisória na request aprovada ligada à empresa, e marca data na companies
      const { error: upReqErr } = await supabase.from('company_requests')
        .update({ approved_temp_password: newPass })
        .eq('approved_company_id', comp.id)
        .eq('approved', true);
      if (upReqErr) throw upReqErr;
      const today = new Date().toISOString().slice(0, 10);
      const { error: upCompErr } = await supabase.from('companies').update({ last_password_change: today }).eq('id', comp.id);
      if (upCompErr) throw upCompErr;
      toast.show('Senha alterada com sucesso!', 'success');
      setNewPass('');
    } catch (e) {
      toast.show('Falha ao alterar a senha', 'error');
    } finally {
      setChanging(false);
    }
  };
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 32 }}>
      <ScreenTitle
        title="Configurações"
        subtitle="Personalize seu app"
      />
      {/* Removed duplicate theme toggle; header has the theme switch */}
      <View style={{ gap: 4 }}>
        <Text style={{ color: theme.text, fontSize: 12 }}>{useI18n().t('company_logo_url')}</Text>
        <TextInput
          value={logo}
          onChangeText={setLogo}
          placeholder="https://...logo.png"
          placeholderTextColor="#999"
          style={[styles.input, { color: theme.text, backgroundColor: theme.card }]}
        />
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <TouchableOpacity
            style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: '#16A34A' }]}
            onPress={async () => {
              await setLogoUrl(logo || null);
              toast.show(useI18n().t('logo_updated'), 'success');
            }}
          >
            <Text style={[styles.prettyBtnText, { color: '#fff' }]}>{useI18n().t('save_logo')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: theme.secondary }]}
            onPress={async () => {
              const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (perm.status !== 'granted') {
                toast.show(useI18n().t('allow_gallery'), 'error');
                return;
              }
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
              });
              if (!res.canceled && res.assets && res.assets[0]?.uri) {
                setLogo(res.assets[0].uri);
                await setLogoUrl(res.assets[0].uri);
                toast.show(useI18n().t('logo_updated'), 'success');
              }
            }}
          >
            <Text style={styles.prettyBtnText}>{useI18n().t('pick_gallery')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: theme.warning }]}
            onPress={async () => {
              // Restaurar logo padrão do sistema (limpa a logo personalizada)
              setLogo('');
              await setLogoUrl(null);
              toast.show('Logo restaurada para o padrão do sistema', 'success');
            }}
          >
            <Text style={[styles.prettyBtnText, { color: '#000' }]}>Restaurar Logo Padrão</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Email da Empresa */}
      <View style={{ gap: 4, marginTop: 16 }}>
        <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>📧 Email da Empresa</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 4 }}>
          Este email será exibido no menu lateral
        </Text>
        <TextInput
          value={companyEmail}
          onChangeText={setCompanyEmail}
          placeholder="contato@suaempresa.com.br"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, { color: theme.text, backgroundColor: theme.card }]}
        />
        <TouchableOpacity
          disabled={savingEmail}
          onPress={saveCompanyEmail}
          style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: '#16A34A', alignSelf: 'flex-start' }]}
        >
          <Text style={styles.prettyBtnText}>{savingEmail ? 'Salvando...' : 'Salvar Email'}</Text>
        </TouchableOpacity>
      </View>

      {/* Dados para Cupom Fiscal */}
      <View style={{ gap: 8, marginTop: 20, padding: 16, backgroundColor: theme.card, borderRadius: 12 }}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>🧾 Dados do Cupom Fiscal</Text>
        <Text style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
          Esses dados serão exibidos no Cupom Não Fiscal emitido pelo sistema.
        </Text>

        <View style={{ gap: 4 }}>
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>Nome do Proprietário</Text>
          <TextInput
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="Ex: João da Silva"
            placeholderTextColor="#999"
            style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
          />
        </View>

        <View style={{ gap: 4, marginTop: 8 }}>
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>Endereço Completo</Text>
          <TextInput
            value={companyAddress}
            onChangeText={setCompanyAddress}
            placeholder="Ex: Rua das Flores, 123 - Centro - São Paulo/SP"
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
            style={[styles.input, { color: theme.text, backgroundColor: theme.background, minHeight: 60, textAlignVertical: 'top' }]}
          />
        </View>

        <TouchableOpacity
          disabled={savingReceiptInfo}
          onPress={saveReceiptInfo}
          style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: '#16A34A', alignSelf: 'flex-start', marginTop: 12 }]}
        >
          <Text style={styles.prettyBtnText}>{savingReceiptInfo ? 'Salvando...' : 'Salvar Dados do Cupom'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ gap: 6, marginTop: 12 }}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>Alterar senha</Text>
        <TextInput value={newPass} onChangeText={setNewPass} placeholder="Nova senha" placeholderTextColor="#999" secureTextEntry style={[styles.input, { color: theme.text, backgroundColor: theme.card }]} />
        <TouchableOpacity disabled={changing} onPress={changePassword} style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: '#16A34A', alignSelf: 'flex-start' }]}>
          <Text style={styles.prettyBtnText}>{changing ? 'Salvando...' : 'Salvar nova senha'}</Text>
        </TouchableOpacity>
        <Text style={{ color: '#888' }}>Regra: apenas 1 alteração a cada 30 dias.</Text>
      </View>
      {/* Configuração de Impressora */}
      <View style={{ gap: 6, marginTop: 14 }}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>🖨️ Configuração de Impressora</Text>
        <Text style={{ color: '#888', fontSize: 12 }}>
          Configure a impressora para imprimir cupons fiscais e relatórios.
        </Text>
        <TouchableOpacity
          onPress={async () => {
            if (Platform.OS === 'web') {
              // Na web, usa o diálogo de impressão nativo do navegador
              toast.show('Na versão web, use Ctrl+P ou o botão de impressão em cada relatório/cupom.', 'info');
            } else {
              // No mobile, mostra opções de configuração
              toast.show('Use a opção de impressão diretamente nos cupons e relatórios.', 'info');
            }
          }}
          style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: '#6366F1', alignSelf: 'flex-start' }]}
        >
          <Text style={styles.prettyBtnText}>Testar Impressão</Text>
        </TouchableOpacity>
        <Text style={{ color: '#666', fontSize: 10, marginTop: 4 }}>
          💡 Dica: Na web, o navegador detecta automaticamente as impressoras instaladas no seu computador.
        </Text>
      </View>

      {/* Link para Perfil do Negócio */}
      <TouchableOpacity
        onPress={() => navigation.navigate('PerfilNegocio')}
        style={{ gap: 8, marginTop: 20, padding: 16, backgroundColor: theme.card, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>📊 Perfil do Negócio</Text>
          <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
            Personalize categorias, dicas e recomendações
          </Text>
        </View>
        <Text style={{ color: '#888', fontSize: 18 }}>→</Text>
      </TouchableOpacity>

      <View style={{ gap: 8 }}>
        <Text style={{ color: dark ? '#bbb' : '#666' }}>{useI18n().t('language')}</Text>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
          <TouchableOpacity style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: '#16A34A' }]} onPress={() => setLang('pt')}><Text style={[styles.prettyBtnText, { color: '#fff' }]}>Português</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: '#D90429' }]} onPress={() => setLang('en')}><Text style={[styles.prettyBtnText, { color: '#fff' }]}>English</Text></TouchableOpacity>
        </View>
        <Text style={{ color: dark ? '#bbb' : '#666' }}>{useI18n().t('currency_label')}</Text>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
          <TouchableOpacity style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: '#16A34A' }]} onPress={() => setCurrency('BRL')}><Text style={[styles.prettyBtnText, { color: '#fff' }]}>BRL</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: '#D90429' }]} onPress={() => setCurrency('USD')}><Text style={[styles.prettyBtnText, { color: '#fff' }]}>USD</Text></TouchableOpacity>
        </View>
        <Text style={{ color: dark ? '#bbb' : '#666' }}>{useI18n().t('current')}: {lang.toUpperCase()} • {currency}</Text>
      </View>
      <Text style={{ color: dark ? '#bbb' : '#666' }}>Moeda, idioma, PIN e backup serão configurados aqui.</Text>
      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, fontSize: 14 },
  prettyBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center' },
  prettyBtnWide: { minWidth: 180 },
  prettyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 150,
    zIndex: 1000,
    elevation: 3,
    // @ts-ignore - boxShadow for web compatibility (replaces deprecated shadow* props)
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
});
