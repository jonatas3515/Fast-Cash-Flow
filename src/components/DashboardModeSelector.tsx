import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { spacing, radii, fontSizes, fontWeights } from '../theme';
import {
    DashboardMode,
    DASHBOARD_MODES,
    getDashboardMode,
    saveDashboardMode,
    getModeConfig
} from '../utils/dashboardWidgets';

interface DashboardModeSelectorProps {
    currentMode: DashboardMode;
    onModeChange: (mode: DashboardMode) => void;
    compact?: boolean;
}

/**
 * Seletor de modo do Dashboard
 * Versão compacta para o header, ou versão expandida para modal
 */
export default function DashboardModeSelector({
    currentMode,
    onModeChange,
    compact = true,
}: DashboardModeSelectorProps) {
    const { theme } = useThemeCtx();
    const [showModal, setShowModal] = React.useState(false);

    const current = getModeConfig(currentMode);

    const handleModeSelect = async (mode: DashboardMode) => {
        try {
            await saveDashboardMode(mode);
            onModeChange(mode);
            setShowModal(false);
        } catch (e) {
            console.error('Erro ao salvar modo:', e);
        }
    };

    if (compact) {
        return (
            <>
                <TouchableOpacity
                    style={[styles.compactButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => setShowModal(true)}
                >
                    <Text style={styles.compactIcon}>{current.icon}</Text>
                    <Text style={[styles.compactLabel, { color: theme.text }]}>{current.label}</Text>
                    <Text style={[styles.chevron, { color: theme.textSecondary }]}>▼</Text>
                </TouchableOpacity>

                <Modal
                    visible={showModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowModal(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowModal(false)}
                    >
                        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>
                                Modo do Dashboard
                            </Text>
                            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                                Escolha a visualização ideal para você
                            </Text>

                            <View style={styles.optionsContainer}>
                                {DASHBOARD_MODES.map((mode) => {
                                    const isActive = mode.id === currentMode;
                                    return (
                                        <TouchableOpacity
                                            key={mode.id}
                                            style={[
                                                styles.optionCard,
                                                {
                                                    backgroundColor: isActive ? theme.primary + '15' : theme.background,
                                                    borderColor: isActive ? theme.primary : theme.border,
                                                }
                                            ]}
                                            onPress={() => handleModeSelect(mode.id)}
                                        >
                                            <View style={styles.optionHeader}>
                                                <Text style={styles.optionIcon}>{mode.icon}</Text>
                                                <Text style={[
                                                    styles.optionLabel,
                                                    {
                                                        color: isActive ? theme.primary : theme.text,
                                                        fontWeight: isActive ? fontWeights.bold : fontWeights.semibold,
                                                    }
                                                ]}>
                                                    {mode.label}
                                                </Text>
                                                {isActive && (
                                                    <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
                                                )}
                                            </View>
                                            <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>
                                                {mode.description}
                                            </Text>
                                            <Text style={[styles.widgetCount, { color: theme.textSecondary }]}>
                                                {mode.enabledWidgets.length} widgets
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <TouchableOpacity
                                style={[styles.closeButton, { borderColor: theme.border }]}
                                onPress={() => setShowModal(false)}
                            >
                                <Text style={[styles.closeButtonText, { color: theme.text }]}>Fechar</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </>
        );
    }

    // Versão expandida (inline)
    return (
        <View style={styles.expandedContainer}>
            <Text style={[styles.expandedTitle, { color: theme.textSecondary }]}>
                Modo de Visualização
            </Text>
            <View style={styles.expandedOptions}>
                {DASHBOARD_MODES.map((mode) => {
                    const isActive = mode.id === currentMode;
                    return (
                        <TouchableOpacity
                            key={mode.id}
                            style={[
                                styles.expandedOption,
                                {
                                    backgroundColor: isActive ? theme.primary : theme.card,
                                    borderColor: isActive ? theme.primary : theme.border,
                                }
                            ]}
                            onPress={() => handleModeSelect(mode.id)}
                        >
                            <Text style={styles.expandedOptionIcon}>{mode.icon}</Text>
                            <Text style={[
                                styles.expandedOptionLabel,
                                { color: isActive ? '#fff' : theme.text }
                            ]}>
                                {mode.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

/**
 * Hook para gerenciar o modo do dashboard
 */
export function useDashboardMode() {
    const [mode, setMode] = React.useState<DashboardMode>('intermediate');
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        getDashboardMode().then((m) => {
            setMode(m);
            setLoading(false);
        });
    }, []);

    const changeMode = async (newMode: DashboardMode) => {
        await saveDashboardMode(newMode);
        setMode(newMode);
    };

    return { mode, changeMode, loading };
}

const styles = StyleSheet.create({
    // Compact version
    compactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs + 2,
        borderRadius: radii.full,
        borderWidth: 1,
        gap: 6,
    },
    compactIcon: {
        fontSize: 14,
    },
    compactLabel: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.medium,
    },
    chevron: {
        fontSize: 8,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: radii.lg,
        padding: spacing.lg,
    },
    modalTitle: {
        fontSize: fontSizes.lg,
        fontWeight: fontWeights.bold,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    modalSubtitle: {
        fontSize: fontSizes.sm,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    optionsContainer: {
        gap: spacing.sm,
    },
    optionCard: {
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    optionIcon: {
        fontSize: 20,
    },
    optionLabel: {
        fontSize: fontSizes.base,
        flex: 1,
    },
    checkmark: {
        fontSize: 18,
        fontWeight: fontWeights.bold,
    },
    optionDescription: {
        fontSize: fontSizes.sm,
        marginBottom: spacing.xs,
    },
    widgetCount: {
        fontSize: fontSizes.xs,
    },
    closeButton: {
        marginTop: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.medium,
    },

    // Expanded version
    expandedContainer: {
        marginBottom: spacing.md,
    },
    expandedTitle: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.semibold,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    expandedOptions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    expandedOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        gap: 6,
    },
    expandedOptionIcon: {
        fontSize: 16,
    },
    expandedOptionLabel: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.medium,
    },
});
