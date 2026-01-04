import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import SupportChat from '../components/SupportChat';
import HelpCenter from '../components/HelpCenter';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';

export default function HelpScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const [showChat, setShowChat] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);

  // Cores dinâmicas
  const colors = {
    background: theme.background,
    cardBg: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    border: theme.border,
    primary: '#3B82F6',
    success: '#10B981',
  };

  // Query para contar mensagens não lidas
  const { data: unreadCount } = useQuery({
    queryKey: ['support-unread-count'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return 0;

      const { count } = await supabase
        .from('support_messages')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('direction', 'admin_to_company')
        .is('read_at', null);

      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  // Query para buscar tutoriais
  const { data: tutorials } = useQuery({
    queryKey: ['video-tutorials-featured'],
    queryFn: async () => {
      const { data } = await supabase
        .from('video_tutorials')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(4);

      return data || [];
    },
  });

  // Opções de ajuda rápida
  const quickHelp = [
    { icon: '💰', title: 'Lançamentos', desc: 'Como registrar entradas e saídas', category: 'transactions' },
    { icon: '🎯', title: 'Metas', desc: 'Configure seus objetivos financeiros', category: 'goals' },
    { icon: '📊', title: 'Relatórios', desc: 'Gere relatórios em PDF', category: 'reports' },
    { icon: '🔄', title: 'Sincronização', desc: 'Problemas com dados', category: 'sync' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={[styles.header, { alignItems: 'center' }]}>
          <Text style={styles.headerIcon}>❓</Text>
          <Text style={[styles.headerTitle, { color: isDark ? theme.primary : theme.negative, textAlign: 'center' }]}>
            Central de Ajuda
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
            Encontre respostas e fale com o suporte
          </Text>
        </View>

        {/* Card de Chat */}
        <TouchableOpacity
          style={[styles.chatCard, { backgroundColor: colors.primary }]}
          onPress={() => setShowChat(true)}
          activeOpacity={0.9}
        >
          <View style={styles.chatCardContent}>
            <Text style={styles.chatIcon}>💬</Text>
            <View style={styles.chatInfo}>
              <Text style={styles.chatTitle}>Falar com Suporte</Text>
              <Text style={styles.chatDesc}>
                Tire suas dúvidas diretamente com nossa equipe
              </Text>
            </View>
            {(unreadCount ?? 0) > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.chatArrow}>→</Text>
        </TouchableOpacity>

        {/* Card de FAQ */}
        <TouchableOpacity
          style={[styles.faqCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          onPress={() => setShowHelpCenter(true)}
          activeOpacity={0.8}
        >
          <View style={styles.faqCardContent}>
            <Text style={styles.faqIcon}>📚</Text>
            <View style={styles.faqInfo}>
              <Text style={[styles.faqTitle, { color: colors.text }]}>
                Perguntas Frequentes
              </Text>
              <Text style={[styles.faqDesc, { color: colors.textSecondary }]}>
                Encontre respostas para dúvidas comuns
              </Text>
            </View>
          </View>
          <Text style={[styles.faqArrow, { color: colors.textSecondary }]}>→</Text>
        </TouchableOpacity>

        {/* Ajuda Rápida */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Ajuda Rápida
          </Text>
          <View style={styles.quickHelpGrid}>
            {quickHelp.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickHelpCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                onPress={() => setShowHelpCenter(true)}
              >
                <Text style={styles.quickHelpIcon}>{item.icon}</Text>
                <Text style={[styles.quickHelpTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.quickHelpDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tutoriais em Vídeo */}
        {tutorials && tutorials.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🎥 Tutoriais em Vídeo
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tutorialsRow}>
                {tutorials.map((tutorial: any) => (
                  <TouchableOpacity
                    key={tutorial.id}
                    style={[styles.tutorialCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                  >
                    <View style={styles.tutorialThumbnail}>
                      <Text style={styles.playIcon}>▶️</Text>
                    </View>
                    <View style={styles.tutorialContent}>
                      <Text style={[styles.tutorialTitle, { color: colors.text }]} numberOfLines={2}>
                        {tutorial.title}
                      </Text>
                      <Text style={[styles.tutorialDuration, { color: colors.textSecondary }]}>
                        🎬 {Math.floor((tutorial.duration_seconds || 0) / 60)}:{((tutorial.duration_seconds || 0) % 60).toString().padStart(2, '0')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Contato Alternativo */}
        <View style={[styles.contactCard, { backgroundColor: colors.success + '10', borderColor: colors.success }]}>
          <Text style={styles.contactIcon}>📧</Text>
          <View style={styles.contactContent}>
            <Text style={[styles.contactTitle, { color: colors.text }]}>
              Outras formas de contato
            </Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              WhatsApp: (73) 99934-8552{'\n'}
              Email: suporte@fastcashflow.com.br
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Chat */}
      <SupportChat visible={showChat} onClose={() => setShowChat(false)} />

      {/* Modal de Central de Ajuda */}
      <HelpCenter visible={showHelpCenter} onClose={() => setShowHelpCenter(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  chatCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  chatDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  chatArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  faqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  faqCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  faqIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  faqInfo: {
    flex: 1,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  faqDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  faqArrow: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  quickHelpGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickHelpCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickHelpIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickHelpTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  quickHelpDesc: {
    fontSize: 12,
    lineHeight: 16,
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
});
