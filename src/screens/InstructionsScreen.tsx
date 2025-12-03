import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions, Linking } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import ScreenTitle from '../components/ScreenTitle';
import { useI18n } from '../i18n/I18nProvider';

interface Topic {
  id: string;
  icon: string;
  title: string;
  content: string;
  color: string;
}

export default function InstructionsScreen() {
  const { theme } = useThemeCtx();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const topics: Topic[] = [
    {
      id: 'transaction',
      icon: '💰',
      title: 'Como adicionar uma transação (entrada/saída)',
      content: 'Conteúdo será adicionado em breve...',
      color: '#DBEAFE',
    },
    {
      id: 'recurring',
      icon: '🔁',
      title: 'Como cadastrar uma despesa recorrente',
      content: 'Conteúdo será adicionado em breve...',
      color: '#FEF3C7',
    },
    {
      id: 'debts',
      icon: '💳',
      title: 'Como cadastrar e acompanhar dívidas',
      content: 'Conteúdo será adicionado em breve...',
      color: '#FEE2E2',
    },
    {
      id: 'goals',
      icon: '🎯',
      title: 'Como definir e acompanhar metas financeiras',
      content: 'Conteúdo será adicionado em breve...',
      color: '#D1FAE5',
    },
    {
      id: 'reports',
      icon: '📊',
      title: 'Como gerar relatórios em PDF ou enviar por WhatsApp',
      content: 'Conteúdo será adicionado em breve...',
      color: '#EDE9FE',
    },
    {
      id: 'dashboard',
      icon: '📈',
      title: 'Como interpretar o dashboard',
      content: 'Conteúdo será adicionado em breve...',
      color: '#F3E8FF',
    },
    {
      id: 'tips',
      icon: '💡',
      title: 'Dicas de controle financeiro para MEIs e autônomos',
      content: 'Conteúdo será adicionado em breve...',
      color: '#F0FDF4',
    },
  ];

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <ScreenTitle 
          title="Instruções" 
          subtitle="Aprenda a usar o sistema" 
        />

        <View style={styles.grid}>
          {topics.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={[styles.card, { backgroundColor: topic.color, borderColor: theme.card, width: isDesktop ? '48%' : '100%' }]}
              onPress={() => toggleExpand(topic.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.icon}>{topic.icon}</Text>
                <Text style={[styles.cardTitle, { color: '#111111' }]}>{topic.title}</Text>
              </View>
              {expandedId === topic.id && (
                <View style={styles.expandedContent}>
                  <Text style={[styles.content, { color: '#666' }]}>{topic.content}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.supportSection}>
          <Text style={[styles.supportTitle, { color: theme.text }]}>Precisa de ajuda?</Text>
          <TouchableOpacity
            style={[styles.supportButton, { backgroundColor: '#16A34A' }]}
            onPress={() => {
              // TODO: Implementar contato com suporte
            }}
          >
            <Text style={styles.supportButtonText}>Entrar em contato com suporte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    minHeight: 80,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 24,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  supportSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  supportButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
