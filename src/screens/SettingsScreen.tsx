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

export default function SettingsScreen() {
  const { mode } = useThemeCtx();
  const dark = mode === 'dark';
  const { theme } = useThemeCtx();
  const { settings, setLogoUrl } = useSettings();
  const [logo, setLogo] = React.useState(settings.logoUrl || '');
  const toast = useToast();
  const { lang, setLang, currency, setCurrency } = useI18n();
  const [newPass, setNewPass] = React.useState('');
  const [changing, setChanging] = React.useState(false);
  const [trialDays, setTrialDays] = React.useState(30);
  const [monthlyPrice, setMonthlyPrice] = React.useState('9.99');
  const [yearlyPrice, setYearlyPrice] = React.useState('99.99');
  const navigation = useNavigation<any>();

  const changePassword = async () => {
    try {
      setChanging(true);
      const name = (typeof window !== 'undefined' ? (window.sessionStorage.getItem('auth_name') || '') : '').toLowerCase();
      if (!name) { toast.show('Não autenticado', 'error'); return; }
      // Encontrar empresa pelo nome
      const { data: comp, error: cErr } = await supabase.from('companies').select('id,name,last_password_change').ilike('name', name).maybeSingle();
      if (cErr) throw cErr;
      if (!comp) { toast.show('Empresa não encontrada', 'error'); return; }
      // Regra: 1 vez por mês
      if (comp.last_password_change) {
        const last = new Date(comp.last_password_change);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000*60*60*24));
        if (diffDays < 30) { toast.show(`Você só pode alterar a senha a cada 30 dias. Restam ${30 - diffDays} dias.`, 'error'); return; }
      }
      if (!newPass || newPass.length < 4) { toast.show('Informe uma nova senha (mínimo 4 caracteres)', 'error'); return; }
      // Atualiza senha provisória na request aprovada ligada à empresa, e marca data na companies
      const { error: upReqErr } = await supabase.from('company_requests')
        .update({ approved_temp_password: newPass })
        .eq('approved_company_id', comp.id)
        .eq('approved', true);
      if (upReqErr) throw upReqErr;
      const today = new Date().toISOString().slice(0,10);
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
            style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: '#D90429' }]}
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
        </View>
      </View>
      <View style={{ gap: 6, marginTop: 12 }}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>Alterar senha</Text>
        <TextInput value={newPass} onChangeText={setNewPass} placeholder="Nova senha" placeholderTextColor="#999" secureTextEntry style={[styles.input, { color: theme.text, backgroundColor: theme.card }]} />
        <TouchableOpacity disabled={changing} onPress={changePassword} style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: '#16A34A', alignSelf: 'flex-start' }]}>
          <Text style={styles.prettyBtnText}>{changing ? 'Salvando...' : 'Salvar nova senha'}</Text>
        </TouchableOpacity>
        <Text style={{ color: '#888' }}>Regra: apenas 1 alteração a cada 30 dias.</Text>
      </View>
      <View style={{ gap: 6, marginTop: 14 }}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>Metas financeiras mensais</Text>
        <Text style={{ color: '#888', fontSize: 12 }}>
          Use o Dashboard para definir e acompanhar a meta de faturamento do mês.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Dashboard')}
          style={[styles.prettyBtn, styles.prettyBtnWide, { backgroundColor: '#16A34A', alignSelf: 'flex-start' }]}
        >
          <Text style={styles.prettyBtnText}>Ir para Meta Mensal</Text>
        </TouchableOpacity>
      </View>
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
});
