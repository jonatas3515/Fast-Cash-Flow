/**
 * Feature Banner Component
 * 
 * Displays feature banners that reinforce landing page promises in app screens
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { spacing, radii, fontSizes, fontWeights } from '../theme';

interface FeatureBannerProps {
    icon?: string;
    title: string;
    subtitle?: string;
    variant?: 'default' | 'success' | 'info';
}

export default function FeatureBanner({
    icon = '✨',
    title,
    subtitle,
    variant = 'default'
}: FeatureBannerProps) {
    const { theme } = useThemeCtx();

    const getBackgroundColor = () => {
        switch (variant) {
            case 'success':
                return `${theme.positive}12`;
            case 'info':
                return `${theme.secondary}12`;
            default:
                return `${theme.primary}10`;
        }
    };

    const getAccentColor = () => {
        switch (variant) {
            case 'success':
                return theme.positive;
            case 'info':
                return theme.secondary;
            default:
                return theme.primary;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
            <Text style={styles.icon}>{icon}</Text>
            <View style={styles.content}>
                <Text style={[styles.title, { color: getAccentColor() }]}>{title}</Text>
                {subtitle && (
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm + 4,
        borderRadius: radii.md,
        marginBottom: spacing.md,
    },
    icon: {
        fontSize: 20,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.semibold,
    },
    subtitle: {
        fontSize: fontSizes.xs,
        marginTop: 2,
    },
});

// Pre-defined banners for different screens
export const FEATURE_BANNERS = {
    reports: {
        icon: '📋',
        title: 'Relatórios prontos para o contador',
        subtitle: 'Exporte análises organizadas em segundos',
    },
    payables: {
        icon: '📤',
        title: 'Controle simples de contas a pagar',
        subtitle: 'Nunca perca um vencimento',
    },
    receivables: {
        icon: '📥',
        title: 'Controle simples de contas a receber',
        subtitle: 'Acompanhe tudo que têm a receber',
    },
    goals: {
        icon: '🎯',
        title: 'Metas e saúde financeira do negócio',
        subtitle: 'Defina objetivos e acompanhe seu progresso',
    },
    diagnostic: {
        icon: '📊',
        title: 'Diagnóstico financeiro completo',
        subtitle: 'Entenda a saúde do seu negócio',
    },
    sync: {
        icon: '☁️',
        title: 'Sincronização segura em segundo plano',
        subtitle: 'Seus dados sempre atualizados',
    },
    notifications: {
        icon: '🔔',
        title: 'Lembretes automáticos de contas',
        subtitle: 'Receba alertas no celular e WhatsApp',
    },
};
