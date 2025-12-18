import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { fontSizes, fontWeights, spacing, radii } from '../theme';

export type SummaryCardVariant = 'default' | 'positive' | 'negative' | 'warning' | 'info';

interface SummaryCardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon?: string;
    variant?: SummaryCardVariant;
    onPress?: () => void;
    trend?: {
        value: string;
        direction: 'up' | 'down' | 'neutral';
    };
    compact?: boolean;
}

export default function SummaryCard({
    title,
    value,
    subtitle,
    icon,
    variant = 'default',
    onPress,
    trend,
    compact = false,
}: SummaryCardProps) {
    const { theme, mode } = useThemeCtx();

    const getVariantColors = () => {
        switch (variant) {
            case 'positive':
                return {
                    accent: theme.positive,
                    bg: mode === 'dark' ? 'rgba(22,163,74,0.1)' : 'rgba(22,163,74,0.08)',
                    border: theme.positive,
                };
            case 'negative':
                return {
                    accent: theme.negative,
                    bg: mode === 'dark' ? 'rgba(217,4,41,0.1)' : 'rgba(217,4,41,0.08)',
                    border: theme.negative,
                };
            case 'warning':
                return {
                    accent: theme.warning,
                    bg: mode === 'dark' ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)',
                    border: theme.warning,
                };
            case 'info':
                return {
                    accent: theme.primary,
                    bg: mode === 'dark' ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.08)',
                    border: theme.primary,
                };
            default:
                return {
                    accent: theme.text,
                    bg: theme.card,
                    border: theme.border,
                };
        }
    };

    const colors = getVariantColors();

    const getTrendIcon = () => {
        if (!trend) return null;
        switch (trend.direction) {
            case 'up':
                return '↑';
            case 'down':
                return '↓';
            default:
                return '→';
        }
    };

    const getTrendColor = () => {
        if (!trend) return theme.textSecondary;
        switch (trend.direction) {
            case 'up':
                return theme.positive;
            case 'down':
                return theme.negative;
            default:
                return theme.textSecondary;
        }
    };

    const content = (
        <View
            style={[
                compact ? styles.compactCard : styles.card,
                {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    borderLeftColor: variant !== 'default' ? colors.accent : colors.border,
                    borderLeftWidth: variant !== 'default' ? 4 : 1,
                },
            ]}
        >
            {/* Header row with icon and title */}
            <View style={styles.header}>
                {icon && <Text style={styles.icon}>{icon}</Text>}
                <Text style={[styles.title, { color: theme.textSecondary }]} numberOfLines={1}>
                    {title}
                </Text>
                {trend && (
                    <View style={[styles.trendBadge, { backgroundColor: getTrendColor() + '20' }]}>
                        <Text style={[styles.trendText, { color: getTrendColor() }]}>
                            {getTrendIcon()} {trend.value}
                        </Text>
                    </View>
                )}
            </View>

            {/* Value */}
            <Text
                style={[
                    compact ? styles.compactValue : styles.value,
                    { color: variant === 'default' ? theme.text : colors.accent },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
            >
                {value}
            </Text>

            {/* Subtitle */}
            {subtitle && (
                <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                    {subtitle}
                </Text>
            )}
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                {content}
            </TouchableOpacity>
        );
    }

    return content;
}

// Grid layout for multiple summary cards
interface SummaryGridProps {
    children: React.ReactNode;
    columns?: 2 | 3 | 4;
}

export function SummaryGrid({ children, columns = 2 }: SummaryGridProps) {
    return (
        <View style={[styles.grid, { gap: spacing.sm }]}>
            {React.Children.map(children, (child, index) => (
                <View style={{ flex: 1, minWidth: columns === 2 ? '48%' : columns === 3 ? '31%' : '23%' }}>
                    {child}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: radii.md,
        borderWidth: 1,
        padding: spacing.md,
        minWidth: 140,
    },
    compactCard: {
        borderRadius: radii.sm,
        borderWidth: 1,
        padding: spacing.sm + 4,
        minWidth: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
        gap: spacing.xs,
    },
    icon: {
        fontSize: 16,
    },
    title: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.medium,
        flex: 1,
    },
    trendBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: radii.sm,
    },
    trendText: {
        fontSize: 10,
        fontWeight: fontWeights.bold,
    },
    value: {
        fontSize: fontSizes.xl,
        fontWeight: fontWeights.extrabold,
        marginTop: spacing.xs,
    },
    compactValue: {
        fontSize: fontSizes.lg,
        fontWeight: fontWeights.bold,
        marginTop: spacing.xs,
    },
    subtitle: {
        fontSize: fontSizes.xs,
        marginTop: spacing.xs,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
});
