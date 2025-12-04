import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface ReportStats {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  expiredCompanies: number;
  newThisMonth: number;
  conversionRate: number;
  monthlyRevenue: number;
}

export default function AdminReportsScreen({ navigation }: any) {
  const { theme } = useThemeCtx();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReportData(); }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const { data: allCompanies, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const total = allCompanies.length;
      const active = allCompanies.filter(c => c.status === 'active').length;
      const trial = allCompanies.filter(c => c.status === 'trial').length;
      const expired = allCompanies.filter(c => c.trial_end && c.status === 'trial' && new Date(c.trial_end) < now).length;
      const newThisMonth = allCompanies.filter(c => new Date(c.created_at) >= startOfMonth).length;
      const conversionRate = total > 0 ? (active / total) * 100 : 0;
      const monthlyRevenue = active * 9.99;
      setStats({ totalCompanies: total, activeCompanies: active, trialCompanies: trial, expiredCompanies: expired, newThisMonth, conversionRate, monthlyRevenue });
    } catch (error) {
      console.error('Erro ao carregar relatorios:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, title, value, subtitle, color }: { icon: string; title: string; value: string | number; subtitle?: string; color: string }) => (
    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={28} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statTitle, { color: theme.textSecondary }]}>{title}</Text>
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
        {subtitle && <Text style={[styles.statSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
    </View>
  );

  if (loading || !stats) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Carregando relatorios...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>RELATORIOS ADMINISTRATIVOS</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Analise completa do Fast Cash Flow</Text>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>VISAO GERAL</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="business-outline" title="Total de Empresas" value={stats.totalCompanies} color={theme.primary} />
          <StatCard icon="checkmark-circle-outline" title="Empresas Ativas" value={stats.activeCompanies} subtitle={stats.conversionRate.toFixed(1) + '% conversao'} color={theme.positive} />
          <StatCard icon="hourglass-outline" title="Em Trial" value={stats.trialCompanies} color={theme.warning} />
          <StatCard icon="close-circle-outline" title="Trials Expirados" value={stats.expiredCompanies} color={theme.negative} />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>FINANCEIRO</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="cash-outline" title="Receita Mensal" value={'R$ ' + stats.monthlyRevenue.toFixed(2)} subtitle="Estimada" color={theme.positive} />
          <StatCard icon="trending-up-outline" title="Novos Este Mes" value={stats.newThisMonth} subtitle="Cadastros" color={theme.primary} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  section: { padding: 20, paddingTop: 0 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', padding: 16, borderRadius: 12 },
  statIconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statContent: { flex: 1 },
  statTitle: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 2 },
  statSubtitle: { fontSize: 11 },
});
