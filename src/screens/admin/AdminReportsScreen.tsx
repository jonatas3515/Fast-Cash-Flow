import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions, Platform, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { listAllDebts } from '../../repositories/debts';
import { getAdminAppCompanyId } from '../../lib/company';
import { todayYMD } from '../../utils/date';

interface PaymentReport {
  company_id: string;
  company_name: string;
  total_paid: number;
  payments_count: number;
  last_payment: string;
  plan_price: number;
  discount_percent: number;
  final_price: number;
}

interface GeneralReport {
  total_companies: number;
  active_companies: number;
  total_revenue: number;
  monthly_revenue: number;
  trial_companies: number;
  blocked_companies: number;
}

// Mock repository functions (substituir por implementação real com Supabase)
async function getAdminPayments(filters?: {
  company_id?: string;
  start_date?: string;
  end_date?: string;
  order?: 'oldest' | 'newest';
}): Promise<PaymentReport[]> {
  // TODO: implementar com Supabase
  return [];
}

async function getAdminGeneralReport(): Promise<GeneralReport> {
  // TODO: implementar com Supabase
  return {
    total_companies: 0,
    active_companies: 0,
    total_revenue: 0,
    monthly_revenue: 0,
    trial_companies: 0,
    blocked_companies: 0,
  };
}

export default function AdminReportsScreen() {
  const { theme } = useThemeCtx();
  const { t, formatMoney } = useI18n();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 1024;

  const [selectedCompany, setSelectedCompany] = React.useState<string>('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [order, setOrder] = React.useState<'oldest' | 'newest'>('newest');
  const [adminCompanyId, setAdminCompanyId] = React.useState<string | null>(null);

  const generalReportQuery = useQuery({
    queryKey: ['admin-general-report'],
    queryFn: getAdminGeneralReport,
  });

  React.useEffect(() => {
    (async () => {
      try {
        const cid = await getAdminAppCompanyId();
        setAdminCompanyId(cid);
      } catch {
        setAdminCompanyId(null);
      }
    })();
  }, []);

  const debtsQuery = useQuery({
    queryKey: ['admin-debts-overdue', adminCompanyId],
    enabled: !!adminCompanyId,
    queryFn: async () => {
      if (!adminCompanyId) return [] as any[];
      return await listAllDebts(adminCompanyId as string);
    },
  });

  let hasOverdueDebts = false;
  let totalDebtsTotal = 0;
  let totalDebtsPaid = 0;
  let totalDebtsRemaining = 0;
  if (debtsQuery.data && debtsQuery.data.length > 0) {
    const today = todayYMD();
    for (const debt of debtsQuery.data as any[]) {
      const total = debt.total_cents || 0;
      const paidCount = debt.paid_installments || 0;
      const paid = paidCount * (debt.installment_cents || 0);
      const remaining = Math.max(0, total - paid);
      totalDebtsTotal += total;
      totalDebtsPaid += paid;
      totalDebtsRemaining += remaining;

      if (!total) continue;
      const baseDate = (debt as any).invoice_due_date || debt.start_date || '';
      const sParts = (baseDate || '').split('-').map((n: string) => parseInt(n, 10) || 0);
      const tParts = (today || '').split('-').map((n: string) => parseInt(n, 10) || 0);
      const monthsStart = sParts[0] * 12 + (sParts[1] - 1);
      const monthsToday = tParts[0] * 12 + (tParts[1] - 1);
      let elapsed = monthsToday - monthsStart;
      if (
        tParts[0] > sParts[0] ||
        (tParts[0] === sParts[0] && tParts[1] > sParts[1]) ||
        (tParts[0] === sParts[0] && tParts[1] === sParts[1] && tParts[2] > sParts[2])
      ) {
        elapsed = Math.max(0, elapsed + (tParts[2] > sParts[2] ? 1 : 0));
      }
      elapsed = Math.max(0, Math.min(debt.installment_count || 0, elapsed));
      if (elapsed > paidCount) {
        hasOverdueDebts = true;
      }
    }
  }

  const paymentsQuery = useQuery({
    queryKey: ['admin-payments', selectedCompany, startDate, endDate, order],
    queryFn: () => getAdminPayments({
      company_id: selectedCompany || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      order,
    }),
  });

  const formatCentsBRL = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  const resetFilters = () => {
    setSelectedCompany('');
    setStartDate('');
    setEndDate('');
    setOrder('newest');
  };

  const report = generalReportQuery.data;
  const payments = paymentsQuery.data || [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80, padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.text }]}>Relatórios Administrativos</Text>

        {debtsQuery.data && debtsQuery.data.length > 0 && (
          <View
            style={{
              borderWidth: 1,
              borderRadius: 8,
              padding: 12,
              backgroundColor: theme.card,
              borderColor: hasOverdueDebts ? '#f59e0b' : '#ddd',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: theme.text, fontWeight: '700' }}>Dívidas em Aberto</Text>
                <Text
                  style={{
                    color: hasOverdueDebts ? '#d97706' : '#888',
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {hasOverdueDebts
                    ? '⚠️ Existem parcelas em atraso na empresa administradora. Confirme os pagamentos na aba Débitos.'
                    : 'Dentro do limite'}
                </Text>
              </View>
              <Text
                style={{
                  color: hasOverdueDebts ? '#d97706' : theme.text,
                  fontSize: 20,
                  fontWeight: '800',
                }}
              >
                {formatCentsBRL(totalDebtsRemaining)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ color: '#888', fontSize: 12 }}>
                Pago: {formatCentsBRL(totalDebtsPaid)}
              </Text>
              <Text style={{ color: '#888', fontSize: 12 }}>
                Restante: {formatCentsBRL(totalDebtsRemaining)}
              </Text>
            </View>
          </View>
        )}

        {/* General Report Cards */}
        {report && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <View style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>Total de Empresas</Text>
              <Text style={[styles.cardValue, { color: theme.text }]}>{report.total_companies}</Text>
            </View>
            <View style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>Empresas Ativas</Text>
              <Text style={[styles.cardValue, { color: '#16A34A' }]}>{report.active_companies}</Text>
            </View>
            <View style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>Receita Total</Text>
              <Text style={[styles.cardValue, { color: '#16A34A' }]}>{formatCentsBRL(report.total_revenue)}</Text>
            </View>
            <View style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>Receita Mensal</Text>
              <Text style={[styles.cardValue, { color: '#16A34A' }]}>{formatCentsBRL(report.monthly_revenue)}</Text>
            </View>
            <View style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>Empresas em Trial</Text>
              <Text style={[styles.cardValue, { color: '#FFC300' }]}>{report.trial_companies}</Text>
            </View>
            <View style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>Empresas Bloqueadas</Text>
              <Text style={[styles.cardValue, { color: '#D90429' }]}>{report.blocked_companies}</Text>
            </View>
          </View>
        )}

        {/* Filters */}
        <View style={[styles.filtersCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Filtros de Pagamentos</Text>
          
          <View style={{ gap: 8 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text, fontSize: 12 }}>Empresa (ID)</Text>
              <TextInput
                value={selectedCompany}
                onChangeText={setSelectedCompany}
                placeholder="ID da empresa"
                placeholderTextColor="#999"
                style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.text, fontSize: 12 }}>Data inicial</Text>
                {isWeb ? (
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e: any) => setStartDate(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #444', background: theme.background, color: theme.text }}
                  />
                ) : (
                  <TextInput
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#999"
                    style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                  />
                )}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.text, fontSize: 12 }}>Data final</Text>
                {isWeb ? (
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e: any) => setEndDate(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #444', background: theme.background, color: theme.text }}
                  />
                ) : (
                  <TextInput
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#999"
                    style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                  />
                )}
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text, fontSize: 12 }}>Ordenar por</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setOrder('newest')}
                  style={[styles.orderBtn, { backgroundColor: order === 'newest' ? '#16A34A' : theme.background, borderColor: '#444' }]}
                >
                  <Text style={{ color: order === 'newest' ? '#fff' : theme.text }}>Mais recentes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setOrder('oldest')}
                  style={[styles.orderBtn, { backgroundColor: order === 'oldest' ? '#16A34A' : theme.background, borderColor: '#444' }]}
                >
                  <Text style={{ color: order === 'oldest' ? '#fff' : theme.text }}>Mais antigos</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={resetFilters} style={[styles.resetBtn, { backgroundColor: '#666' }]}>
              <Text style={{ color: '#fff' }}>Limpar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payments List */}
        <View style={[styles.paymentsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Pagamentos ({payments.length})
          </Text>

          {payments.length === 0 ? (
            <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>
              Nenhum pagamento encontrado com os filtros selecionados
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {payments.map((payment) => (
                <View key={payment.company_id} style={[styles.paymentItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.companyName, { color: theme.text }]}>{payment.company_name}</Text>
                    <Text style={[styles.paymentInfo, { color: '#888' }]}>
                      {payment.payments_count} pagamentos • Último: {payment.last_payment}
                    </Text>
                    <View style={styles.paymentValues}>
                      <Text style={{ color: theme.text }}>
                        Plano: {formatCentsBRL(payment.plan_price)}
                        {payment.discount_percent > 0 && ` (-${payment.discount_percent}%)`}
                      </Text>
                      <Text style={{ color: '#16A34A', fontWeight: '700' }}>
                        Final: {formatCentsBRL(payment.final_price)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.totalColumn}>
                    <Text style={{ color: '#888', fontSize: 11 }}>Total pago</Text>
                    <Text style={{ color: '#16A34A', fontSize: 16, fontWeight: '800' }}>
                      {formatCentsBRL(payment.total_paid)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  reportCard: { borderWidth: 1, borderRadius: 8, padding: 12, minWidth: 140 },
  cardLabel: { fontSize: 12, marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: '800' },
  filtersCard: { borderWidth: 1, borderRadius: 8, padding: 12 },
  paymentsCard: { borderWidth: 1, borderRadius: 8, padding: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8 },
  orderBtn: { borderWidth: 1, borderRadius: 6, padding: 8, flex: 1, alignItems: 'center' },
  resetBtn: { padding: 8, borderRadius: 6, alignItems: 'center' },
  paymentItem: { borderWidth: 1, borderRadius: 6, padding: 10 },
  companyName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  paymentInfo: { fontSize: 11, marginBottom: 4 },
  paymentValues: { flexDirection: 'row', justifyContent: 'space-between' },
  totalColumn: { alignItems: 'flex-end', justifyContent: 'center' },
});
