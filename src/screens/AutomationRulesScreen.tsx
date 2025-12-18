import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useNavigation } from '@react-navigation/native';
import ScreenTitle from '../components/ScreenTitle';
import { spacing, radii, fontSizes, fontWeights } from '../theme';
import { AutomationRule, TRIGGER_LABELS, ACTION_LABELS, TriggerType, ActionType } from '../types/automation';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentCompanyId } from '../lib/company';

// Valores padrão para nova regra
const DEFAULT_NEWRULE = {
    name: '',
    trigger_type: 'payment_due' as TriggerType,
    trigger_config: { days_before: 1 } as Record<string, any>,
    action_type: 'whatsapp_message' as ActionType,
    action_config: { template_text: 'Olá {cliente}, sua conta de {valor} vence em {data}.' } as Record<string, any>,
    is_active: true
};

export default function AutomationRulesScreen() {
    const { theme } = useThemeCtx();
    const queryClient = useQueryClient();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [formData, setFormData] = useState(DEFAULT_NEWRULE);
    const [saving, setSaving] = useState(false);

    const styles = getStyles(theme);

    // Query para buscar regras
    const { data: rules, isLoading } = useQuery({
        queryKey: ['automation_rules'],
        queryFn: async () => {
            const companyId = await getCurrentCompanyId();
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('automation_rules')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error && error.code !== '42P01') throw error;
            return (data || []) as AutomationRule[];
        }
    });

    // Mutation: Criar Regra
    const createMutation = useMutation({
        mutationFn: async (newRule: typeof DEFAULT_NEWRULE) => {
            const companyId = await getCurrentCompanyId();
            if (!companyId) throw new Error('Empresa não identificada');

            const { error } = await supabase.from('automation_rules').insert({
                company_id: companyId,
                name: newRule.name,
                trigger_type: newRule.trigger_type,
                trigger_config: newRule.trigger_config,
                action_type: newRule.action_type,
                action_config: newRule.action_config,
                is_active: newRule.is_active
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
            setIsModalVisible(false);
            setFormData(DEFAULT_NEWRULE);
            Alert.alert('Sucesso', 'Regra criada com sucesso!');
        },
        onError: (err: any) => {
            Alert.alert('Erro', err.message || 'Falha ao criar regra');
        }
    });

    // Mutation: Toggle Active
    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { error } = await supabase.from('automation_rules').update({ is_active: isActive }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation_rules'] })
    });

    // Mutation: Excluir
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('automation_rules').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation_rules'] })
    });

    const handleSave = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Atenção', 'Dê um nome para a regra');
            return;
        }
        setSaving(true);
        try {
            await createMutation.mutateAsync(formData);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert('Excluir Regra', 'Tem certeza?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(id) }
        ]);
    };

    const renderTriggerConfig = () => {
        switch (formData.trigger_type) {
            case 'payment_due':
                return (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Quantos dias ANTES do vencimento?</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            value={String(formData.trigger_config.days_before || '')}
                            onChangeText={t => setFormData({
                                ...formData,
                                trigger_config: { ...formData.trigger_config, days_before: parseInt(t) || 0 }
                            })}
                        />
                    </View>
                );
            case 'payment_overdue':
                return (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Quantos dias DEPOIS do atraso?</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="number-pad"
                            value={String(formData.trigger_config.days_after || '')}
                            onChangeText={t => setFormData({
                                ...formData,
                                trigger_config: { ...formData.trigger_config, days_after: parseInt(t) || 0 }
                            })}
                        />
                    </View>
                );
            case 'daily_sales':
                return (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Horário do envio (HH:MM)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="20:00"
                            placeholderTextColor={theme.textSecondary}
                            value={formData.trigger_config.time_of_day || ''}
                            onChangeText={t => setFormData({
                                ...formData,
                                trigger_config: { ...formData.trigger_config, time_of_day: t }
                            })}
                        />
                    </View>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ScreenTitle title="Automação" subtitle="Regras de notificação" />
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setIsModalVisible(true)}
                >
                    <Text style={styles.addButtonText}>+ Nova Regra</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
                {rules && rules.length > 0 ? (
                    rules.map(rule => (
                        <View key={rule.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.ruleName}>{rule.name}</Text>
                                    <Text style={styles.ruleType}>
                                        {TRIGGER_LABELS[rule.trigger_type]} → {ACTION_LABELS[rule.action_type]}
                                    </Text>
                                </View>
                                <Switch
                                    value={rule.is_active}
                                    onValueChange={(val) => toggleMutation.mutate({ id: rule.id, isActive: val })}
                                    trackColor={{ false: theme.border, true: theme.primary }}
                                    thumbColor={'#fff'}
                                />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.configText} numberOfLines={2}>
                                    "{rule.action_config.template_text}"
                                </Text>
                            </View>
                            <View style={styles.cardFooter}>
                                <TouchableOpacity onPress={() => handleDelete(rule.id)}>
                                    <Text style={styles.deleteLink}>Excluir</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>Nenhuma regra configurada</Text>
                        <Text style={styles.emptyStateSubtext}>Crie automações para cobrar clientes e lembrar de pagamentos.</Text>
                    </View>
                )}
            </ScrollView>

            {/* MODAL DE CRIAÇÃO */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Nova Regra de Automação</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: '80%' }}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nome da Regra</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: Cobrança Prévia"
                                    placeholderTextColor={theme.textSecondary}
                                    value={formData.name}
                                    onChangeText={t => setFormData({ ...formData, name: t })}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Quando disparar?</Text>
                                <View style={styles.chipContainer}>
                                    {(['payment_due', 'payment_overdue', 'daily_sales', 'goal_reached'] as TriggerType[]).map(type => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                styles.chip,
                                                formData.trigger_type === type && styles.chipActive
                                            ]}
                                            onPress={() => setFormData({ ...formData, trigger_type: type, trigger_config: {} })}
                                        >
                                            <Text style={[
                                                styles.chipText,
                                                formData.trigger_type === type && styles.chipTextActive
                                            ]}>
                                                {TRIGGER_LABELS[type]}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {renderTriggerConfig()}

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Mensagem (WhatsApp)</Text>
                                <Text style={styles.helperText}>Variáveis: {'{cliente}, {valor}, {data}, {link}'}</Text>
                                <TextInput
                                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                                    multiline
                                    value={formData.action_config.template_text}
                                    onChangeText={t => setFormData({
                                        ...formData,
                                        action_config: { ...formData.action_config, template_text: t }
                                    })}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setIsModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Criar Regra</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
        padding: spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    addButton: {
        backgroundColor: theme.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.full,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: fontWeights.bold,
    },
    listContent: {
        paddingBottom: 100,
    },
    card: {
        backgroundColor: theme.card,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: spacing.md,
        padding: spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    ruleName: {
        color: theme.text,
        fontWeight: fontWeights.bold,
        fontSize: fontSizes.base,
    },
    ruleType: {
        color: theme.textSecondary,
        fontSize: fontSizes.xs,
        marginTop: 2,
    },
    cardContent: {
        backgroundColor: theme.background,
        padding: spacing.sm,
        borderRadius: radii.sm,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: spacing.sm,
    },
    deleteLink: {
        color: '#EF4444',
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.bold,
    },
    configText: {
        color: theme.text,
        fontSize: fontSizes.sm,
        fontStyle: 'italic',
    },
    emptyState: {
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.border,
        borderStyle: 'dashed',
        borderRadius: radii.lg,
        marginTop: spacing.xl,
    },
    emptyStateText: {
        color: theme.text,
        fontSize: fontSizes.lg,
        fontWeight: fontWeights.bold,
        marginTop: spacing.md,
    },
    emptyStateSubtext: {
        color: theme.textSecondary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: spacing.md,
    },
    modalContent: {
        backgroundColor: theme.card,
        borderRadius: radii.lg,
        padding: spacing.lg,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: fontSizes.xl,
        fontWeight: fontWeights.bold,
        color: theme.text,
    },
    closeButton: {
        fontSize: fontSizes.xl,
        color: theme.textSecondary,
        padding: spacing.xs,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        color: theme.text,
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.bold,
        marginBottom: spacing.xs,
    },
    helperText: {
        color: theme.textSecondary,
        fontSize: fontSizes.xs,
        marginBottom: spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: radii.md,
        padding: spacing.sm,
        color: theme.text,
        backgroundColor: theme.background,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.background,
    },
    chipActive: {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
    },
    chipText: {
        color: theme.text,
        fontSize: fontSizes.sm,
    },
    chipTextActive: {
        color: '#fff',
        fontWeight: fontWeights.bold,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.md,
        marginTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingTop: spacing.md,
    },
    cancelButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    cancelButtonText: {
        color: theme.textSecondary,
        fontWeight: fontWeights.bold,
    },
    saveButton: {
        backgroundColor: theme.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: fontWeights.bold,
    },
});
