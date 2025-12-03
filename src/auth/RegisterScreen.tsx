import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import NativeDatePicker from '../utils/NativeDatePicker';
import { useNavigation } from '@react-navigation/native';

export default function RegisterScreen() {
  const { theme, mode, setMode } = useThemeCtx();
  const nav = useNavigation<any>();
  const [companyName, setCompanyName] = React.useState('');
  const [ownerName, setOwnerName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [cnpj, setCnpj] = React.useState('');
  const [foundedOn, setFoundedOn] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [trialDays, setTrialDays] = React.useState(30);
  const [monthlyPrice, setMonthlyPrice] = React.useState('9.99');
  const [yearlyPrice, setYearlyPrice] = React.useState('99.99');

  // Load admin settings from localStorage for trial days and prices
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('fastcashflow_admin_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.trialDays) setTrialDays(parseInt(parsed.trialDays, 10) || 30);
          if (parsed.monthlyPrice) setMonthlyPrice(parsed.monthlyPrice);
          if (parsed.yearlyPrice) setYearlyPrice(parsed.yearlyPrice);
        }
      } catch {}
    }
  }, []);

  const submit = async () => {
    setMsg('');
    if (!companyName || !ownerName || !phone) { setMsg('Preencha os campos obrigatórios'); return; }
    setSubmitting(true);
    try {
      const payload: any = {
        company_name: companyName,
        owner_name: ownerName,
        email: email || null,
        phone,
        address: address || null,
        cnpj: cnpj || null,
        founded_on: foundedOn || null,
      };
      
      console.log('📤 Enviando cadastro:', payload);
      
      const { data, error } = await supabase.from('company_requests').insert(payload);
      
      console.log('📡 Resposta do Supabase:', { data, error });
      
      if (error) {
        console.error('❌ Erro detalhado:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('✅ Cadastro enviado com sucesso!');
      setMsg('ok');
    } catch (e: any) {
      console.error('❌ Exceção ao cadastrar:', e);
      setMsg(`Falha ao enviar solicitação: ${e.message || 'Erro desconhecido'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ position: 'absolute', top: 16, right: 16 }}>
        <TouchableOpacity onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: theme.text, fontWeight: '700' }}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#333', alignItems: 'center' }}>
        <Text style={{ color: '#16A34A', fontSize: 20, fontWeight: '800' }}>Cadastro</Text>
        <Text style={{ color: '#9b9999ff', marginTop: 4 }}>Preencha os dados para solicitar acesso. Teste grátis de {trialDays} dias.</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <TextInput value={companyName} onChangeText={setCompanyName} placeholder="Nome da empresa *" placeholderTextColor="#999" style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, padding: 12, color: theme.text, backgroundColor: '#000' }} />
        <TextInput value={ownerName} onChangeText={setOwnerName} placeholder="Nome do proprietário *" placeholderTextColor="#999" style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, padding: 12, color: theme.text, backgroundColor: '#000' }} />
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, padding: 12, color: theme.text, backgroundColor: '#000' }} />
        <TextInput value={phone} onChangeText={setPhone} placeholder="Telefone de contato *" placeholderTextColor="#999" keyboardType="phone-pad" style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, padding: 12, color: theme.text, backgroundColor: '#000' }} />
        <TextInput value={address} onChangeText={setAddress} placeholder="Endereço (Rua, n.°, Bairro, Cidade, Estado)" placeholderTextColor="#999" style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, padding: 12, color: theme.text, backgroundColor: '#000' }} />
        <TextInput value={cnpj} onChangeText={setCnpj} placeholder="CNPJ" placeholderTextColor="#999" keyboardType="number-pad" style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, padding: 12, color: theme.text, backgroundColor: '#000' }} />
        {Platform.OS === 'web' ? (
          <View>
            <Text style={{ color: theme.text, marginBottom: 4 }}>Data de Criação</Text>
            {/* @ts-ignore */}
            <input type="date" value={foundedOn} onChange={(e: any) => setFoundedOn(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #444', background: '#000', color: theme.text }} />
          </View>
        ) : (
          <View>
            <Text style={{ color: theme.text, marginBottom: 4 }}>Data de Criação</Text>
            <TouchableOpacity onPress={() => setFoundedOn((prev) => prev || new Date().toISOString().slice(0,10))} style={{ borderWidth: 1, borderColor: '#9ca3af', borderRadius: 8, padding: 12, backgroundColor: '#d1d5db' }}>
              <Text style={{ color: theme.text }}>{foundedOn || 'Selecionar data'}</Text>
            </TouchableOpacity>
            {!!foundedOn && (
              <NativeDatePicker value={new Date(foundedOn)} mode="date" onChange={(d: Date) => { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); setFoundedOn(`${y}-${m}-${dd}`); }} />
            )}
          </View>
        )}
        {msg && msg !== 'ok' ? <Text style={{ color: '#D90429' }}>{msg}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => nav.goBack()} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
            <Text style={{ color: theme.text, backgroundColor: '#0ea5e9', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8,fontWeight: '700' }}>Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={submitting} onPress={submit} style={{ backgroundColor: '#16A34A', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{submitting ? 'Enviando...' : 'Enviar'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 16 }} />
        <Text style={{ color: '#888' }}>Planos: R$ 9,99/mês ou <Text style={{color: '#ff0000ff' }}><strong>R$ 99,99</strong></Text>/ano. Cobrança via cartão de crédito após aprovação.</Text>
      </ScrollView>
      {msg === 'ok' && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <View style={{ width: '100%', maxWidth: 420, backgroundColor: theme.card, borderRadius: 12, padding: 20 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Solicitação recebida</Text>
            <Text style={{ color: '#aaa', marginBottom: 16 }}>Recebemos a sua solicitação, o seu cadastro será liberado em até 48h úteis.</Text>
            <TouchableOpacity onPress={() => nav.goBack()} style={{ backgroundColor: '#16A34A', padding: 12, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
