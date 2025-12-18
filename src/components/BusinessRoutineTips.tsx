import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { getCurrentCompanyId } from '../lib/company';
import { getCompanyProfile, getRoutineTips, getOnboardingMessage, getBusinessProfile, normalizeBusinessType } from '../repositories/company_profile';
import { getCompanySegment } from '../repositories/companies';
import * as SecureStore from 'expo-secure-store';
import { resolveBusinessTypeFromCompanySegment } from '../utils/segment';

// Storage helper
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
};

interface BusinessRoutineTipsProps {
  navigation?: any;
  compact?: boolean;
  onDismiss?: () => void;
}

export default function BusinessRoutineTips({ navigation, compact = false, onDismiss }: BusinessRoutineTipsProps) {
  const { theme } = useThemeCtx();
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const companyId = await getCurrentCompanyId();
      if (!companyId) {
        setIsLoading(false);
        return;
      }

      // Verificar se foi dispensado
      const dismissed = await storage.getItem(`routine_tips_dismissed_${companyId}`);
      if (dismissed === 'true') {
        setIsDismissed(true);
        setIsLoading(false);
        return;
      }

      const [segment, profile] = await Promise.all([
        getCompanySegment(companyId),
        getCompanyProfile(companyId),
      ]);

      setBusinessType(resolveBusinessTypeFromCompanySegment(segment, profile?.business_type ?? null));
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    try {
      const companyId = await getCurrentCompanyId();
      if (companyId) {
        await storage.setItem(`routine_tips_dismissed_${companyId}`, 'true');
      }
      setIsDismissed(true);
      onDismiss?.();
    } catch (error) {
      console.error('Erro ao dispensar dicas:', error);
    }
  };

  if (isLoading || isDismissed || !businessType) return null;

  const normalizedType = normalizeBusinessType(businessType);
  const profile = getBusinessProfile(normalizedType);
  const tips = getRoutineTips(businessType);
  const onboardingMessage = getOnboardingMessage(businessType);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: '#6366F120', borderColor: '#6366F1' }]}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactIcon}>{profile.icon}</Text>
          <Text style={[styles.compactTitle, { color: theme.text }]}>
            Dicas para {profile.name}
          </Text>
        </View>
        <Text style={[styles.compactTip, { color: theme.textSecondary }]}>
          {tips[0]}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>{profile.icon}</Text>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>
              Como empresas como a sua usam o app
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {profile.name}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn}>
          <Text style={[styles.dismissText, { color: theme.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Mensagem de onboarding */}
      <View style={[styles.messageBox, { backgroundColor: '#6366F110' }]}>
        <Text style={[styles.messageText, { color: theme.text }]}>
          {onboardingMessage}
        </Text>
      </View>

      {/* Dicas de rotina */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        📋 Sugestões de rotina:
      </Text>
      
      {tips.map((tip, index) => (
        <View key={index} style={styles.tipItem}>
          <View style={[styles.tipNumber, { backgroundColor: '#6366F1' }]}>
            <Text style={styles.tipNumberText}>{index + 1}</Text>
          </View>
          <Text style={[styles.tipText, { color: theme.text }]}>{tip}</Text>
        </View>
      ))}

      {/* Botão para configurações */}
      <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: '#6366F1' }]}
        onPress={() => navigation?.navigate('Settings')}
      >
        <Text style={styles.actionButtonText}>
          ⚙️ Alterar tipo de negócio
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleDismiss} style={styles.dismissLink}>
        <Text style={[styles.dismissLinkText, { color: theme.textSecondary }]}>
          Entendi, não mostrar novamente
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Componente para exibir categorias sugeridas
export function SuggestedCategories({ type, businessType }: { type: 'income' | 'expense', businessType: string | null }) {
  const { theme } = useThemeCtx();
  
  if (!businessType) return null;

  const profile = getBusinessProfile(normalizeBusinessType(businessType));
  const categories = type === 'income' ? profile.incomeCategories : profile.expenseCategories;

  return (
    <View style={suggestedStyles.container}>
      <Text style={[suggestedStyles.label, { color: theme.textSecondary }]}>
        💡 Categorias sugeridas para {profile.name}:
      </Text>
      <View style={suggestedStyles.tagsContainer}>
        {categories.slice(0, 5).map((cat, index) => (
          <View key={index} style={[suggestedStyles.tag, { backgroundColor: theme.background }]}>
            <Text style={[suggestedStyles.tagText, { color: theme.text }]}>{cat}</Text>
          </View>
        ))}
        {categories.length > 5 && (
          <View style={[suggestedStyles.tag, { backgroundColor: '#6366F120' }]}>
            <Text style={[suggestedStyles.tagText, { color: '#6366F1' }]}>+{categories.length - 5}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  dismissBtn: {
    padding: 4,
  },
  dismissText: {
    fontSize: 18,
  },
  messageBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  tipNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  actionButton: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  dismissLink: {
    alignItems: 'center',
    marginTop: 12,
  },
  dismissLinkText: {
    fontSize: 12,
  },
  // Compact styles
  compactContainer: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  compactIcon: {
    fontSize: 18,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  compactTip: {
    fontSize: 12,
    lineHeight: 16,
  },
});

const suggestedStyles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    marginBottom: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
