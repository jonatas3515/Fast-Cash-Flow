import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface AdminStats {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  inactiveCompanies: number;
  pendingRequests: number;
  totalRevenue: number;
  companiesNearTrialEnd: number;
  conversionRate: number;
}

export default function AdminDashboardScreen({ navigation }: any) {
  const { theme } = useThemeCtx();
  const [stats, setStats] = useState<AdminStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    trialCompanies: 0,
    inactiveCompanies: 0,
    pendingRequests: 0,
    totalRevenue: 0,
    companiesNearTrialEnd: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAdminStats();
  }, []);

  const loadAdminStats = async () => {
    try {
      // Total de empresas
      const { count: totalCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      // Empresas ativas (pagas)
      const { count: activeCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Empresas em trial
      const { count: trialCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'trial');

      // Empresas inativas/bloqueadas
      const { count: inactiveCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .in('status', ['expired', 'blocked']);

      // Solicitações pendentes
      const { count: pendingCount } = await supabase
        .from('company_requests')
        .select('*', { count: 'exact', head: true })
        .eq('approved', false);

      // Empresas próximas do fim do trial (últimos 3 dias)
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const { count: nearTrialEndCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'trial')
        .lte('trial_end', threeDaysFromNow.toISOString());

      // Calcular receita total (empresas ativas * preço mensal)
      const monthlyPrice = 9.99;
      const totalRevenue = (activeCount || 0) * monthlyPrice;

      // Taxa de conversão (ativas / total que já passou por trial)
      const conversionRate = totalCount
        ? ((activeCount || 0) / (totalCount || 1)) * 100
        : 0;

      setStats({
        totalCompanies: totalCount || 0,
        activeCompanies: activeCount || 0,
        trialCompanies: trialCount || 0,
        inactiveCompanies: inactiveCount || 0,
        pendingRequests: pendingCount || 0,
        totalRevenue,
        companiesNearTrialEnd: nearTrialEndCount || 0,
        conversionRate,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas admin:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAdminStats();
  };

  const StatCard = ({ 
    icon, 
    title, 
    value, 
    color, 
    onPress 
  }: { 
    icon: string; 
    title: string; 
    value: string | number; 
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: theme.card }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={28} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statTitle, { color: theme.textSecondary }]}>{title}</Text>
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      </View>
    </TouchableOpacity>
  );

  const QuickActionButton = ({
    icon,
    title,
    color,
    onPress,
  }: {
    icon: string;
    title: string;
    color: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.quickActionButton, { backgroundColor: color + '15' }]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={32} color={color} />
      <Text style={[styles.quickActionText, { color: theme.text }]}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.text }]}>
            PAINEL ADMINISTRATIVO
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Fast Cash Flow - Gerenciamento do Sistema
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: theme.card }]}
          onPress={() => navigation.navigate('AdminSettings')}
        >
          <Ionicons name="settings-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Alertas Importantes */}
      {(stats.pendingRequests > 0 || stats.companiesNearTrialEnd > 0) && (
        <View style={styles.alertsSection}>
          {stats.pendingRequests > 0 && (
            <TouchableOpacity
              style={[styles.alertCard, { backgroundColor: theme.warning + '20', borderColor: theme.warning }]}
              onPress={() => navigation.navigate('AdminRequests')}
            >
              <Ionicons name="alert-circle" size={24} color={theme.warning} />
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: theme.text }]}>
                  {stats.pendingRequests} Solicitaç{stats.pendingRequests === 1 ? 'ão' : 'ões'} Pendente{stats.pendingRequests === 1 ? '' : 's'}
                </Text>
                <Text style={[styles.alertDescription, { color: theme.textSecondary }]}>
                  Novas empresas aguardando aprovação
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text} />
            </TouchableOpacity>
          )}

          {stats.companiesNearTrialEnd > 0 && (
            <TouchableOpacity
              style={[styles.alertCard, { backgroundColor: theme.negative + '20', borderColor: theme.negative }]}
              onPress={() => navigation.navigate('AdminCompanies', { filter: 'trial_ending' })}
            >
              <Ionicons name="time" size={24} color={theme.negative} />
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: theme.text }]}>
                  {stats.companiesNearTrialEnd} Trial{stats.companiesNearTrialEnd === 1 ? '' : 's'} Terminando
                </Text>
                <Text style={[styles.alertDescription, { color: theme.textSecondary }]}>
                  Empresas com menos de 3 dias de trial
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* KPIs Principais */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="business-outline"
          title="Total de Empresas"
          value={stats.totalCompanies}
          color={theme.primary}
          onPress={() => navigation.navigate('AdminCompanies')}
        />
        <StatCard
          icon="checkmark-circle-outline"
          title="Empresas Ativas"
          value={stats.activeCompanies}
          color={theme.positive}
          onPress={() => navigation.navigate('AdminCompanies', { filter: 'active' })}
        />
        <StatCard
          icon="hourglass-outline"
          title="Em Trial"
          value={stats.trialCompanies}
          color={theme.warning}
          onPress={() => navigation.navigate('AdminCompanies', { filter: 'trial' })}
        />
        <StatCard
          icon="close-circle-outline"
          title="Inativas/Bloqueadas"
          value={stats.inactiveCompanies}
          color={theme.negative}
          onPress={() => navigation.navigate('AdminCompanies', { filter: 'inactive' })}
        />
      </View>

      {/* Receita e Conversão */}
      <View style={[styles.revenueCard, { backgroundColor: theme.card }]}>
        <View style={styles.revenueRow}>
          <View style={styles.revenueItem}>
            <Ionicons name="cash-outline" size={32} color={theme.positive} />
            <Text style={[styles.revenueLabel, { color: theme.textSecondary }]}>
              Receita Mensal Estimada
            </Text>
            <Text style={[styles.revenueValue, { color: theme.positive }]}>
              R$ {stats.totalRevenue.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.revenueDivider, { backgroundColor: theme.border }]} />
          <View style={styles.revenueItem}>
            <Ionicons name="trending-up-outline" size={32} color={theme.primary} />
            <Text style={[styles.revenueLabel, { color: theme.textSecondary }]}>
              Taxa de Conversão
            </Text>
            <Text style={[styles.revenueValue, { color: theme.primary }]}>
              {stats.conversionRate.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Ações Rápidas */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>AÇÕES RÁPIDAS</Text>
        <View style={styles.quickActionsGrid}>
          <QuickActionButton
            icon="person-add-outline"
            title="Aprovar Solicitações"
            color={theme.positive}
            onPress={() => navigation.navigate('AdminRequests')}
          />
          <QuickActionButton
            icon="list-outline"
            title="Gerenciar Empresas"
            color={theme.primary}
            onPress={() => navigation.navigate('AdminCompanies')}
          />
          <QuickActionButton
            icon="stats-chart-outline"
            title="Relatórios"
            color={theme.warning}
            onPress={() => navigation.navigate('AdminReports')}
          />
          <QuickActionButton
            icon="megaphone-outline"
            title="Enviar Comunicado"
            color="#8b5cf6"
            onPress={() => navigation.navigate('AdminBroadcast')}
          />
        </View>
      </View>

      {/* Atividade Recente */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>ATIVIDADE RECENTE</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminActivityLog')}>
            <Text style={[styles.seeAllText, { color: theme.primary }]}>Ver Tudo</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.activityCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.activityPlaceholder, { color: theme.textSecondary }]}>
            <Ionicons name="time-outline" size={16} /> Últimas ações administrativas aparecerão aqui
          </Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  alertsSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    marginLeft: 12,
    flex: 1,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  revenueCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueDivider: {
    width: 1,
    height: 60,
    marginHorizontal: 20,
  },
  revenueLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  revenueValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  activityCard: {
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityPlaceholder: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
