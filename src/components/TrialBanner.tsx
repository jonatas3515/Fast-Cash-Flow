import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { getCurrentCompanyId } from '../lib/company';

interface TrialBannerProps {
  navigation?: any;
  onUpgrade?: () => void;
}

interface PersonalizedOffer {
  id: string;
  offer_type: string;
  title: string;
  description: string;
  discount_percent: number;
  bonus_days: number;
  condition_type: string;
  valid_until: string;
}

export default function TrialBanner({ navigation, onUpgrade }: TrialBannerProps) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Usar cores do tema diretamente
  const colors = {
    background: theme.card,
    border: theme.border,
    text: theme.text,
    textSecondary: theme.textSecondary,
  };

  // Query para buscar dados do trial
  const { data: trialData, isLoading } = useQuery({
    queryKey: ['trial-status'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;

      // Buscar dados da empresa
      const { data: company } = await supabase
        .from('companies')
        .select('status, trial_end, created_at, name')
        .eq('id', companyId)
        .single();

      if (!company) return null;

      // Calcular dias restantes
      const trialEnd = new Date(company.trial_end);
      const today = new Date();
      const daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Contar transações para determinar nível de atividade
      const { count: transactionCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Buscar progresso do onboarding
      const { data: onboarding } = await supabase
        .from('onboarding_progress')
        .select('completion_percent')
        .eq('company_id', companyId)
        .single();

      // Gerar oferta personalizada
      const offer = generateOffer(
        company.status,
        daysLeft,
        transactionCount ?? 0,
        onboarding?.completion_percent ?? 0
      );

      return {
        status: company.status,
        trialEnd: company.trial_end,
        daysLeft,
        transactionCount: transactionCount ?? 0,
        onboardingPercent: onboarding?.completion_percent ?? 0,
        offer,
      };
    },
    refetchInterval: 60000,
  });

  // Função para gerar oferta personalizada
  const generateOffer = (
    status: string,
    daysLeft: number,
    transactionCount: number,
    onboardingPercent: number
  ): PersonalizedOffer | null => {
    // Empresa inativa
    if (transactionCount < 5) {
      return {
        id: 'inactive',
        offer_type: 'extra_trial_days',
        title: '🎁 Ganhe +7 dias grátis!',
        description: 'Vejo que você ainda não usou muito o sistema. Que tal mais 7 dias para testar todas as funcionalidades?',
        discount_percent: 0,
        bonus_days: 7,
        condition_type: 'inactive_user',
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    // Empresa muito ativa
    if (transactionCount >= 20) {
      return {
        id: 'active',
        offer_type: 'first_month_discount',
        title: '🚀 Você está arrasando! 20% OFF',
        description: `Com ${transactionCount} lançamentos, você já dominou o sistema! Garanta 20% de desconto no primeiro mês!`,
        discount_percent: 20,
        bonus_days: 0,
        condition_type: 'active_user',
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    // Onboarding incompleto
    if (onboardingPercent < 100) {
      return {
        id: 'incomplete',
        offer_type: 'lifetime_discount',
        title: '✨ Complete e ganhe 15% OFF',
        description: `Você está a ${100 - onboardingPercent}% de completar o onboarding. Termine e ganhe 15% de desconto VITALÍCIO!`,
        discount_percent: 15,
        bonus_days: 0,
        condition_type: 'incomplete_profile',
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    // Trial expirando
    if (daysLeft <= 5 && daysLeft > 0) {
      return {
        id: 'expiring',
        offer_type: 'first_month_discount',
        title: `⏰ Últimos ${daysLeft} dias! 25% OFF`,
        description: 'Seu trial está acabando! Ative agora com 25% de desconto e não perca seus dados.',
        discount_percent: 25,
        bonus_days: 0,
        condition_type: 'expiring_soon',
        valid_until: new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    // Trial expirado
    if (status === 'expired' || status === 'blocked') {
      return {
        id: 'expired',
        offer_type: 'first_month_discount',
        title: '💔 Sentimos sua falta! 30% OFF',
        description: 'Volte para o Fast Cash Flow com 30% de desconto no primeiro mês. Seus dados estão esperando!',
        discount_percent: 30,
        bonus_days: 0,
        condition_type: 'expired',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    // Oferta padrão
    return {
      id: 'default',
      offer_type: 'first_month_discount',
      title: '🎉 Oferta especial!',
      description: 'Ative sua assinatura agora e ganhe 10% de desconto no primeiro mês!',
      discount_percent: 10,
      bonus_days: 0,
      condition_type: 'active_user',
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  };

  // Não mostrar se não está em trial ou foi dispensado
  if (isLoading || !trialData || trialData.status === 'active' || dismissed) {
    return null;
  }

  const { daysLeft, offer } = trialData;
  const isExpired = daysLeft <= 0;
  const isUrgent = daysLeft <= 5;

  // Determinar cor do banner baseado na urgência
  const bannerColor = isExpired
    ? '#EF4444'
    : isUrgent
      ? '#F59E0B'
      : '#3B82F6';

  // Abrir WhatsApp para upgrade
  const handleUpgrade = () => {
    // Buscar número do WhatsApp do localStorage ou usar padrão
    let whatsappNumber = '5573999348552';
    if (Platform.OS === 'web') {
      try {
        whatsappNumber = localStorage.getItem('fcf_whatsapp_number') || whatsappNumber;
      } catch { }
    }

    const message = encodeURIComponent(
      `Olá! Gostaria de ativar minha assinatura do Fast Cash Flow.${offer?.discount_percent ? ` Vi que tenho ${offer.discount_percent}% de desconto disponível!` : ''}`
    );

    const url = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${message}`;
    Linking.openURL(url);

    if (onUpgrade) onUpgrade();
  };

  return (
    <>
      {/* Banner Principal */}
      <TouchableOpacity
        style={[styles.banner, { backgroundColor: bannerColor }]}
        onPress={() => setShowOfferModal(true)}
        activeOpacity={0.9}
      >
        <View style={styles.bannerContent}>
          <Text style={styles.bannerIcon}>
            {isExpired ? '❌' : isUrgent ? '⏰' : '🎁'}
          </Text>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>
              {isExpired
                ? 'Seu trial expirou!'
                : isUrgent
                  ? `Apenas ${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}!`
                  : `${daysLeft} dias de trial restantes`
              }
            </Text>
            <Text style={styles.bannerSubtitle}>
              {offer?.title || 'Toque para ver ofertas especiais'}
            </Text>
          </View>
          <Text style={styles.bannerArrow}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Modal de Oferta */}
      <Modal
        visible={showOfferModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOfferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {/* Header do Modal */}
            <View style={[styles.modalHeader, { backgroundColor: bannerColor }]}>
              <Text style={styles.modalHeaderIcon}>
                {offer?.offer_type === 'extra_trial_days' ? '🎁' : '💰'}
              </Text>
              <Text style={styles.modalHeaderTitle}>{offer?.title}</Text>
            </View>

            {/* Corpo do Modal */}
            <View style={styles.modalBody}>
              <Text style={[styles.modalDescription, { color: colors.text }]}>
                {offer?.description}
              </Text>

              {/* Detalhes da Oferta */}
              {offer?.discount_percent ? (
                <View style={[styles.offerDetail, { backgroundColor: bannerColor + '20' }]}>
                  <Text style={[styles.offerDetailValue, { color: bannerColor }]}>
                    {offer.discount_percent}% OFF
                  </Text>
                  <Text style={[styles.offerDetailLabel, { color: colors.textSecondary }]}>
                    no primeiro mês
                  </Text>
                </View>
              ) : offer?.bonus_days ? (
                <View style={[styles.offerDetail, { backgroundColor: bannerColor + '20' }]}>
                  <Text style={[styles.offerDetailValue, { color: bannerColor }]}>
                    +{offer.bonus_days} dias
                  </Text>
                  <Text style={[styles.offerDetailLabel, { color: colors.textSecondary }]}>
                    de trial grátis
                  </Text>
                </View>
              ) : null}

              {/* Preço */}
              <View style={styles.priceSection}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                  A partir de
                </Text>
                <View style={styles.priceRow}>
                  {offer?.discount_percent ? (
                    <>
                      <Text style={[styles.priceOld, { color: colors.textSecondary }]}>
                        R$ 9,99
                      </Text>
                      <Text style={[styles.priceNew, { color: bannerColor }]}>
                        R$ {(9.99 * (1 - offer.discount_percent / 100)).toFixed(2)}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.priceNew, { color: bannerColor }]}>
                      R$ 9,99
                    </Text>
                  )}
                  <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
                    /mês
                  </Text>
                </View>
              </View>

              {/* Validade */}
              {offer?.valid_until && (
                <Text style={[styles.validUntil, { color: colors.textSecondary }]}>
                  ⏱️ Oferta válida até {new Date(offer.valid_until).toLocaleDateString('pt-BR')}
                </Text>
              )}
            </View>

            {/* Botões */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.upgradeButton, { backgroundColor: bannerColor }]}
                onPress={handleUpgrade}
              >
                <Text style={styles.upgradeButtonText}>
                  {offer?.bonus_days ? 'Ganhar Dias Grátis' : 'Ativar Agora'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.laterButton}
                onPress={() => setShowOfferModal(false)}
              >
                <Text style={[styles.laterButtonText, { color: colors.textSecondary }]}>
                  Talvez depois
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  bannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  bannerArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 24,
    alignItems: 'center',
  },
  modalHeaderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalBody: {
    padding: 24,
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  offerDetail: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  offerDetailValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  offerDetailLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  priceSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceOld: {
    fontSize: 16,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  priceNew: {
    fontSize: 28,
    fontWeight: '800',
  },
  pricePeriod: {
    fontSize: 14,
    marginLeft: 4,
  },
  validUntil: {
    fontSize: 12,
    textAlign: 'center',
  },
  modalButtons: {
    padding: 24,
    paddingTop: 0,
  },
  upgradeButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  laterButton: {
    padding: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 14,
  },
});
