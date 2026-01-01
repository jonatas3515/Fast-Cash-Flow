import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { spacing, radii, fontSizes, fontWeights } from '../theme';
import { useNavigation } from '@react-navigation/native';

interface FinancialAction {
    id: string;
    title: string;
    description: string;
    icon: string;
    actionLabel: string;
    onPress: () => void;
    criticality: 'high' | 'medium' | 'low';
}

interface FinancialData {
    overdueReceivablesCount: number;
    overduePayablesCount: number;
    todaySalesCount: number;
    hasGoal: boolean;
    goalProgress: number;
}

interface HealthActionCardProps {
    data: FinancialData;
}

/**
 * HealthActionCard - Mostra ações recomendadas baseadas na saúde financeira
 * Implementa o conceito de "One-Click Actions"
 */
export default function HealthActionCard({ data }: HealthActionCardProps) {
    const { theme } = useThemeCtx();
    const navigation = useNavigation<any>();

    const getActions = (): FinancialAction[] => {
        const actions: FinancialAction[] = [];

        // 1. Contas Vencidas (Alta Prioridade)
        if (data.overduePayablesCount > 0) {
            actions.push({
                id: 'pay_overdue',
                title: 'Contas Vencidas',
                description: `Você tem ${data.overduePayablesCount} contas vencidas.`,
                icon: '⚠️',
                actionLabel: 'Resolver Agora',
                criticality: 'high',
                onPress: () => navigation.navigate('Payables', { filter: 'overdue' }),
            });
        }

        // 2. Recebimentos Vencidos (Média/Alta Prioridade)
        if (data.overdueReceivablesCount > 0) {
            actions.push({
                id: 'collect_overdue',
                title: 'Cobrança Pendente',
                description: `${data.overdueReceivablesCount} clientes com pagamentos atrasados.`,
                icon: '💰',
                actionLabel: 'Cobrar',
                criticality: 'medium',
                onPress: () => navigation.navigate('Receivables', { filter: 'overdue' }),
            });
        }

        // 3. Registrar Venda (se dia está parado)
        if (data.todaySalesCount === 0) {
            actions.push({
                id: 'new_sale',
                title: 'Dia sem Vendas?',
                description: 'Registre a primeira venda ou orçamento do dia.',
                icon: '🚀',
                actionLabel: 'Novo Pedido',
                criticality: 'low',
                onPress: () => navigation.navigate('Encomendas'),
            });
        }

        // 4. Definir Meta
        if (!data.hasGoal) {
            actions.push({
                id: 'set_goal',
                title: 'Definir Meta',
                description: 'Estabeleça uma meta para acompanhar seu crescimento.',
                icon: '🎯',
                actionLabel: 'Criar Meta',
                criticality: 'medium',
                onPress: () => {/* Trigger goal modal - needs context or prop */ },
            });
        }

        return actions;
    };

    const actions = getActions();

    if (actions.length === 0) {
        // Estado "Tudo Certo"
        return (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: '#16A34A' }]}>
                <View style={[styles.successHeader, { backgroundColor: '#dcfce7' }]}>
                    <Text style={styles.successIcon}>🎉</Text>
                    <Text style={[styles.successTitle, { color: '#166534' }]}>Tudo em dia!</Text>
                </View>
                <Text style={[styles.successDesc, { color: theme.textSecondary }]}>
                    Você não tem pendências urgentes. Continue assim!
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Ações Recomendadas</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {actions.map((action) => {
                    const isHigh = action.criticality === 'high';
                    const borderColor = isHigh ? '#EF4444' : theme.border;
                    const bkgColor = isHigh ? '#FEF2F2' : theme.card;

                    return (
                        <View
                            key={action.id}
                            style={[
                                styles.actionCard,
                                {
                                    backgroundColor: bkgColor,
                                    borderColor: borderColor,
                                }
                            ]}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardIcon}>{action.icon}</Text>
                                <View style={styles.cardTexts}>
                                    <Text style={[styles.cardTitle, { color: theme.text }]}>{action.title}</Text>
                                    <Text
                                        numberOfLines={2}
                                        style={[styles.cardDesc, { color: theme.textSecondary }]}
                                    >
                                        {action.description}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: isHigh ? '#EF4444' : theme.primary }
                                ]}
                                onPress={action.onPress}
                            >
                                <Text style={styles.actionButtonText}>{action.actionLabel}</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSizes.base,
        fontWeight: fontWeights.bold,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    scrollContent: {
        paddingHorizontal: spacing.sm,
        gap: spacing.md,
    },
    actionCard: {
        width: 240,
        padding: spacing.md,
        borderRadius: radii.lg,
        borderWidth: 1,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    cardIcon: {
        fontSize: 24,
    },
    cardTexts: {
        flex: 1,
    },
    cardTitle: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.bold,
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: fontSizes.xs,
        lineHeight: 16,
    },
    actionButton: {
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.bold,
    },
    // Success state
    card: {
        padding: spacing.md,
        borderRadius: radii.lg,
        borderWidth: 1,
        marginBottom: spacing.md,
        alignItems: 'center',
    },
    successHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radii.full,
        marginBottom: spacing.sm,
        gap: spacing.xs,
    },
    successIcon: {
        fontSize: 16,
    },
    successTitle: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.bold,
    },
    successDesc: {
        fontSize: fontSizes.sm,
    },
});
