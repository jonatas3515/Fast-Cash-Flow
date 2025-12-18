import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ComparisonBadgeProps {
    currentValue: number;
    previousValue: number;
    label?: string;
    compact?: boolean;
}

/**
 * Shows a comparison badge like "+18% vs mês passado"
 */
export function ComparisonBadge({ currentValue, previousValue, label = 'vs anterior', compact = false }: ComparisonBadgeProps) {
    if (previousValue === 0) {
        return null; // Can't calculate percentage if previous is 0
    }

    const percentChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    const isPositive = percentChange > 0;
    const isNeutral = Math.abs(percentChange) < 1;

    const color = isNeutral ? '#6b7280' : isPositive ? '#16A34A' : '#DC2626';
    const sign = isPositive ? '+' : '';
    const icon = isNeutral ? '→' : isPositive ? '↑' : '↓';

    if (compact) {
        return (
            <View style={[styles.badgeCompact, { backgroundColor: color + '15' }]}>
                <Text style={[styles.badgeTextCompact, { color }]}>
                    {icon} {sign}{percentChange.toFixed(0)}%
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.badge, { backgroundColor: color + '15', borderColor: color + '30' }]}>
            <Text style={[styles.badgeText, { color }]}>
                {icon} {sign}{percentChange.toFixed(0)}% {label}
            </Text>
        </View>
    );
}

interface PeriodComparisonProps {
    income: { current: number; previous: number; lastYear?: number };
    expense: { current: number; previous: number; lastYear?: number };
    balance: { current: number; previous: number; lastYear?: number };
    showLastYear?: boolean;
}

/**
 * Component to show period comparisons for income, expense, and balance
 */
export default function PeriodComparison({ income, expense, balance, showLastYear = false }: PeriodComparisonProps) {
    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <View style={styles.item}>
                    <Text style={styles.label}>Entradas</Text>
                    <ComparisonBadge
                        currentValue={income.current}
                        previousValue={income.previous}
                        label="vs mês"
                        compact
                    />
                    {showLastYear && income.lastYear !== undefined && (
                        <ComparisonBadge
                            currentValue={income.current}
                            previousValue={income.lastYear}
                            label="vs ano"
                            compact
                        />
                    )}
                </View>

                <View style={styles.item}>
                    <Text style={styles.label}>Saídas</Text>
                    <ComparisonBadge
                        currentValue={expense.current}
                        previousValue={expense.previous}
                        label="vs mês"
                        compact
                    />
                </View>

                <View style={styles.item}>
                    <Text style={styles.label}>Saldo</Text>
                    <ComparisonBadge
                        currentValue={balance.current}
                        previousValue={balance.previous}
                        label="vs mês"
                        compact
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    item: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    label: {
        fontSize: 10,
        color: '#6b7280',
        fontWeight: '500',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    badgeCompact: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    badgeTextCompact: {
        fontSize: 10,
        fontWeight: '700',
    },
});
