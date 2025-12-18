import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { useToast } from '../../ui/ToastProvider';
import { supabase } from '../../lib/supabase';
// Removed Identity Visual configuration

export default function AdminSettingsScreen() {
  const { theme, mode } = useThemeCtx();
  const inputBg = mode === 'dark' ? '#000000ff' : '#ffffffff';
  const inputBorder = mode === 'dark' ? '#000000' : '#ffffffff';
  const { t } = useI18n();
  const toast = useToast();

  const [defaultPlanPrice, setDefaultPlanPrice] = React.useState('99.90');
  const [supportEmail, setSupportEmail] = React.useState('suporte@fastcashflow.com');
  const [supportPhone, setSupportPhone] = React.useState('5573999348552');
  const [whatsappNumber, setWhatsappNumber] = React.useState('5573999348552');
  const [adminPass, setAdminPass] = React.useState('');
  const [adminPass2, setAdminPass2] = React.useState('');
  const [changingAdminPass, setChangingAdminPass] = React.useState(false);
  const [adminTrialDays, setAdminTrialDays] = React.useState('30');
  const [monthlyPrice, setMonthlyPrice] = React.useState('9.99');
  const [yearlyPrice, setYearlyPrice] = React.useState('99.99');

  // Load admin settings from localStorage (simple persistence)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('fastcashflow_admin_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.trialDays) setAdminTrialDays(parsed.trialDays);
          if (parsed.monthlyPrice) setMonthlyPrice(parsed.monthlyPrice);
          if (parsed.yearlyPrice) setYearlyPrice(parsed.yearlyPrice);
          if (parsed.whatsappNumber) setWhatsappNumber(parsed.whatsappNumber);
        }
      } catch {}
    }
  }, []);

  const saveAdminSettings = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('fastcashflow_admin_settings', JSON.stringify({ 
          trialDays: adminTrialDays, 
          monthlyPrice, 
          yearlyPrice,
          whatsappNumber 
        }));
        toast.show('Configurações salvas', 'success');
      } catch {
        toast.show('Erro ao salvar configurações', 'error');
      }
    }
  };

  const handleSave = () => {
    // TODO: salvar configurações no Supabase
    console.log('Salvar configurações:', {
      defaultPlanPrice,
      adminTrialDays,
      supportEmail,
      supportPhone,
      whatsappNumber,
    });
  };

  const changeAdminPassword = async () => {
    try {
      if (!adminPass || adminPass.length < 4) { toast.show('Informe uma nova senha (mínimo 4 caracteres)', 'error'); return; }
      if (adminPass !== adminPass2) { toast.show('As senhas não coincidem', 'error'); return; }
      setChangingAdminPass(true);
      const { error } = await supabase.auth.updateUser({ password: adminPass });
      if (error) throw error;
      toast.show('Senha do admin alterada com sucesso!', 'success');
      setAdminPass('');
      setAdminPass2('');
    } catch (e) {
      toast.show('Falha ao alterar a senha do admin', 'error');
    } finally {
      setChangingAdminPass(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100, padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.text }]}>Configurações Administrativas</Text>

 <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.secondary }]}>Configurações de Plano</Text>
          
          <View style={{ gap: 8 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text, fontSize: 12 }}>Dias de teste gratuitos</Text>
              <TextInput
                value={adminTrialDays}
                onChangeText={setAdminTrialDays}
                placeholder="30"
                placeholderTextColor="#8b8b8bff"
                keyboardType="numeric"
                style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text, fontSize: 12 }}>Preço mensal (R$)</Text>
              <TextInput
                value={monthlyPrice}
                onChangeText={setMonthlyPrice}
                placeholder="9.99"
                placeholderTextColor="#8b8b8bff"
                keyboardType="numeric"
                style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text, fontSize: 12 }}>Preço anual (R$)</Text>
              <TextInput
                value={yearlyPrice}
                onChangeText={setYearlyPrice}
                placeholder="99.99"
                placeholderTextColor="#999"
                keyboardType="numeric"
                style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
              />
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Alterar Senha do Administrador</Text>
          <View style={{ gap: 8 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text, fontSize: 12 }}>Nova senha</Text>
              <TextInput
                value={adminPass}
                onChangeText={setAdminPass}
                placeholder="Nova senha"
                placeholderTextColor="#999"
                secureTextEntry
                style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
              />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text, fontSize: 12 }}>Confirmar nova senha</Text>
              <TextInput
                value={adminPass2}
                onChangeText={setAdminPass2}
                placeholder="Confirmar senha"
                placeholderTextColor="#999"
                secureTextEntry
                style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
              />
            </View>
            <TouchableOpacity disabled={changingAdminPass} onPress={changeAdminPassword} style={[styles.saveBtn, { backgroundColor: '#16A34A', alignSelf: 'flex-start' }]}>
              <Text style={[styles.saveBtnText, { color: '#fff' }]}>{changingAdminPass ? 'Salvando...' : 'Salvar nova senha'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.secondary }]}>Configurações de Suporte</Text>
          
          <View style={{ gap: 8 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text, fontSize: 12 }}>Email de suporte</Text>
              <TextInput
                value={supportEmail}
                onChangeText={setSupportEmail}
                placeholder="suporte@fastcashflow.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text, fontSize: 12 }}>Telefone de suporte</Text>
              <TextInput
                value={supportPhone}
                onChangeText={setSupportPhone}
                placeholder="5573999348552"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text, fontSize: 12 }}>WhatsApp para contato</Text>
              <TextInput
                value={whatsappNumber}
                onChangeText={setWhatsappNumber}
                placeholder="5573999348552"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: inputBorder }]}
              />
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Informações do Sistema</Text>
          
          <View style={{ gap: 8 }}>
            <View style={styles.infoRow}>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Versão do app</Text>
              <Text style={{ color: theme.text, fontSize: 12 }}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Ambiente</Text>
              <Text style={{ color: theme.text, fontSize: 12 }}>Produção</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Última atualização</Text>
              <Text style={{ color: theme.text, fontSize: 12 }}>01/11/2025</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={saveAdminSettings} style={[styles.saveBtn, { backgroundColor: '#16A34A' }]}>
          <Text style={[styles.saveBtnText, { color: '#fff' }]}>Salvar Configurações</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 8, padding: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 6, padding: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  saveBtn: { padding: 14, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
});
