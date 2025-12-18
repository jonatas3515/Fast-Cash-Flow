import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentCompanyId } from '../lib/company';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'master' | 'special';
  current_progress: number;
  target_progress: number;
  progress_percent: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
  reward_type: string | null;
  reward_value: number;
  reward_claimed: boolean;
}

const CATEGORY_CONFIG = {
  beginner: { label: 'Iniciante', color: '#10B981', icon: '🌱' },
  intermediate: { label: 'Intermediário', color: '#3B82F6', icon: '⭐' },
  advanced: { label: 'Avançado', color: '#8B5CF6', icon: '💎' },
  master: { label: 'Mestre', color: '#F59E0B', icon: '👑' },
  special: { label: 'Especial', color: '#EC4899', icon: '🎁' },
};

interface AchievementsProps {
  compact?: boolean;
  showUnlockedOnly?: boolean;
}

export default function Achievements({ compact = false, showUnlockedOnly = false }: AchievementsProps) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newUnlocked, setNewUnlocked] = useState<Achievement | null>(null);
  const [celebrationAnim] = useState(new Animated.Value(0));

  // Usar cores do tema diretamente
  const colors = {
    background: theme.background,
    cardBg: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    border: theme.border,
    primary: theme.primary,
    success: theme.positive,
    gold: theme.warning,
  };

  // Query para buscar conquistas
  const { data: achievements, isLoading, refetch } = useQuery({
    queryKey: ['user-achievements'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return getMockAchievements();

      // Buscar estatísticas da empresa
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId)
        .is('deleted_at', null);

      const { data: goals } = await supabase
        .from('goals')
        .select('id, achieved')
        .eq('company_id', companyId);

      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .eq('company_id', companyId);

      const transactionCount = transactions?.length || 0;
      const goalsAchieved = goals?.filter(g => g.achieved).length || 0;
      const categoryCount = categories?.length || 0;

      // Gerar conquistas baseadas nas estatísticas
      return generateAchievements(transactionCount, goalsAchieved, categoryCount);
    },
    refetchInterval: 60000, // Atualiza a cada minuto
  });

  // Gerar conquistas mockadas
  const getMockAchievements = (): Achievement[] => {
    return [
      { id: '1', key: 'first_transaction', name: 'Primeiro Lançamento', description: 'Registre seu primeiro lançamento', icon: '🎯', category: 'beginner', current_progress: 1, target_progress: 1, progress_percent: 100, is_unlocked: true, unlocked_at: new Date().toISOString(), reward_type: 'badge_only', reward_value: 0, reward_claimed: false },
      { id: '2', key: 'ten_transactions', name: '10 Lançamentos', description: 'Registre 10 lançamentos', icon: '📝', category: 'beginner', current_progress: 5, target_progress: 10, progress_percent: 50, is_unlocked: false, unlocked_at: null, reward_type: 'badge_only', reward_value: 0, reward_claimed: false },
      { id: '3', key: 'hundred_transactions', name: 'Centenário', description: 'Registre 100 lançamentos', icon: '💯', category: 'intermediate', current_progress: 5, target_progress: 100, progress_percent: 5, is_unlocked: false, unlocked_at: null, reward_type: 'trial_days', reward_value: 3, reward_claimed: false },
    ];
  };

  // Gerar conquistas baseadas em estatísticas reais
  const generateAchievements = (transactions: number, goals: number, categories: number): Achievement[] => {
    const achievementDefs = [
      // Iniciante
      { key: 'first_transaction', name: 'Primeiro Lançamento', description: 'Registre seu primeiro lançamento', icon: '🎯', category: 'beginner' as const, target: 1, current: Math.min(transactions, 1), reward_type: 'badge_only', reward_value: 0 },
      { key: 'first_goal', name: 'Primeira Meta', description: 'Atinja sua primeira meta', icon: '🎯', category: 'beginner' as const, target: 1, current: Math.min(goals, 1), reward_type: 'badge_only', reward_value: 0 },
      { key: 'ten_transactions', name: '10 Lançamentos', description: 'Registre 10 lançamentos', icon: '📝', category: 'beginner' as const, target: 10, current: Math.min(transactions, 10), reward_type: 'badge_only', reward_value: 0 },
      { key: 'first_category', name: 'Organizador', description: 'Crie sua primeira categoria', icon: '🏷️', category: 'beginner' as const, target: 1, current: Math.min(categories, 1), reward_type: 'badge_only', reward_value: 0 },
      
      // Intermediário
      { key: 'hundred_transactions', name: 'Centenário', description: 'Registre 100 lançamentos', icon: '💯', category: 'intermediate' as const, target: 100, current: Math.min(transactions, 100), reward_type: 'trial_days', reward_value: 3 },
      { key: 'three_goals', name: 'Focado', description: 'Atinja 3 metas financeiras', icon: '🎯', category: 'intermediate' as const, target: 3, current: Math.min(goals, 3), reward_type: 'trial_days', reward_value: 5 },
      { key: 'five_categories', name: 'Super Organizado', description: 'Crie 5 categorias', icon: '🏷️', category: 'intermediate' as const, target: 5, current: Math.min(categories, 5), reward_type: 'badge_only', reward_value: 0 },
      
      // Avançado
      { key: 'five_hundred_transactions', name: 'Veterano', description: 'Registre 500 lançamentos', icon: '⭐', category: 'advanced' as const, target: 500, current: Math.min(transactions, 500), reward_type: 'discount_percent', reward_value: 10 },
      { key: 'thousand_transactions', name: 'Mestre Financeiro', description: 'Registre 1000 lançamentos', icon: '👑', category: 'advanced' as const, target: 1000, current: Math.min(transactions, 1000), reward_type: 'discount_percent', reward_value: 20 },
      { key: 'ten_goals', name: 'Conquistador', description: 'Atinja 10 metas', icon: '🏆', category: 'advanced' as const, target: 10, current: Math.min(goals, 10), reward_type: 'discount_percent', reward_value: 15 },
      
      // Mestre
      { key: 'five_thousand_transactions', name: 'Elite', description: 'Registre 5000 lançamentos', icon: '💫', category: 'master' as const, target: 5000, current: Math.min(transactions, 5000), reward_type: 'discount_percent', reward_value: 30 },
    ];

    return achievementDefs.map((def, index) => ({
      id: (index + 1).toString(),
      key: def.key,
      name: def.name,
      description: def.description,
      icon: def.icon,
      category: def.category,
      current_progress: def.current,
      target_progress: def.target,
      progress_percent: Math.round((def.current / def.target) * 100),
      is_unlocked: def.current >= def.target,
      unlocked_at: def.current >= def.target ? new Date().toISOString() : null,
      reward_type: def.reward_type,
      reward_value: def.reward_value,
      reward_claimed: false,
    }));
  };

  // Animação de celebração
  const showCelebration = (achievement: Achievement) => {
    setNewUnlocked(achievement);
    Animated.sequence([
      Animated.timing(celebrationAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(celebrationAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setNewUnlocked(null));
  };

  // Estatísticas
  const stats = React.useMemo(() => {
    if (!achievements) return { unlocked: 0, total: 0, points: 0 };
    return {
      unlocked: achievements.filter(a => a.is_unlocked).length,
      total: achievements.length,
      points: achievements.filter(a => a.is_unlocked).length * 100,
    };
  }, [achievements]);

  // Filtrar conquistas
  const filteredAchievements = React.useMemo(() => {
    if (!achievements) return [];
    let filtered = achievements;
    
    if (showUnlockedOnly) {
      filtered = filtered.filter(a => a.is_unlocked);
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }
    
    return filtered;
  }, [achievements, showUnlockedOnly, selectedCategory]);

  // Renderizar conquista
  const renderAchievement = (achievement: Achievement, index: number) => {
    const categoryConfig = CATEGORY_CONFIG[achievement.category];
    const isLocked = !achievement.is_unlocked;

    return (
      <View
        key={achievement.id}
        style={[
          styles.achievementCard,
          { 
            backgroundColor: colors.cardBg, 
            borderColor: isLocked ? colors.border : categoryConfig.color,
            opacity: isLocked ? 0.7 : 1,
          }
        ]}
      >
        <View style={[
          styles.achievementIcon,
          { backgroundColor: isLocked ? colors.border : categoryConfig.color + '20' }
        ]}>
          <Text style={styles.achievementIconText}>
            {isLocked ? '🔒' : achievement.icon}
          </Text>
        </View>
        
        <View style={styles.achievementContent}>
          <Text style={[styles.achievementName, { color: colors.text }]}>
            {achievement.name}
          </Text>
          <Text style={[styles.achievementDesc, { color: colors.textSecondary }]} numberOfLines={1}>
            {achievement.description}
          </Text>
          
          {!isLocked ? (
            <View style={styles.unlockedBadge}>
              <Text style={[styles.unlockedText, { color: categoryConfig.color }]}>
                ✓ Desbloqueado
              </Text>
            </View>
          ) : (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      backgroundColor: categoryConfig.color,
                      width: `${achievement.progress_percent}%`
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {achievement.current_progress}/{achievement.target_progress}
              </Text>
            </View>
          )}
        </View>

        {achievement.reward_type && achievement.reward_type !== 'badge_only' && (
          <View style={[styles.rewardBadge, { backgroundColor: colors.gold + '20' }]}>
            <Text style={styles.rewardIcon}>🎁</Text>
          </View>
        )}
      </View>
    );
  };

  // Versão compacta
  if (compact) {
    const recentUnlocked = achievements?.filter(a => a.is_unlocked).slice(0, 3) || [];
    
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
        onPress={() => setShowModal(true)}
      >
        <View style={styles.compactHeader}>
          <Text style={styles.compactIcon}>🏆</Text>
          <View style={styles.compactInfo}>
            <Text style={[styles.compactTitle, { color: colors.text }]}>Conquistas</Text>
            <Text style={[styles.compactStats, { color: colors.textSecondary }]}>
              {stats.unlocked}/{stats.total} desbloqueadas
            </Text>
          </View>
        </View>
        
        <View style={styles.compactBadges}>
          {recentUnlocked.map((a, i) => (
            <View key={a.id} style={styles.compactBadge}>
              <Text style={styles.compactBadgeIcon}>{a.icon}</Text>
            </View>
          ))}
          {stats.unlocked > 3 && (
            <View style={[styles.compactBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.compactBadgeMore, { color: colors.primary }]}>
                +{stats.unlocked - 3}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <>
      {/* Lista Completa */}
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>🏆 Conquistas</Text>
          <View style={[styles.pointsBadge, { backgroundColor: colors.gold + '20' }]}>
            <Text style={[styles.pointsText, { color: colors.gold }]}>
              {stats.points} pts
            </Text>
          </View>
        </View>

        {/* Progresso Geral */}
        <View style={[styles.overallProgress, { backgroundColor: colors.cardBg }]}>
          <View style={styles.overallInfo}>
            <Text style={[styles.overallLabel, { color: colors.textSecondary }]}>
              Progresso Geral
            </Text>
            <Text style={[styles.overallValue, { color: colors.text }]}>
              {stats.unlocked} de {stats.total}
            </Text>
          </View>
          <View style={[styles.overallBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.overallFill, 
                { 
                  backgroundColor: colors.success,
                  width: `${(stats.unlocked / stats.total) * 100}%`
                }
              ]} 
            />
          </View>
        </View>

        {/* Filtros de Categoria */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          <View style={styles.categoriesRow}>
            <TouchableOpacity
              style={[
                styles.categoryChip,
                { 
                  backgroundColor: !selectedCategory ? colors.primary : colors.cardBg,
                  borderColor: !selectedCategory ? colors.primary : colors.border,
                }
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[
                styles.categoryLabel,
                { color: !selectedCategory ? '#FFFFFF' : colors.text }
              ]}>
                Todas
              </Text>
            </TouchableOpacity>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.categoryChip,
                  { 
                    backgroundColor: selectedCategory === key ? config.color : colors.cardBg,
                    borderColor: selectedCategory === key ? config.color : colors.border,
                  }
                ]}
                onPress={() => setSelectedCategory(key)}
              >
                <Text style={styles.categoryIcon}>{config.icon}</Text>
                <Text style={[
                  styles.categoryLabel,
                  { color: selectedCategory === key ? '#FFFFFF' : colors.text }
                ]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Lista de Conquistas */}
        <View style={styles.achievementsList}>
          {filteredAchievements.map(renderAchievement)}
        </View>
      </View>

      {/* Modal de Conquistas (para versão compacta) */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={[styles.modalClose, { color: colors.primary }]}>Fechar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>🏆 Conquistas</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <Achievements showUnlockedOnly={false} />
          </ScrollView>
        </View>
      </Modal>

      {/* Celebração de Nova Conquista */}
      {newUnlocked && (
        <Animated.View 
          style={[
            styles.celebration,
            { 
              opacity: celebrationAnim,
              transform: [{ scale: celebrationAnim }]
            }
          ]}
        >
          <View style={[styles.celebrationCard, { backgroundColor: colors.gold }]}>
            <Text style={styles.celebrationIcon}>{newUnlocked.icon}</Text>
            <Text style={styles.celebrationTitle}>Conquista Desbloqueada!</Text>
            <Text style={styles.celebrationName}>{newUnlocked.name}</Text>
          </View>
        </Animated.View>
      )}
    </>
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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  pointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  overallProgress: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  overallInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  overallLabel: {
    fontSize: 13,
  },
  overallValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  overallBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoriesScroll: {
    marginBottom: 16,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementIconText: {
    fontSize: 24,
  },
  achievementContent: {
    flex: 1,
  },
  achievementName: {
    fontSize: 15,
    fontWeight: '700',
  },
  achievementDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  unlockedBadge: {
    marginTop: 6,
  },
  unlockedText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 40,
  },
  rewardBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardIcon: {
    fontSize: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  compactInfo: {},
  compactTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  compactStats: {
    fontSize: 12,
  },
  compactBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  compactBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactBadgeIcon: {
    fontSize: 16,
  },
  compactBadgeMore: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  celebration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  celebrationCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
  celebrationIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  celebrationTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  celebrationName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
});
