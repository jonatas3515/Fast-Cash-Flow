import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import {
  getCompaniesEngagement,
  getActivationMetrics,
  getEngagementOverview,
  CompanyEngagement,
  UserSegment,
  ACTIVATION_EVENTS,
} from '../../repositories/engagement_metrics';

const SEGMENT_LABELS: Record<UserSegment, { label: string; color: string; icon: string }> = {
  highly_engaged: { label: 'Muito Engajado', color: '#10B981', icon: '🌟' },
  regular: { label: 'Regular', color: '#3B82F6', icon: '👍' },
  at_risk: { label: 'Em Risco', color: '#F59E0B', icon: '⚠️' },
  dormant: { label: 'Dormante', color: '#EF4444', icon: '😴' },
  view_only: { label: 'Só Visualiza', color: '#8B5CF6', icon: '👀' },
  new_user: { label: 'Novo Usuário', color: '#06B6D4', icon: '🆕' },
};

export default function AdminEngagementScreen({ navigation }: { navigation: any }) {
  const { theme } = useThemeCtx();
  const [selectedSegment, setSelectedSegment] = useState<UserSegment | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Queries
  const engagementQuery = useQuery({
    queryKey: ['admin-engagement'],
    queryFn: getCompaniesEngagement,
  });

  const activationQuery = useQuery({
    queryKey: ['admin-activation-metrics'],
    queryFn: getActivationMetrics,
  });

  const overviewQuery = useQuery({
    queryKey: ['admin-engagement-overview'],
    queryFn: getEngagementOverview,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      engagementQuery.refetch(),
      activationQuery.refetch(),
      overviewQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const isLoading = engagementQuery.isLoading || activationQuery.isLoading || overviewQuery.isLoading;
  const hasError = engagementQuery.error || activationQuery.error || overviewQuery.error;
  const activation = activationQuery.data;
  const overview = overviewQuery.data;
  const companies = engagementQuery.data || [];

  // Filtrar empresas por segmento
  const filteredCompanies = selectedSegment === 'all'
    ? companies
    : companies.filter(c => c.segment === selectedSegment);

  const onRefreshAll = async () => {
    await Promise.all([
      engagementQuery.refetch(),
      activationQuery.refetch(),
      overviewQuery.refetch(),
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.text} />
        <Text style={{ color: theme.textSecondary, marginTop: 12 }}>Carregando engajamento...</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Não foi possível carregar os dados
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 20, textAlign: 'center', paddingHorizontal: 40 }}>
          Ocorreu um erro ao buscar métricas de engajamento. Verifique sua conexão e tente novamente.
        </Text>
        <TouchableOpacity
          onPress={onRefreshAll}
          style={{
            backgroundColor: '#3B82F6',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.title, { color: theme.text }]}>📊 Painel de Engajamento</Text>

      {/* Cards de Visão Geral */}
      <View style={styles.overviewCards}>
        <View style={[styles.overviewCard, { backgroundColor: '#DCFCE7' }]}>
          <Text style={styles.overviewIcon}>✅</Text>
          <Text style={[styles.overviewValue, { color: '#166534' }]}>{overview?.total_active_30d || 0}</Text>
          <Text style={styles.overviewLabel}>Ativos (30d)</Text>
        </View>
        <View style={[styles.overviewCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={styles.overviewIcon}>⚠️</Text>
          <Text style={[styles.overviewValue, { color: '#92400E' }]}>{overview?.total_at_risk || 0}</Text>
          <Text style={styles.overviewLabel}>Em Risco</Text>
        </View>
        <View style={[styles.overviewCard, { backgroundColor: '#FEE2E2' }]}>
          <Text style={styles.overviewIcon}>😴</Text>
          <Text style={[styles.overviewValue, { color: '#991B1B' }]}>{overview?.total_dormant || 0}</Text>
          <Text style={styles.overviewLabel}>Dormantes</Text>
        </View>
      </View>

      {/* Métricas de Ativação */}
      {activation && (
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🎯 Taxa de Ativação</Text>

          <View style={styles.activationHeader}>
            <View style={styles.activationRate}>
              <Text style={[styles.rateValue, { color: (activation.activation_rate ?? 0) >= 50 ? '#10B981' : '#EF4444' }]}>
                {activation.activation_rate ?? 0}%
              </Text>
              <Text style={[styles.rateLabel, { color: theme.textSecondary }]}>
                {activation.activated_companies ?? 0} de {activation.total_companies ?? 0} empresas
              </Text>
            </View>
          </View>

          {/* Funil de Ativação */}
          {Array.isArray(activation.funnel) && activation.funnel.length > 0 && (
            <>
              <Text style={[styles.funnelTitle, { color: theme.text }]}>Funil de Ativação:</Text>
              {activation.funnel.map((step, index) => (
                <View key={step.step} style={styles.funnelStep}>
                  <View style={styles.funnelInfo}>
                    <Text style={[styles.funnelStepNumber, { color: theme.textSecondary }]}>{index + 1}.</Text>
                    <Text style={[styles.funnelStepName, { color: theme.text }]}>{step.step}</Text>
                  </View>
                  <View style={styles.funnelBar}>
                    <View style={[styles.funnelFill, { width: `${step.percent}%`, backgroundColor: '#6366F1' }]} />
                  </View>
                  <Text style={[styles.funnelPercent, { color: theme.text }]}>{step.percent}%</Text>
                  <Text style={[styles.funnelCount, { color: theme.textSecondary }]}>({step.count})</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Segmentos */}
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>👥 Segmentos de Usuários</Text>

        <View style={styles.segmentsGrid}>
          {Array.isArray(overview?.segments) && overview.segments.map(seg => {
            const info = SEGMENT_LABELS[seg.segment];
            if (!info) return null; // Segmento desconhecido, pular
            return (
              <TouchableOpacity
                key={seg.segment}
                style={[
                  styles.segmentCard,
                  {
                    backgroundColor: info.color + '20',
                    borderColor: selectedSegment === seg.segment ? info.color : 'transparent',
                    borderWidth: 2,
                  }
                ]}
                onPress={() => setSelectedSegment(seg.segment === selectedSegment ? 'all' : seg.segment)}
              >
                <Text style={styles.segmentIcon}>{info.icon}</Text>
                <Text style={[styles.segmentCount, { color: info.color }]}>{seg.count}</Text>
                <Text style={[styles.segmentLabel, { color: info.color }]}>{info.label}</Text>
                <Text style={[styles.segmentPercent, { color: theme.textSecondary }]}>{seg.percent}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Lista de Empresas */}
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🏢 Empresas {selectedSegment !== 'all' && `(${SEGMENT_LABELS[selectedSegment].label})`}
          </Text>
          <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
            {filteredCompanies.length} empresas
          </Text>
        </View>

        {filteredCompanies.slice(0, 20).map(company => {
          const segInfo = SEGMENT_LABELS[company.segment];
          return (
            <View key={company.company_id} style={styles.companyCard}>
              <View style={styles.companyHeader}>
                <View style={styles.companyInfo}>
                  <Text style={[styles.companyName, { color: theme.text }]}>{company.company_name}</Text>
                  <View style={[styles.segmentBadge, { backgroundColor: segInfo.color + '20' }]}>
                    <Text style={[styles.segmentBadgeText, { color: segInfo.color }]}>
                      {segInfo.icon} {segInfo.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.activationBadge}>
                  <Text style={[
                    styles.activationScore,
                    { color: company.activation_score >= 80 ? '#10B981' : company.activation_score >= 50 ? '#F59E0B' : '#EF4444' }
                  ]}>
                    {company.activation_score}%
                  </Text>
                </View>
              </View>

              <View style={styles.companyStats}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: theme.text }]}>{company.transactions_this_month}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Lançamentos/mês</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: theme.text }]}>{company.active_days_this_month}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Dias ativos</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: company.days_since_activity > 7 ? '#EF4444' : theme.text }]}>
                    {company.days_since_activity}d
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Última atividade</Text>
                </View>
              </View>

              {/* Checklist de ativação */}
              <View style={styles.activationChecklist}>
                <Text style={[styles.checkItem, { color: company.has_products ? '#10B981' : '#9CA3AF' }]}>
                  {company.has_products ? '✓' : '○'} Produto
                </Text>
                <Text style={[styles.checkItem, { color: company.total_transactions > 0 ? '#10B981' : '#9CA3AF' }]}>
                  {company.total_transactions > 0 ? '✓' : '○'} Lançamento
                </Text>
                <Text style={[styles.checkItem, { color: company.has_goal ? '#10B981' : '#9CA3AF' }]}>
                  {company.has_goal ? '✓' : '○'} Meta
                </Text>
                <Text style={[styles.checkItem, { color: company.has_debts ? '#10B981' : '#9CA3AF' }]}>
                  {company.has_debts ? '✓' : '○'} Dívida
                </Text>
              </View>

              {/* Ações */}
              {(company.segment === 'at_risk' || company.segment === 'dormant') && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#6366F1' }]}
                  onPress={() => navigation.navigate('Comunicados', {
                    preselectedCompanies: [company.company_id],
                    segment: company.segment,
                  })}
                >
                  <Text style={styles.actionBtnText}>📨 Enviar Mensagem</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {filteredCompanies.length > 20 && (
          <Text style={[styles.moreText, { color: theme.textSecondary }]}>
            +{filteredCompanies.length - 20} empresas não exibidas
          </Text>
        )}
      </View>

      {/* Ações em Massa */}
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>⚡ Ações Rápidas</Text>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: '#FEF3C7' }]}
            onPress={() => navigation.navigate('Comunicados', { segment: 'at_risk' })}
          >
            <Text style={styles.quickActionIcon}>⚠️</Text>
            <Text style={styles.quickActionText}>Mensagem para Em Risco</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: '#FEE2E2' }]}
            onPress={() => navigation.navigate('Comunicados', { segment: 'dormant' })}
          >
            <Text style={styles.quickActionIcon}>😴</Text>
            <Text style={styles.quickActionText}>Reativar Dormantes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: '#DBEAFE' }]}
            onPress={() => navigation.navigate('Comunicados', { segment: 'not_activated' })}
          >
            <Text style={styles.quickActionIcon}>🎯</Text>
            <Text style={styles.quickActionText}>Ajudar Não Ativados</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: '#DCFCE7' }]}
            onPress={() => navigation.navigate('Comunicados', { segment: 'highly_engaged' })}
          >
            <Text style={styles.quickActionIcon}>🌟</Text>
            <Text style={styles.quickActionText}>Agradecer Engajados</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  overviewCards: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  overviewCard: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  overviewIcon: { fontSize: 24, marginBottom: 4 },
  overviewValue: { fontSize: 24, fontWeight: '800' },
  overviewLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  section: { borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  sectionCount: { fontSize: 12 },
  activationHeader: { marginBottom: 16 },
  activationRate: { alignItems: 'center' },
  rateValue: { fontSize: 48, fontWeight: '800' },
  rateLabel: { fontSize: 12, marginTop: 4 },
  funnelTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  funnelStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  funnelInfo: { flexDirection: 'row', width: 140 },
  funnelStepNumber: { width: 20, fontSize: 12 },
  funnelStepName: { fontSize: 12, flex: 1 },
  funnelBar: { flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginHorizontal: 8 },
  funnelFill: { height: '100%', borderRadius: 4 },
  funnelPercent: { width: 35, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  funnelCount: { width: 35, fontSize: 10, textAlign: 'right' },
  segmentsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  segmentCard: { width: '31%', padding: 12, borderRadius: 10, alignItems: 'center' },
  segmentIcon: { fontSize: 20, marginBottom: 4 },
  segmentCount: { fontSize: 20, fontWeight: '800' },
  segmentLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  segmentPercent: { fontSize: 10, marginTop: 2 },
  companyCard: { backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 10, padding: 12, marginBottom: 10 },
  companyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  companyInfo: { flex: 1 },
  companyName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  segmentBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  segmentBadgeText: { fontSize: 10, fontWeight: '600' },
  activationBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activationScore: { fontSize: 14, fontWeight: '800' },
  companyStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 9, marginTop: 2 },
  activationChecklist: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  checkItem: { fontSize: 11, fontWeight: '600' },
  actionBtn: { padding: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  moreText: { textAlign: 'center', fontSize: 12, marginTop: 10 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: { width: '48%', padding: 14, borderRadius: 10, alignItems: 'center' },
  quickActionIcon: { fontSize: 24, marginBottom: 6 },
  quickActionText: { fontSize: 11, fontWeight: '600', textAlign: 'center', color: '#374151' },
});
