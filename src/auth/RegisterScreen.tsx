import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, ScrollView, StyleSheet } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import NativeDatePicker from '../utils/NativeDatePicker';
import { useNavigation } from '@react-navigation/native';
import { fontSizes, spacing, radii, fontWeights } from '../theme';
import FilterDropdown from '../components/FilterDropdown';

// Plan features for the selected plan summary
const PLAN_FEATURES = {
  profissional: [
    '✓ Dashboard de fluxo de caixa',
    '✓ Contas a pagar e receber',
    '✓ Relatórios completos',
    '✓ Metas e diagnósticos',
    '✓ Notificações automáticas',
  ],
};

// Progress Indicator Component
function ProgressIndicator({ step, total }: { step: number; total: number }) {
  const { theme } = useThemeCtx();
  return (
    <View style={styles.progressContainer}>
      <Text style={[styles.stepText, { color: theme.textSecondary }]}>
        Passo {step} de {total}
      </Text>
      <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${(step / total) * 100}%`,
              backgroundColor: theme.primary,
            }
          ]}
        />
      </View>
    </View>
  );
}

// Plan Summary Component
function PlanSummary({ trialDays }: { trialDays: number }) {
  const { theme, mode } = useThemeCtx();
  return (
    <View style={[styles.planSummary, {
      backgroundColor: mode === 'dark' ? 'rgba(22,163,74,0.1)' : 'rgba(22,163,74,0.08)',
      borderColor: theme.primary,
    }]}>
      <View style={styles.planHeader}>
        <Text style={[styles.planName, { color: theme.primary }]}>Plano Profissional</Text>
        <View style={[styles.trialBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.trialBadgeText}>{trialDays} dias grátis</Text>
        </View>
      </View>
      <Text style={[styles.planTrialInfo, { color: theme.textSecondary }]}>Seu cadastro inicia em período de teste grátis.</Text>
      <View style={styles.planFeatures}>
        {PLAN_FEATURES.profissional.map((feature, i) => (
          <Text key={i} style={[styles.planFeature, { color: theme.text }]}>{feature}</Text>
        ))}
      </View>
    </View>
  );
}

export default function RegisterScreen() {
  const { theme, mode, setMode } = useThemeCtx();
  const nav = useNavigation<any>();
  const [companyName, setCompanyName] = React.useState('');
  const [companySegment, setCompanySegment] = React.useState('');
  const [ownerName, setOwnerName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [cnpj, setCnpj] = React.useState('');
  const [foundedOn, setFoundedOn] = React.useState<string>('');
  const [discountCouponCode, setDiscountCouponCode] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [trialDays, setTrialDays] = React.useState(30);
  const [monthlyPrice, setMonthlyPrice] = React.useState('9.99');
  const [yearlyPrice, setYearlyPrice] = React.useState('99.99');

  const SEGMENT_OPTIONS = React.useMemo(
    () => [
      'AutoCenter',
      'Doceria',
      'Equipamento',
      'Fornecedor',
      'Joalherias e Óticas',
      'Lanchonete',
      'Loja',
      'Materiais de Construção',
      'Mercado',
      'Outros',
      'Petshop',
      'Produção',
      'Restaurante',
      'Serviços',
      'Vestuário',
    ],
    []
  );

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
      } catch { }
    }
  }, []);

  const submit = async () => {
    setMsg('');
    if (!companyName || !ownerName || !phone) { setMsg('Preencha os campos obrigatórios'); return; }
    setSubmitting(true);
    try {
      const payloadBase: any = {
        company_name: companyName,
        owner_name: ownerName,
        email: email || null,
        phone,
        address: address || null,
        cnpj: cnpj || null,
        founded_on: foundedOn || null,
      };

      const payloadExtended: any = {
        ...payloadBase,
        segment: companySegment || null,
        discount_coupon_code: discountCouponCode.trim() || null,
      };

      console.log('📤 Enviando cadastro:', payloadExtended);

      let { data, error } = await supabase.from('company_requests').insert(payloadExtended);

      if (error && /column\s+"(segment|discount_coupon_code)"\s+of\s+relation\s+"company_requests"\s+does\s+not\s+exist/i.test(error.message || '')) {
        const extraInfo = [
          companySegment ? `Segmento: ${companySegment}` : null,
          discountCouponCode.trim() ? `Cupom: ${discountCouponCode.trim()}` : null,
        ].filter(Boolean).join(' | ');

        const addressWithExtras = extraInfo
          ? [address || '', extraInfo].filter(Boolean).join(' - ')
          : (address || null);

        const fallbackPayload: any = {
          ...payloadBase,
          address: addressWithExtras,
        };

        console.log('📤 Reenviando cadastro (fallback):', fallbackPayload);
        ({ data, error } = await supabase.from('company_requests').insert(fallbackPayload));
      }

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

  const inputStyle = [
    styles.input,
    {
      borderColor: theme.inputBorder,
      color: theme.text,
      backgroundColor: theme.input
    }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Theme Toggle */}
      <View style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <TouchableOpacity onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: theme.text, fontWeight: '700' }}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      {/* Header with Progress */}
      <View style={[styles.header, { borderColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.primary }]}>Cadastre sua empresa</Text>
        <ProgressIndicator step={1} total={3} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Plan Summary */}
        <PlanSummary trialDays={trialDays} />

        <View style={styles.formSection}>
          <FilterDropdown
            label="Segmento da empresa"
            options={SEGMENT_OPTIONS}
            selectedValue={companySegment}
            onSelect={setCompanySegment}
            theme={theme}
          />
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Dados da empresa</Text>

          <TextInput
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Nome da empresa *"
            placeholderTextColor={theme.inputPlaceholder}
            style={inputStyle}
          />
          <TextInput
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="Nome do proprietário *"
            placeholderTextColor={theme.inputPlaceholder}
            style={inputStyle}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.inputPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            style={inputStyle}
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Telefone de contato *"
            placeholderTextColor={theme.inputPlaceholder}
            keyboardType="phone-pad"
            style={inputStyle}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Informações adicionais</Text>

          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Endereço (Rua, n.°, Bairro, Cidade, Estado)"
            placeholderTextColor={theme.inputPlaceholder}
            style={inputStyle}
          />
          <TextInput
            value={cnpj}
            onChangeText={setCnpj}
            placeholder="CNPJ"
            placeholderTextColor={theme.inputPlaceholder}
            keyboardType="number-pad"
            style={inputStyle}
          />

          {Platform.OS === 'web' ? (
            <View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Data de Criação</Text>
              {/* @ts-ignore */}
              <input
                type="date"
                value={foundedOn}
                onChange={(e: any) => setFoundedOn(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.input,
                  color: theme.text,
                  fontSize: 14,
                }}
              />
            </View>
          ) : (
            <View>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Data de Criação</Text>
              <TouchableOpacity
                onPress={() => setFoundedOn((prev) => prev || new Date().toISOString().slice(0, 10))}
                style={[styles.dateButton, { borderColor: theme.inputBorder, backgroundColor: theme.input }]}
              >
                <Text style={{ color: theme.text }}>{foundedOn || 'Selecionar data'}</Text>
              </TouchableOpacity>
              {!!foundedOn && (
                <NativeDatePicker
                  value={new Date(foundedOn)}
                  mode="date"
                  onChange={(d: Date) => {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    setFoundedOn(`${y}-${m}-${dd}`);
                  }}
                />
              )}
            </View>
          )}

          <TextInput
            value={discountCouponCode}
            onChangeText={setDiscountCouponCode}
            placeholder="Cupom de Desconto"
            placeholderTextColor={theme.inputPlaceholder}
            autoCapitalize="characters"
            autoCorrect={false}
            style={inputStyle}
          />
        </View>

        {/* Error Message */}
        {msg && msg !== 'ok' && (
          <View style={[styles.errorBox, { backgroundColor: 'rgba(217,4,41,0.1)' }]}>
            <Text style={{ color: '#D90429' }}>{msg}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => nav.goBack()} style={[styles.secondaryBtn, { borderColor: theme.textSecondary }]}>
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={submitting}
            onPress={submit}
            style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: submitting ? 0.7 : 1 }]}
          >
            <Text style={styles.primaryBtnText}>{submitting ? 'Enviando...' : 'Enviar Cadastro'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => nav.navigate('Login')} style={{ alignSelf: 'center', marginTop: 12 }}>
          <Text style={{ color: theme.textSecondary, textDecorationLine: 'underline', fontWeight: '600' }}>Já possui conta? Acessar Login</Text>
        </TouchableOpacity>

        {/* Pricing Info */}
        <Text style={[styles.pricingInfo, { color: theme.textSecondary }]}>
          Após o período de teste: R$ {monthlyPrice}/mês ou R$ {yearlyPrice}/ano.
        </Text>
      </ScrollView>

      {/* Success Modal */}
      {msg === 'ok' && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={styles.modalIcon}>✅</Text>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Solicitação recebida!</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              Recebemos a sua solicitação. Seu cadastro será liberado em até 48h úteis.
            </Text>
            <TouchableOpacity onPress={() => nav.goBack()} style={[styles.modalBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.modalBtnText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.sm,
  },
  progressContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  stepText: {
    fontSize: fontSizes.xs,
    marginBottom: spacing.xs,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  planSummary: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  trialBadge: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  trialBadgeText: {
    color: '#fff',
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  planFeatures: {
    marginTop: 12,
  },
  planTrialInfo: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  planFeature: {
    fontSize: fontSizes.sm,
  },
  formSection: {
    gap: spacing.sm + 4,
  },
  sectionTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm + 4,
    fontSize: fontSizes.sm,
  },
  inputLabel: {
    fontSize: fontSizes.xs,
    marginBottom: spacing.xs,
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm + 4,
  },
  errorBox: {
    padding: spacing.sm + 4,
    borderRadius: radii.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontWeight: fontWeights.semibold,
  },
  primaryBtn: {
    flex: 2,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: fontWeights.bold,
  },
  pricingInfo: {
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.sm,
  },
  modalMessage: {
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  modalBtn: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    alignItems: 'center',
    width: '100%',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: fontWeights.bold,
  },
});
