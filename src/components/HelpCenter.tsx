import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface FAQArticle {
  id: string;
  category: string;
  question: string;
  answer: string;
  view_count: number;
}

interface VideoTutorial {
  id: string;
  tutorial_key: string;
  title: string;
  description: string;
  video_url: string;
  duration_seconds: number;
  screen_context: string;
}

interface HelpCenterProps {
  visible: boolean;
  onClose: () => void;
  initialCategory?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  getting_started: { label: 'Primeiros Passos', icon: '🚀' },
  transactions: { label: 'Lançamentos', icon: '💰' },
  goals: { label: 'Metas', icon: '🎯' },
  reports: { label: 'Relatórios', icon: '📊' },
  sync: { label: 'Sincronização', icon: '🔄' },
  payment: { label: 'Pagamento', icon: '💳' },
  account: { label: 'Conta', icon: '👤' },
  other: { label: 'Outros', icon: '📌' },
};

export default function HelpCenter({ visible, onClose, initialCategory }: HelpCenterProps) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  // Usar cores do tema diretamente
  const colors = {
    background: theme.background,
    cardBg: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    border: theme.border,
    primary: theme.primary,
    success: theme.positive,
  };

  // Query para buscar FAQ
  const { data: faqArticles, isLoading: loadingFaq } = useQuery({
    queryKey: ['faq-articles', selectedCategory, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('faq_articles')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery.trim()) {
        query = query.or(`question.ilike.%${searchQuery}%,answer.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar FAQ:', error);
        return [];
      }

      return data as FAQArticle[];
    },
    enabled: visible,
  });

  // Query para buscar tutoriais
  const { data: tutorials } = useQuery({
    queryKey: ['video-tutorials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_tutorials')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Erro ao buscar tutoriais:', error);
        return [];
      }

      return data as VideoTutorial[];
    },
    enabled: visible,
  });

  // Formatar duração
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Renderizar categoria
  const renderCategory = (key: string) => {
    const { label, icon } = CATEGORY_LABELS[key] || { label: key, icon: '📌' };
    const isSelected = selectedCategory === key;

    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.categoryChip,
          { 
            backgroundColor: isSelected ? colors.primary : colors.cardBg,
            borderColor: isSelected ? colors.primary : colors.border,
          }
        ]}
        onPress={() => setSelectedCategory(isSelected ? null : key)}
      >
        <Text style={styles.categoryIcon}>{icon}</Text>
        <Text style={[
          styles.categoryLabel,
          { color: isSelected ? '#FFFFFF' : colors.text }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Renderizar artigo FAQ
  const renderArticle = (article: FAQArticle) => {
    const isExpanded = expandedArticle === article.id;
    const { icon } = CATEGORY_LABELS[article.category] || { icon: '📌' };

    return (
      <TouchableOpacity
        key={article.id}
        style={[styles.articleCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
        onPress={() => setExpandedArticle(isExpanded ? null : article.id)}
        activeOpacity={0.7}
      >
        <View style={styles.articleHeader}>
          <Text style={styles.articleIcon}>{icon}</Text>
          <Text style={[styles.articleQuestion, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 2}>
            {article.question}
          </Text>
          <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>
            {isExpanded ? '▲' : '▼'}
          </Text>
        </View>
        {isExpanded && (
          <View style={[styles.articleAnswer, { borderTopColor: colors.border }]}>
            <Text style={[styles.answerText, { color: colors.textSecondary }]}>
              {article.answer}
            </Text>
            <View style={styles.articleFooter}>
              <Text style={[styles.helpfulText, { color: colors.textSecondary }]}>
                Isso foi útil?
              </Text>
              <View style={styles.helpfulButtons}>
                <TouchableOpacity style={[styles.helpfulButton, { backgroundColor: colors.success + '20' }]}>
                  <Text style={{ color: colors.success }}>👍 Sim</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.helpfulButton, { backgroundColor: '#EF444420' }]}>
                  <Text style={{ color: '#EF4444' }}>👎 Não</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Renderizar tutorial
  const renderTutorial = (tutorial: VideoTutorial) => (
    <TouchableOpacity
      key={tutorial.id}
      style={[styles.tutorialCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
      onPress={() => {
        // Abrir vídeo (implementar com WebView ou Linking)
        console.log('Abrir tutorial:', tutorial.video_url);
      }}
    >
      <View style={styles.tutorialThumbnail}>
        <Text style={styles.playIcon}>▶️</Text>
      </View>
      <View style={styles.tutorialContent}>
        <Text style={[styles.tutorialTitle, { color: colors.text }]} numberOfLines={2}>
          {tutorial.title}
        </Text>
        <Text style={[styles.tutorialDuration, { color: colors.textSecondary }]}>
          🎬 {formatDuration(tutorial.duration_seconds || 0)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>❓ Central de Ajuda</Text>
            <Text style={styles.headerSubtitle}>Encontre respostas rápidas</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Busca */}
          <View style={[styles.searchContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar ajuda..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={[styles.clearIcon, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Categorias */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Categorias</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              <View style={styles.categoriesRow}>
                {Object.keys(CATEGORY_LABELS).map(renderCategory)}
              </View>
            </ScrollView>
          </View>

          {/* Tutoriais em Vídeo */}
          {tutorials && tutorials.length > 0 && !searchQuery && !selectedCategory && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>🎥 Tutoriais em Vídeo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tutorialsRow}>
                  {tutorials.slice(0, 4).map(renderTutorial)}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Artigos FAQ */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Perguntas Frequentes'}
            </Text>
            {loadingFaq ? (
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Carregando...
              </Text>
            ) : faqArticles && faqArticles.length > 0 ? (
              <View style={styles.articlesList}>
                {faqArticles.map(renderArticle)}
              </View>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.cardBg }]}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {searchQuery 
                    ? 'Nenhum resultado encontrado. Tente outras palavras.'
                    : 'Nenhum artigo disponível nesta categoria.'
                  }
                </Text>
              </View>
            )}
          </View>

          {/* Contato */}
          <View style={[styles.contactCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
            <Text style={styles.contactIcon}>💬</Text>
            <View style={styles.contactContent}>
              <Text style={[styles.contactTitle, { color: colors.text }]}>
                Não encontrou o que procurava?
              </Text>
              <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                Fale diretamente com nossa equipe de suporte pelo chat.
              </Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// Componente de tooltip de ajuda contextual
export function HelpTooltip({ 
  text, 
  onPress 
}: { 
  text: string; 
  onPress?: () => void;
}) {
  const { theme } = useThemeCtx();

  return (
    <TouchableOpacity
      style={[styles.tooltip, { backgroundColor: theme.card }]}
      onPress={onPress}
    >
      <Text style={styles.tooltipIcon}>❓</Text>
      <Text style={[styles.tooltipText, { color: theme.text }]} numberOfLines={2}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

// Botão de ajuda para colocar ao lado de funcionalidades
export function HelpButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.helpButton} onPress={onPress}>
      <Text style={styles.helpButtonIcon}>?</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  clearIcon: {
    fontSize: 16,
    padding: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  categoriesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
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
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  tutorialsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tutorialCard: {
    width: 160,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tutorialThumbnail: {
    height: 90,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 32,
  },
  tutorialContent: {
    padding: 10,
  },
  tutorialTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  tutorialDuration: {
    fontSize: 11,
  },
  articlesList: {
    gap: 12,
  },
  articleCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  articleIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  articleQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  expandIcon: {
    fontSize: 12,
    marginLeft: 8,
  },
  articleAnswer: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    marginTop: 0,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
    paddingTop: 14,
  },
  articleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  helpfulText: {
    fontSize: 12,
  },
  helpfulButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  helpfulButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
  },
  emptyState: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  contactIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    lineHeight: 18,
  },
  tooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  tooltipIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  tooltipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  helpButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButtonIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
