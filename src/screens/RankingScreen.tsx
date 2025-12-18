import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { getCurrentCompanyId } from '../lib/company';
import Achievements from '../components/Achievements';

interface RankingEntry {
  company_id: string;
  company_name: string;
  transaction_count: number;
  rank: number;
  is_current_user: boolean;
}

export default function RankingScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const [activeTab, setActiveTab] = useState<'ranking' | 'achievements'>('ranking');

  // Cores dinâmicas
  const colors = {
    background: theme.background,
    cardBg: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    border: theme.border,
    primary: '#3B82F6',
    gold: '#F59E0B',
    silver: '#9CA3AF',
    bronze: '#CD7F32',
    success: '#10B981',
  };

  // Query para buscar ranking
  const { data: ranking, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['monthly-ranking'],
    queryFn: async () => {
      const currentCompanyId = await getCurrentCompanyId();
      
      // Buscar todas as empresas com suas transações do mês
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .is('deleted_at', null)
        .in('status', ['active', 'trial']);

      if (!companies) return [];

      // Buscar transações de cada empresa
      const rankingData: RankingEntry[] = [];

      for (const company of companies) {
        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth)
          .is('deleted_at', null);

        if ((count || 0) > 0) {
          rankingData.push({
            company_id: company.id,
            company_name: company.name,
            transaction_count: count || 0,
            rank: 0,
            is_current_user: company.id === currentCompanyId,
          });
        }
      }

      // Ordenar e atribuir ranks
      rankingData.sort((a, b) => b.transaction_count - a.transaction_count);
      rankingData.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return rankingData.slice(0, 50); // Top 50
    },
  });

  // Encontrar posição do usuário atual
  const currentUserRank = ranking?.find(r => r.is_current_user);

  // Obter cor do rank
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return colors.gold;
      case 2: return colors.silver;
      case 3: return colors.bronze;
      default: return colors.textSecondary;
    }
  };

  // Obter ícone do rank
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}º`;
    }
  };

  // Mês atual
  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.cardBg }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'ranking' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('ranking')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'ranking' ? '#FFFFFF' : colors.text }
          ]}>
            🏆 Ranking
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'achievements' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('achievements')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'achievements' ? '#FFFFFF' : colors.text }
          ]}>
            🎖️ Conquistas
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'ranking' ? (
          <>
            {/* Header */}
            <View style={[styles.header, { alignItems: 'center' }]}>
              <Text style={[styles.headerTitle, { color: isDark ? theme.primary : theme.negative, textAlign: 'center' }]}>
                🏆 Ranking do Mês
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
                {currentMonth}
              </Text>
            </View>

            {/* Prêmio */}
            <View style={[styles.prizeCard, { backgroundColor: colors.gold + '20', borderColor: colors.gold }]}>
              <Text style={styles.prizeIcon}>🎁</Text>
              <View style={styles.prizeContent}>
                <Text style={[styles.prizeTitle, { color: colors.text }]}>
                  Prêmio do Mês
                </Text>
                <Text style={[styles.prizeDesc, { color: colors.textSecondary }]}>
                  Top 3 ganham 1 mês grátis no próximo plano anual!
                </Text>
              </View>
            </View>

            {/* Posição do Usuário */}
            {currentUserRank && (
              <View style={[styles.userRankCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
                <View style={styles.userRankInfo}>
                  <Text style={[styles.userRankLabel, { color: colors.textSecondary }]}>
                    Sua posição
                  </Text>
                  <Text style={[styles.userRankPosition, { color: colors.primary }]}>
                    {getRankIcon(currentUserRank.rank)}
                  </Text>
                </View>
                <View style={styles.userRankStats}>
                  <Text style={[styles.userRankCount, { color: colors.text }]}>
                    {currentUserRank.transaction_count}
                  </Text>
                  <Text style={[styles.userRankCountLabel, { color: colors.textSecondary }]}>
                    lançamentos
                  </Text>
                </View>
              </View>
            )}

            {/* Top 3 Destaque */}
            {ranking && ranking.length >= 3 && (
              <View style={styles.podium}>
                {/* 2º Lugar */}
                <View style={styles.podiumItem}>
                  <View style={[styles.podiumAvatar, { backgroundColor: colors.silver }]}>
                    <Text style={styles.podiumAvatarText}>
                      {ranking[1].company_name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.podiumMedal}>🥈</Text>
                  <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
                    {ranking[1].company_name}
                  </Text>
                  <Text style={[styles.podiumCount, { color: colors.textSecondary }]}>
                    {ranking[1].transaction_count}
                  </Text>
                  <View style={[styles.podiumBar, { height: 60, backgroundColor: colors.silver }]} />
                </View>

                {/* 1º Lugar */}
                <View style={styles.podiumItem}>
                  <View style={[styles.podiumAvatar, styles.podiumAvatarFirst, { backgroundColor: colors.gold }]}>
                    <Text style={[styles.podiumAvatarText, styles.podiumAvatarTextFirst]}>
                      {ranking[0].company_name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.podiumMedalFirst}>🥇</Text>
                  <Text style={[styles.podiumName, styles.podiumNameFirst, { color: colors.text }]} numberOfLines={1}>
                    {ranking[0].company_name}
                  </Text>
                  <Text style={[styles.podiumCount, { color: colors.gold }]}>
                    {ranking[0].transaction_count}
                  </Text>
                  <View style={[styles.podiumBar, { height: 80, backgroundColor: colors.gold }]} />
                </View>

                {/* 3º Lugar */}
                <View style={styles.podiumItem}>
                  <View style={[styles.podiumAvatar, { backgroundColor: colors.bronze }]}>
                    <Text style={styles.podiumAvatarText}>
                      {ranking[2].company_name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.podiumMedal}>🥉</Text>
                  <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
                    {ranking[2].company_name}
                  </Text>
                  <Text style={[styles.podiumCount, { color: colors.textSecondary }]}>
                    {ranking[2].transaction_count}
                  </Text>
                  <View style={[styles.podiumBar, { height: 40, backgroundColor: colors.bronze }]} />
                </View>
              </View>
            )}

            {/* Lista Completa */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                📋 Classificação Completa
              </Text>
              
              {isLoading ? (
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Carregando ranking...
                </Text>
              ) : ranking && ranking.length > 0 ? (
                <View style={styles.rankingList}>
                  {ranking.slice(3).map((entry) => (
                    <View
                      key={entry.company_id}
                      style={[
                        styles.rankingItem,
                        { 
                          backgroundColor: entry.is_current_user ? colors.primary + '10' : colors.cardBg,
                          borderColor: entry.is_current_user ? colors.primary : colors.border,
                        }
                      ]}
                    >
                      <Text style={[styles.rankingPosition, { color: colors.textSecondary }]}>
                        {entry.rank}º
                      </Text>
                      <View style={[styles.rankingAvatar, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.rankingAvatarText, { color: colors.primary }]}>
                          {entry.company_name.charAt(0)}
                        </Text>
                      </View>
                      <Text style={[styles.rankingName, { color: colors.text }]} numberOfLines={1}>
                        {entry.company_name}
                        {entry.is_current_user && ' (você)'}
                      </Text>
                      <Text style={[styles.rankingCount, { color: colors.textSecondary }]}>
                        {entry.transaction_count}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={[styles.emptyState, { backgroundColor: colors.cardBg }]}>
                  <Text style={styles.emptyIcon}>📊</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Nenhum lançamento registrado este mês
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <Achievements />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  prizeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  prizeIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  prizeContent: {
    flex: 1,
  },
  prizeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  prizeDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  userRankCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  userRankInfo: {},
  userRankLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  userRankPosition: {
    fontSize: 28,
    fontWeight: '800',
  },
  userRankStats: {
    alignItems: 'flex-end',
  },
  userRankCount: {
    fontSize: 24,
    fontWeight: '800',
  },
  userRankCountLabel: {
    fontSize: 12,
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 100,
  },
  podiumAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  podiumAvatarFirst: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  podiumAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  podiumAvatarTextFirst: {
    fontSize: 24,
  },
  podiumMedal: {
    fontSize: 24,
    marginBottom: 4,
  },
  podiumMedalFirst: {
    fontSize: 32,
    marginBottom: 4,
  },
  podiumName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  podiumNameFirst: {
    fontSize: 12,
    fontWeight: '700',
  },
  podiumCount: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  podiumBar: {
    width: '80%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  rankingList: {
    gap: 8,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  rankingPosition: {
    width: 32,
    fontSize: 14,
    fontWeight: '700',
  },
  rankingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankingAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  rankingName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  rankingCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  loadingText: {
    textAlign: 'center',
    padding: 40,
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
