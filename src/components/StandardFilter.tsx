import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { spacing, radii, fontSizes, fontWeights } from '../theme';
import CollapsibleFilter, { FilterPill, FilterRow } from './CollapsibleFilter';

// Re-export para facilitar importação
export { FilterPill, FilterRow };

export interface FilterTag {
    key: string;
    label: string;
    value: string;
    onRemove: () => void;
}

interface StandardFilterProps {
    title?: string;
    icon?: string;
    children: React.ReactNode;
    activeTags?: FilterTag[];
    onClearAll?: () => void;
    defaultExpanded?: boolean;
}

/**
 * StandardFilter - Componente padronizado de filtro para listas
 * 
 * Uso:
 * ```tsx
 * <StandardFilter
 *   title="Filtros"
 *   activeTags={[{ key: 'status', label: 'Status', value: 'Pendente', onRemove: () => setStatus(null) }]}
 *   onClearAll={() => resetFilters()}
 * >
 *   {renderFilterContent()}
 * </StandardFilter>
 * ```
 */
export default function StandardFilter({
    title = 'Filtros',
    icon = '🔍',
    children,
    activeTags = [],
    onClearAll,
    defaultExpanded = false,
}: StandardFilterProps) {
    const { theme } = useThemeCtx();
    const hasActiveFilters = activeTags.length > 0;

    return (
        <View style={styles.wrapper}>
            <CollapsibleFilter
                title={title}
                icon={icon}
                activeFiltersCount={activeTags.length}
                defaultExpanded={defaultExpanded}
            >
                {children}

                {/* Clear All Button */}
                {hasActiveFilters && onClearAll && (
                    <TouchableOpacity
                        style={[styles.clearButton, { borderColor: theme.border }]}
                        onPress={onClearAll}
                    >
                        <Text style={[styles.clearButtonText, { color: '#D90429' }]}>
                            ✕ Limpar Filtros
                        </Text>
                    </TouchableOpacity>
                )}
            </CollapsibleFilter>

            {/* Active Filter Tags */}
            {hasActiveFilters && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tagsContainer}
                    contentContainerStyle={styles.tagsContent}
                >
                    {activeTags.map((tag) => (
                        <TouchableOpacity
                            key={tag.key}
                            style={[styles.tag, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}
                            onPress={tag.onRemove}
                        >
                            <Text style={[styles.tagLabel, { color: theme.textSecondary }]}>
                                {tag.label}:
                            </Text>
                            <Text style={[styles.tagValue, { color: theme.primary }]}>
                                {tag.value}
                            </Text>
                            <Text style={[styles.tagRemove, { color: theme.primary }]}>✕</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

/**
 * FilterSection - Wrapper para agrupar campos de filtro
 */
export function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
    const { theme } = useThemeCtx();

    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
            {children}
        </View>
    );
}

/**
 * DateRangeFilter - Componente para filtro de período de datas
 */
interface DateRangeFilterProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    presets?: { label: string; days: number }[];
}

export function DateRangeFilter({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    presets = [
        { label: 'Hoje', days: 0 },
        { label: '7 dias', days: 7 },
        { label: '30 dias', days: 30 },
        { label: '90 dias', days: 90 },
    ],
}: DateRangeFilterProps) {
    const { theme } = useThemeCtx();

    const applyPreset = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);

        onStartDateChange(start.toISOString().split('T')[0]);
        onEndDateChange(end.toISOString().split('T')[0]);
    };

    return (
        <View style={styles.dateRange}>
            <View style={styles.datePresets}>
                {presets.map((preset) => (
                    <TouchableOpacity
                        key={preset.label}
                        style={[styles.presetButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => applyPreset(preset.days)}
                    >
                        <Text style={[styles.presetText, { color: theme.text }]}>{preset.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: spacing.sm,
    },
    clearButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        alignItems: 'center',
    },
    clearButtonText: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.medium,
    },
    tagsContainer: {
        marginTop: spacing.sm,
    },
    tagsContent: {
        paddingHorizontal: spacing.xs,
        gap: spacing.xs,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.full,
        borderWidth: 1,
        marginRight: spacing.xs,
    },
    tagLabel: {
        fontSize: fontSizes.xs,
        marginRight: 4,
    },
    tagValue: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.semibold,
    },
    tagRemove: {
        fontSize: fontSizes.xs,
        marginLeft: spacing.xs,
        fontWeight: fontWeights.bold,
    },
    section: {
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.semibold,
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateRange: {
        gap: spacing.sm,
    },
    datePresets: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    presetButton: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
    },
    presetText: {
        fontSize: fontSizes.xs,
    },
});
