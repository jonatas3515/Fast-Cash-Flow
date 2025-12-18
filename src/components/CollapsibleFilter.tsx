import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { fontSizes, fontWeights, spacing, radii } from '../theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleFilterProps {
    title: string;
    subtitle?: string;
    icon?: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    onToggle?: (expanded: boolean) => void;
    activeFiltersCount?: number;
}

export default function CollapsibleFilter({
    title,
    subtitle,
    icon = '🔍',
    children,
    defaultExpanded = false,
    onToggle,
    activeFiltersCount = 0,
}: CollapsibleFilterProps) {
    const { theme } = useThemeCtx();
    const [expanded, setExpanded] = React.useState(defaultExpanded);
    const rotateAnim = React.useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

    const toggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const newExpanded = !expanded;
        setExpanded(newExpanded);
        onToggle?.(newExpanded);

        Animated.timing(rotateAnim, {
            toValue: newExpanded ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    };

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
                style={styles.header}
                onPress={toggle}
                activeOpacity={0.7}
            >
                <View style={styles.headerLeft}>
                    <Text style={styles.icon}>{icon}</Text>
                    <View style={styles.titleContainer}>
                        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                        {subtitle && (
                            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
                        )}
                    </View>
                </View>
                <View style={styles.headerRight}>
                    {activeFiltersCount > 0 && (
                        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                            <Text style={styles.badgeText}>{activeFiltersCount}</Text>
                        </View>
                    )}
                    <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                        <Text style={[styles.chevron, { color: theme.textSecondary }]}>▼</Text>
                    </Animated.View>
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={[styles.content, { borderTopColor: theme.border }]}>
                    {children}
                </View>
            )}
        </View>
    );
}

// Quick filter pills component for common use case
interface FilterPillProps {
    label: string;
    active: boolean;
    onPress: () => void;
    color?: string;
}

export function FilterPill({ label, active, onPress, color }: FilterPillProps) {
    const { theme } = useThemeCtx();
    const activeColor = color || theme.primary;

    return (
        <TouchableOpacity
            style={[
                styles.pill,
                {
                    backgroundColor: active ? activeColor : 'transparent',
                    borderColor: active ? activeColor : theme.border,
                },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text
                style={[
                    styles.pillText,
                    { color: active ? '#fff' : theme.text },
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}

// Filter row with multiple pills
interface FilterRowProps {
    options: { key: string; label: string; color?: string }[];
    activeKey: string;
    onSelect: (key: string) => void;
}

export function FilterRow({ options, activeKey, onSelect }: FilterRowProps) {
    return (
        <View style={styles.filterRow}>
            {options.map((option) => (
                <FilterPill
                    key={option.key}
                    label={option.label}
                    active={activeKey === option.key}
                    onPress={() => onSelect(option.key)}
                    color={option.color}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: radii.md,
        borderWidth: 1,
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    icon: {
        fontSize: 20,
        marginRight: spacing.sm + 4,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: fontSizes.base,
        fontWeight: fontWeights.semibold,
    },
    subtitle: {
        fontSize: fontSizes.xs,
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    badge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: '#fff',
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.bold,
    },
    chevron: {
        fontSize: 12,
    },
    content: {
        padding: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
    },
    pill: {
        paddingHorizontal: spacing.sm + 4,
        paddingVertical: spacing.xs + 2,
        borderRadius: radii.full,
        borderWidth: 1,
    },
    pillText: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.medium,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
});
