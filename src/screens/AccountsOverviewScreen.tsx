/**
 * Accounts Overview Screen
 * Unified view of payables (A Pagar) and receivables (A Receber).
 * Shows summary cards with overdue, due today, next 7 days, and this month.
 * 
 * Reuses existing repositories and logic from PayablesScreen and ReceivablesScreen.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import { listPayables, Payable } from '../repositories/payables';
import { listReceivables, Receivable } from '../repositories/receivables';
import { formatCentsBRL } from '../utils/money';
import ScreenTitle from '../components/ScreenTitle';

function todayYMD() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getEndOfMonth(): string {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
}

interface SummaryData {
    overdue: number;
    overdueCount: number;
    today: number;
    todayCount: number;
    next7Days: number;
    next7DaysCount: number;
    thisMonth: number;
    thisMonthCount: number;
}

function calculateSummary(items: (Payable | Receivable)[], dueDateField: 'due_date'): SummaryData {
    const today = todayYMD();
    const in7Days = addDays(today, 7);
    const endOfMonth = getEndOfMonth();

    let overdue = 0, overdueCount = 0;
    let todayAmt = 0, todayCount = 0;
    let next7Days = 0, next7DaysCount = 0;
    let thisMonth = 0, thisMonthCount = 0;

    for (const item of items) {
        const dueDate = (item as any)[dueDateField];
        const amount = (item as any).amount_cents || (item as any).remaining_cents || 0;
        const status = (item as any).status;

        // Skip if already paid/received
        if (status === 'paid' || status === 'received') continue;

        if (dueDate < today) {
            overdue += amount;
            overdueCount++;
        } else if (dueDate === today) {
            todayAmt += amount;
            todayCount++;
        } else if (dueDate <= in7Days) {
            next7Days += amount;
            next7DaysCount++;
        } else if (dueDate <= endOfMonth) {
            thisMonth += amount;
            thisMonthCount++;
        }
    }

    return {
        overdue,
        overdueCount,
        today: todayAmt,
        todayCount,
        next7Days,
        next7DaysCount,
        thisMonth,
        thisMonthCount,
    };
}

export default function AccountsOverviewScreen() {
    const { theme } = useThemeCtx();
    const { formatMoney } = useI18n();
    const navigation = useNavigation<any>();

    // Fetch payables
    const payablesQ = useQuery({
        queryKey: ['payables-overview'],
        queryFn: listPayables,
    });

    // Fetch receivables
    const receivablesQ = useQuery({
        queryKey: ['receivables-overview'],
        queryFn: listReceivables,
    });

    const payables = payablesQ.data || [];
    const receivables = receivablesQ.data || [];

    const payablesSummary = React.useMemo(() => calculateSummary(payables, 'due_date'), [payables]);
    const receivablesSummary = React.useMemo(() => calculateSummary(receivables, 'due_date'), [receivables]);

    const SummaryCard = ({
        icon,
        label,
        amount,
        count,
        color,
        onPress
    }: {
        icon: string;
        label: string;
        amount: number;
        count: number;
        color: string;
        onPress?: () => void;
    }) => (
        <TouchableOpacity
            style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: color }]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <Text style={styles.summaryIcon}>{icon}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{label}</Text>
            <Text style={[styles.summaryAmount, { color }]}>{formatMoney(amount)}</Text>
            <Text style={[styles.summaryCount, { color: theme.textSecondary }]}>{count} itens</Text>
        </TouchableOpacity>
    );

    const Section = ({
        title,
        icon,
        summary,
        type,
        navigateTo
    }: {
        title: string;
        icon: string;
        summary: SummaryData;
        type: 'payable' | 'receivable';
        navigateTo: string;
    }) => {
        const mainColor = type === 'payable' ? '#DC2626' : '#16A34A';

        return (
            <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{icon} {title}</Text>
                    <TouchableOpacity
                        style={[styles.viewAllBtn, { backgroundColor: mainColor }]}
                        onPress={() => navigation.navigate(navigateTo)}
                    >
                        <Text style={styles.viewAllText}>Ver Todos →</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.cardsGrid}>
                    <SummaryCard
                        icon="🔴"
                        label="Vencidas"
                        amount={summary.overdue}
                        count={summary.overdueCount}
                        color="#DC2626"
                        onPress={() => navigation.navigate(navigateTo)}
                    />
                    <SummaryCard
                        icon="🟡"
                        label="Vence Hoje"
                        amount={summary.today}
                        count={summary.todayCount}
                        color="#F59E0B"
                        onPress={() => navigation.navigate(navigateTo)}
                    />
                    <SummaryCard
                        icon="🟠"
                        label="Próximos 7 dias"
                        amount={summary.next7Days}
                        count={summary.next7DaysCount}
                        color="#F97316"
                        onPress={() => navigation.navigate(navigateTo)}
                    />
                    <SummaryCard
                        icon="⚪"
                        label="Este mês"
                        amount={summary.thisMonth}
                        count={summary.thisMonthCount}
                        color="#6B7280"
                        onPress={() => navigation.navigate(navigateTo)}
                    />
                </View>
            </View>
        );
    };

    const totalPayable = payablesSummary.overdue + payablesSummary.today + payablesSummary.next7Days + payablesSummary.thisMonth;
    const totalReceivable = receivablesSummary.overdue + receivablesSummary.today + receivablesSummary.next7Days + receivablesSummary.thisMonth;
    const balance = totalReceivable - totalPayable;

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                <ScreenTitle
                    title="Contas"
                    subtitle="Visão geral de contas a pagar e receber"
                />

                {/* Balance Overview */}
                <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.balanceRow}>
                        <View style={styles.balanceItem}>
                            <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>📥 A Receber</Text>
                            <Text style={[styles.balanceValue, { color: '#16A34A' }]}>{formatMoney(totalReceivable)}</Text>
                        </View>
                        <View style={[styles.balanceDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.balanceItem}>
                            <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>📤 A Pagar</Text>
                            <Text style={[styles.balanceValue, { color: '#DC2626' }]}>{formatMoney(totalPayable)}</Text>
                        </View>
                    </View>
                    <View style={[styles.balanceTotal, { borderTopColor: theme.border }]}>
                        <Text style={[styles.balanceTotalLabel, { color: theme.text }]}>💰 Saldo Previsto</Text>
                        <Text style={[styles.balanceTotalValue, { color: balance >= 0 ? '#16A34A' : '#DC2626' }]}>
                            {formatMoney(balance)}
                        </Text>
                    </View>
                </View>

                {/* Contas a Pagar Section */}
                <Section
                    title="Contas a Pagar"
                    icon="📤"
                    summary={payablesSummary}
                    type="payable"
                    navigateTo="A Pagar"
                />

                {/* Contas a Receber Section */}
                <Section
                    title="Contas a Receber"
                    icon="📥"
                    summary={receivablesSummary}
                    type="receivable"
                    navigateTo="A Receber"
                />

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={[styles.quickBtn, { backgroundColor: '#DC2626' }]}
                        onPress={() => navigation.navigate('A Pagar')}
                    >
                        <Text style={styles.quickBtnText}>➕ Nova Conta a Pagar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickBtn, { backgroundColor: '#16A34A' }]}
                        onPress={() => navigation.navigate('A Receber')}
                    >
                        <Text style={styles.quickBtnText}>➕ Nova Conta a Receber</Text>
                    </TouchableOpacity>
                </View>

                {/* Info */}
                <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.infoTitle, { color: theme.text }]}>ℹ️ Sobre esta tela</Text>
                    <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                        Esta é uma visão consolidada das suas contas. Use os botões "Ver Todos" para acessar
                        as telas completas de Contas a Pagar e Contas a Receber.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    balanceCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    balanceItem: {
        alignItems: 'center',
        flex: 1,
    },
    balanceDivider: {
        width: 1,
        height: 50,
    },
    balanceLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    balanceValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    balanceTotal: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    balanceTotalLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    balanceTotalValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    section: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    viewAllBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    viewAllText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
    cardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    summaryCard: {
        flex: 1,
        minWidth: '45%',
        padding: 12,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
    },
    summaryIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 11,
        marginBottom: 4,
        textAlign: 'center',
    },
    summaryAmount: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 2,
    },
    summaryCount: {
        fontSize: 10,
    },
    quickActions: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    quickBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    quickBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    infoCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    infoTitle: {
        fontWeight: '700',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 13,
        lineHeight: 20,
    },
});
