import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Alert, Switch, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { useToast } from '../../ui/ToastProvider';
import { CollapsibleWrapper } from '../../components/CollapsibleCard';
import ScreenTitle from '../../components/ScreenTitle';
import {
    getOrCreateLandingSettings,
    updateLandingSettings,
    publishLandingSettings,
    formatLastUpdated,
    LandingSettings,
    Feature,
    TargetAudience,
    Screenshot,
    Plan,
    DEFAULT_LANDING_SETTINGS,
} from '../../repositories/landing_settings';

export default function LandingSettingsScreen() {
    const { theme } = useThemeCtx();
    const { show } = useToast();
    const queryClient = useQueryClient();

    // State for form data
    const [formData, setFormData] = React.useState<Partial<LandingSettings> | null>(null);
    const [hasChanges, setHasChanges] = React.useState(false);

    // Modal de confirmação customizado
    const [confirmModal, setConfirmModal] = React.useState<{
        visible: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText?: string;
        confirmColor?: string;
    }>({ visible: false, title: '', message: '', onConfirm: () => { } });

    // Query for landing settings
    const settingsQuery = useQuery({
        queryKey: ['landing-settings-admin'],
        queryFn: getOrCreateLandingSettings,
    });

    // Initialize form data when settings load
    React.useEffect(() => {
        if (settingsQuery.data && !formData) {
            setFormData(settingsQuery.data);
        }
    }, [settingsQuery.data]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!formData || !settingsQuery.data?.id) throw new Error('No data');
            return updateLandingSettings(settingsQuery.data.id, formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['landing-settings-admin'] });
            setHasChanges(false);
            show('Rascunho salvo com sucesso!', 'success');
        },
        onError: (error: any) => {
            show('Erro ao salvar: ' + error.message, 'error');
        },
    });

    // Publish mutation
    const publishMutation = useMutation({
        mutationFn: async () => {
            if (!settingsQuery.data?.id) throw new Error('No data');
            // Save first, then publish
            if (hasChanges && formData) {
                await updateLandingSettings(settingsQuery.data.id, formData);
            }
            return publishLandingSettings(settingsQuery.data.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['landing-settings-admin'] });
            queryClient.invalidateQueries({ queryKey: ['landing-settings-public'] });
            setHasChanges(false);
            show('Landing page publicada com sucesso!', 'success');
        },
        onError: (error: any) => {
            show('Erro ao publicar: ' + error.message, 'error');
        },
    });

    // Update form field
    const updateField = <K extends keyof LandingSettings>(field: K, value: LandingSettings[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    // Update feature
    const updateFeature = (index: number, updates: Partial<Feature>) => {
        const features = [...(formData?.features || [])];
        features[index] = { ...features[index], ...updates };
        updateField('features', features);
    };

    // Add feature
    const addFeature = () => {
        const features = [...(formData?.features || [])];
        features.push({ icon: '⭐', title: 'Nova Feature', description: '', benefit: '', highlight: false });
        updateField('features', features);
    };

    // Remove feature
    const removeFeature = (index: number) => {
        const features = [...(formData?.features || [])];
        features.splice(index, 1);
        updateField('features', features);
    };

    // Update target audience
    const updateAudience = (index: number, updates: Partial<TargetAudience>) => {
        const audience = [...(formData?.target_audience || [])];
        audience[index] = { ...audience[index], ...updates };
        updateField('target_audience', audience);
    };

    // Add audience
    const addAudience = () => {
        const audience = [...(formData?.target_audience || [])];
        audience.push({ icon: '🏢', label: 'Novo Segmento', benefit: '' });
        updateField('target_audience', audience);
    };

    // Remove audience
    const removeAudience = (index: number) => {
        const audience = [...(formData?.target_audience || [])];
        audience.splice(index, 1);
        updateField('target_audience', audience);
    };

    // Update screenshot
    const updateScreenshot = (index: number, updates: Partial<Screenshot>) => {
        const screenshots = [...(formData?.screenshots || [])];
        screenshots[index] = { ...screenshots[index], ...updates };
        updateField('screenshots', screenshots);
    };

    // Add screenshot
    const addScreenshot = () => {
        const screenshots = [...(formData?.screenshots || [])];
        screenshots.push({ title: 'Nova Tela', subtitle: '', image_url: '' });
        updateField('screenshots', screenshots);
    };

    // Remove screenshot
    const removeScreenshot = (index: number) => {
        const screenshots = [...(formData?.screenshots || [])];
        screenshots.splice(index, 1);
        updateField('screenshots', screenshots);
    };

    // Update plan
    const updatePlan = (index: number, updates: Partial<Plan>) => {
        const plans = [...(formData?.plans || [])];
        plans[index] = { ...plans[index], ...updates };
        updateField('plans', plans);
    };

    // Update plan feature
    const updatePlanFeature = (planIndex: number, featureIndex: number, value: string) => {
        const plans = [...(formData?.plans || [])];
        const features = [...plans[planIndex].features];
        features[featureIndex] = value;
        plans[planIndex] = { ...plans[planIndex], features };
        updateField('plans', plans);
    };

    // Add plan feature
    const addPlanFeature = (planIndex: number) => {
        const plans = [...(formData?.plans || [])];
        const features = [...plans[planIndex].features, 'Novo recurso'];
        plans[planIndex] = { ...plans[planIndex], features };
        updateField('plans', plans);
    };

    // Remove plan feature
    const removePlanFeature = (planIndex: number, featureIndex: number) => {
        const plans = [...(formData?.plans || [])];
        const features = [...plans[planIndex].features];
        features.splice(featureIndex, 1);
        plans[planIndex] = { ...plans[planIndex], features };
        updateField('plans', plans);
    };

    // Update evolution point
    const updateEvolutionPoint = (index: number, value: string) => {
        const points = [...(formData?.evolution_points || [])];
        points[index] = value;
        updateField('evolution_points', points);
    };

    // Add evolution point
    const addEvolutionPoint = () => {
        const points = [...(formData?.evolution_points || []), 'Novo ponto'];
        updateField('evolution_points', points);
    };

    // Remove evolution point
    const removeEvolutionPoint = (index: number) => {
        const points = [...(formData?.evolution_points || [])];
        points.splice(index, 1);
        updateField('evolution_points', points);
    };

    // Helper para mostrar modal de confirmação customizado
    const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText: string = 'Confirmar', confirmColor: string = '#6366f1') => {
        setConfirmModal({
            visible: true,
            title,
            message,
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, visible: false }));
                onConfirm();
            },
            confirmText,
            confirmColor,
        });
    };

    // Reset to defaults
    const resetToDefaults = () => {
        showConfirm(
            '🔄 Restaurar Padrões',
            'Isso irá restaurar todos os campos para os valores padrão. Deseja continuar?',
            () => {
                setFormData({ ...formData, ...DEFAULT_LANDING_SETTINGS });
                setHasChanges(true);
                show('Valores padrão restaurados', 'success');
            },
            'Restaurar',
            '#ef4444'
        );
    };

    const inputStyle = {
        backgroundColor: theme.card,
        color: theme.text,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        marginBottom: 8,
    };

    const labelStyle = {
        color: theme.textSecondary,
        fontSize: 12,
        fontWeight: '600' as const,
        marginBottom: 4,
    };

    if (settingsQuery.isLoading || !formData) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: theme.text }}>Carregando configurações...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            {/* Modal de Confirmação Customizado */}
            <Modal
                visible={confirmModal.visible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20,
                }}>
                    <View style={{
                        backgroundColor: theme.card,
                        borderRadius: 16,
                        padding: 24,
                        maxWidth: 400,
                        width: '100%',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                    }}>
                        <Text style={{
                            color: theme.text,
                            fontSize: 18,
                            fontWeight: '700',
                            marginBottom: 12,
                            textAlign: 'center',
                        }}>
                            {confirmModal.title}
                        </Text>
                        <Text style={{
                            color: theme.textSecondary,
                            fontSize: 14,
                            marginBottom: 24,
                            textAlign: 'center',
                            lineHeight: 20,
                        }}>
                            {confirmModal.message}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
                                style={{
                                    flex: 1,
                                    backgroundColor: theme.border,
                                    padding: 14,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>
                                    Cancelar
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={confirmModal.onConfirm}
                                style={{
                                    flex: 1,
                                    backgroundColor: confirmModal.confirmColor || '#6366f1',
                                    padding: 14,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                    {confirmModal.confirmText || 'Confirmar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
                <ScreenTitle
                    title="Configurar Landing Page"
                    subtitle="Edite o conteúdo da página inicial"
                />

                {/* Status Bar */}
                <View style={{ backgroundColor: theme.card, borderRadius: 12, padding: 16, marginBottom: 16, gap: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Status</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: settingsQuery.data?.status === 'published' ? '#16A34A' : '#f59e0b'
                                }} />
                                <Text style={{ color: theme.text, fontWeight: '700' }}>
                                    {settingsQuery.data?.status === 'published' ? 'Publicado' : 'Rascunho'}
                                </Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Última publicação</Text>
                            <Text style={{ color: theme.text, fontWeight: '600' }}>
                                {formatLastUpdated(settingsQuery.data?.published_at || null)}
                            </Text>
                        </View>
                    </View>

                    {hasChanges && (
                        <View style={{ backgroundColor: '#fef3c7', padding: 8, borderRadius: 6 }}>
                            <Text style={{ color: '#92400e', fontSize: 12, fontWeight: '600' }}>
                                ⚠️ Você tem alterações não salvas
                            </Text>
                        </View>
                    )}
                </View>

                {/* Hero Section */}
                <CollapsibleWrapper id="landing-hero" title="Hero (Topo)" icon="🎯" defaultExpanded={true}>
                    <View style={{ gap: 12 }}>
                        <View>
                            <Text style={labelStyle}>Título Principal</Text>
                            <TextInput
                                style={inputStyle}
                                value={formData.hero_title || ''}
                                onChangeText={(v) => updateField('hero_title', v)}
                                placeholder="Título do hero"
                                placeholderTextColor={theme.textSecondary}
                            />
                        </View>
                        <View>
                            <Text style={labelStyle}>Subtítulo</Text>
                            <TextInput
                                style={[inputStyle, { height: 80, textAlignVertical: 'top' }]}
                                value={formData.hero_subtitle || ''}
                                onChangeText={(v) => updateField('hero_subtitle', v)}
                                placeholder="Subtítulo do hero"
                                placeholderTextColor={theme.textSecondary}
                                multiline
                            />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={labelStyle}>Texto do Botão CTA</Text>
                                <TextInput
                                    style={inputStyle}
                                    value={formData.hero_cta_text || ''}
                                    onChangeText={(v) => updateField('hero_cta_text', v)}
                                    placeholder="Começar grátis"
                                    placeholderTextColor={theme.textSecondary}
                                />
                            </View>
                            <View style={{ width: 100 }}>
                                <Text style={labelStyle}>Dias de Trial</Text>
                                <TextInput
                                    style={inputStyle}
                                    value={String(formData.trial_days || 7)}
                                    onChangeText={(v) => updateField('trial_days', parseInt(v) || 7)}
                                    keyboardType="numeric"
                                    placeholderTextColor={theme.textSecondary}
                                />
                            </View>
                        </View>
                    </View>
                </CollapsibleWrapper>

                {/* Features Section */}
                <CollapsibleWrapper id="landing-features" title="Features (Como o Sistema Ajuda)" icon="✨" defaultExpanded={false}>
                    <View style={{ gap: 16 }}>
                        {(formData.features || []).map((feature, index) => (
                            <View key={index} style={{ backgroundColor: theme.cardSecondary, borderRadius: 8, padding: 12, gap: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: theme.text, fontWeight: '700' }}>Feature {index + 1}</Text>
                                    <TouchableOpacity onPress={() => removeFeature(index)}>
                                        <Text style={{ color: '#ef4444', fontSize: 12 }}>🗑️ Remover</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <View style={{ width: 60 }}>
                                        <Text style={labelStyle}>Emoji</Text>
                                        <TextInput
                                            style={inputStyle}
                                            value={feature.icon}
                                            onChangeText={(v) => updateFeature(index, { icon: v })}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={labelStyle}>Título</Text>
                                        <TextInput
                                            style={inputStyle}
                                            value={feature.title}
                                            onChangeText={(v) => updateFeature(index, { title: v })}
                                        />
                                    </View>
                                </View>
                                <View>
                                    <Text style={labelStyle}>Descrição</Text>
                                    <TextInput
                                        style={inputStyle}
                                        value={feature.description}
                                        onChangeText={(v) => updateFeature(index, { description: v })}
                                    />
                                </View>
                                <View>
                                    <Text style={labelStyle}>Benefício</Text>
                                    <TextInput
                                        style={inputStyle}
                                        value={feature.benefit}
                                        onChangeText={(v) => updateFeature(index, { benefit: v })}
                                    />
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Switch
                                        value={feature.highlight}
                                        onValueChange={(v) => updateFeature(index, { highlight: v })}
                                        trackColor={{ false: '#767577', true: '#16A34A' }}
                                    />
                                    <Text style={{ color: theme.text, fontSize: 12 }}>Destacar</Text>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity
                            onPress={addFeature}
                            style={{ backgroundColor: '#16A34A', padding: 12, borderRadius: 8, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700' }}>+ Adicionar Feature</Text>
                        </TouchableOpacity>
                    </View>
                </CollapsibleWrapper>

                {/* Target Audience Section */}
                <CollapsibleWrapper id="landing-audience" title="Público-Alvo (Feito Para)" icon="👥" defaultExpanded={false}>
                    <View style={{ gap: 12 }}>
                        {(formData.target_audience || []).map((item, index) => (
                            <View key={index} style={{ backgroundColor: theme.cardSecondary, borderRadius: 8, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                <TextInput
                                    style={[inputStyle, { width: 50, marginBottom: 0 }]}
                                    value={item.icon}
                                    onChangeText={(v) => updateAudience(index, { icon: v })}
                                />
                                <TextInput
                                    style={[inputStyle, { flex: 1, marginBottom: 0 }]}
                                    value={item.label}
                                    onChangeText={(v) => updateAudience(index, { label: v })}
                                    placeholder="Segmento"
                                />
                                <TextInput
                                    style={[inputStyle, { flex: 1.5, marginBottom: 0 }]}
                                    value={item.benefit}
                                    onChangeText={(v) => updateAudience(index, { benefit: v })}
                                    placeholder="Benefício"
                                />
                                <TouchableOpacity onPress={() => removeAudience(index)}>
                                    <Text style={{ color: '#ef4444' }}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity
                            onPress={addAudience}
                            style={{ backgroundColor: '#16A34A', padding: 12, borderRadius: 8, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700' }}>+ Adicionar Segmento</Text>
                        </TouchableOpacity>
                    </View>
                </CollapsibleWrapper>

                {/* Screenshots Section */}
                <CollapsibleWrapper id="landing-screenshots" title="Screenshots (Carousel)" icon="📸" defaultExpanded={false}>
                    <View style={{ gap: 12 }}>
                        {(formData.screenshots || []).map((item, index) => (
                            <View key={index} style={{ backgroundColor: theme.cardSecondary, borderRadius: 8, padding: 12, gap: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: theme.text, fontWeight: '700' }}>Screenshot {index + 1}</Text>
                                    <TouchableOpacity onPress={() => removeScreenshot(index)}>
                                        <Text style={{ color: '#ef4444', fontSize: 12 }}>🗑️ Remover</Text>
                                    </TouchableOpacity>
                                </View>
                                <TextInput
                                    style={inputStyle}
                                    value={item.title}
                                    onChangeText={(v) => updateScreenshot(index, { title: v })}
                                    placeholder="Título"
                                />
                                <TextInput
                                    style={inputStyle}
                                    value={item.subtitle}
                                    onChangeText={(v) => updateScreenshot(index, { subtitle: v })}
                                    placeholder="Subtítulo"
                                />
                                <TextInput
                                    style={inputStyle}
                                    value={item.image_url}
                                    onChangeText={(v) => updateScreenshot(index, { image_url: v })}
                                    placeholder="URL da imagem (ex: /Dashboard.jpg ou https://...)"
                                />
                            </View>
                        ))}
                        <TouchableOpacity
                            onPress={addScreenshot}
                            style={{ backgroundColor: '#16A34A', padding: 12, borderRadius: 8, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700' }}>+ Adicionar Screenshot</Text>
                        </TouchableOpacity>
                    </View>
                </CollapsibleWrapper>

                {/* Social Proof Section */}
                <CollapsibleWrapper id="landing-social" title="Números (Social Proof)" icon="📊" defaultExpanded={false}>
                    <View style={{ gap: 12 }}>
                        <View>
                            <Text style={labelStyle}>Empresas</Text>
                            <TextInput
                                style={inputStyle}
                                value={formData.social_proof?.companies || ''}
                                onChangeText={(v) => updateField('social_proof', { ...formData.social_proof!, companies: v })}
                                placeholder="+150"
                            />
                        </View>
                        <View>
                            <Text style={labelStyle}>Transações/Mês</Text>
                            <TextInput
                                style={inputStyle}
                                value={formData.social_proof?.transactions || ''}
                                onChangeText={(v) => updateField('social_proof', { ...formData.social_proof!, transactions: v })}
                                placeholder="+10.000"
                            />
                        </View>
                        <View>
                            <Text style={labelStyle}>Satisfação</Text>
                            <TextInput
                                style={inputStyle}
                                value={formData.social_proof?.satisfaction || ''}
                                onChangeText={(v) => updateField('social_proof', { ...formData.social_proof!, satisfaction: v })}
                                placeholder="98%"
                            />
                        </View>
                    </View>
                </CollapsibleWrapper>

                {/* Plans Section */}
                <CollapsibleWrapper id="landing-plans" title="Planos" icon="💰" defaultExpanded={false}>
                    <View style={{ gap: 16 }}>
                        {(formData.plans || []).map((plan, planIndex) => (
                            <View key={planIndex} style={{ backgroundColor: theme.cardSecondary, borderRadius: 8, padding: 12, gap: 8 }}>
                                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>
                                    {plan.recommended ? '⭐ ' : ''}{plan.name}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={labelStyle}>Nome</Text>
                                        <TextInput
                                            style={inputStyle}
                                            value={plan.name}
                                            onChangeText={(v) => updatePlan(planIndex, { name: v })}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={labelStyle}>Descrição</Text>
                                        <TextInput
                                            style={inputStyle}
                                            value={plan.description}
                                            onChangeText={(v) => updatePlan(planIndex, { description: v })}
                                        />
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={labelStyle}>Preço Mensal (R$)</Text>
                                        <TextInput
                                            style={inputStyle}
                                            value={String(plan.monthlyPrice)}
                                            onChangeText={(v) => updatePlan(planIndex, { monthlyPrice: parseFloat(v) || 0 })}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={labelStyle}>Preço Anual (R$)</Text>
                                        <TextInput
                                            style={inputStyle}
                                            value={String(plan.yearlyPrice)}
                                            onChangeText={(v) => updatePlan(planIndex, { yearlyPrice: parseFloat(v) || 0 })}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Switch
                                        value={plan.recommended}
                                        onValueChange={(v) => updatePlan(planIndex, { recommended: v })}
                                        trackColor={{ false: '#767577', true: '#16A34A' }}
                                    />
                                    <Text style={{ color: theme.text, fontSize: 12 }}>Plano Recomendado</Text>
                                </View>
                                <View>
                                    <Text style={labelStyle}>Badge de Economia</Text>
                                    <TextInput
                                        style={inputStyle}
                                        value={plan.savingsBadge || ''}
                                        onChangeText={(v) => updatePlan(planIndex, { savingsBadge: v || null })}
                                        placeholder="Ex: Economize 17%"
                                    />
                                </View>
                                <Text style={[labelStyle, { marginTop: 8 }]}>Recursos do Plano</Text>
                                {plan.features.map((feature, featureIndex) => (
                                    <View key={featureIndex} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                        <TextInput
                                            style={[inputStyle, { flex: 1, marginBottom: 0 }]}
                                            value={feature}
                                            onChangeText={(v) => updatePlanFeature(planIndex, featureIndex, v)}
                                        />
                                        <TouchableOpacity onPress={() => removePlanFeature(planIndex, featureIndex)}>
                                            <Text style={{ color: '#ef4444' }}>🗑️</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <TouchableOpacity
                                    onPress={() => addPlanFeature(planIndex)}
                                    style={{ backgroundColor: theme.card, padding: 8, borderRadius: 6, alignItems: 'center', marginTop: 4 }}
                                >
                                    <Text style={{ color: theme.primary, fontSize: 12 }}>+ Adicionar Recurso</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </CollapsibleWrapper>

                {/* Evolution Section */}
                <CollapsibleWrapper id="landing-evolution" title="Evolução" icon="🚀" defaultExpanded={false}>
                    <View style={{ gap: 12 }}>
                        <View>
                            <Text style={labelStyle}>Título</Text>
                            <TextInput
                                style={inputStyle}
                                value={formData.evolution_title || ''}
                                onChangeText={(v) => updateField('evolution_title', v)}
                            />
                        </View>
                        <View>
                            <Text style={labelStyle}>Subtítulo</Text>
                            <TextInput
                                style={inputStyle}
                                value={formData.evolution_subtitle || ''}
                                onChangeText={(v) => updateField('evolution_subtitle', v)}
                            />
                        </View>
                        <Text style={labelStyle}>Pontos de Evolução</Text>
                        {(formData.evolution_points || []).map((point, index) => (
                            <View key={index} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                <TextInput
                                    style={[inputStyle, { flex: 1, marginBottom: 0 }]}
                                    value={point}
                                    onChangeText={(v) => updateEvolutionPoint(index, v)}
                                />
                                <TouchableOpacity onPress={() => removeEvolutionPoint(index)}>
                                    <Text style={{ color: '#ef4444' }}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity
                            onPress={addEvolutionPoint}
                            style={{ backgroundColor: '#16A34A', padding: 12, borderRadius: 8, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700' }}>+ Adicionar Ponto</Text>
                        </TouchableOpacity>
                    </View>
                </CollapsibleWrapper>

                {/* Final CTA Section */}
                <CollapsibleWrapper id="landing-cta" title="CTA Final" icon="🎯" defaultExpanded={false}>
                    <View style={{ gap: 12 }}>
                        <View>
                            <Text style={labelStyle}>Título</Text>
                            <TextInput
                                style={inputStyle}
                                value={formData.final_cta_title || ''}
                                onChangeText={(v) => updateField('final_cta_title', v)}
                            />
                        </View>
                        <View>
                            <Text style={labelStyle}>Subtítulo</Text>
                            <TextInput
                                style={inputStyle}
                                value={formData.final_cta_subtitle || ''}
                                onChangeText={(v) => updateField('final_cta_subtitle', v)}
                            />
                        </View>
                    </View>
                </CollapsibleWrapper>

                {/* Footer Section */}
                <CollapsibleWrapper id="landing-footer" title="Rodapé" icon="📝" defaultExpanded={false}>
                    <View style={{ gap: 12 }}>
                        <View>
                            <Text style={labelStyle}>Ano do Copyright</Text>
                            <TextInput
                                style={inputStyle}
                                value={String(formData.footer_year || 2025)}
                                onChangeText={(v) => updateField('footer_year', parseInt(v) || 2025)}
                                keyboardType="numeric"
                            />
                        </View>
                        <View>
                            <Text style={labelStyle}>Texto da Empresa</Text>
                            <TextInput
                                style={inputStyle}
                                value={formData.footer_company_text || ''}
                                onChangeText={(v) => updateField('footer_company_text', v)}
                            />
                        </View>
                        <View>
                            <Text style={labelStyle}>URL da Logo do Footer</Text>
                            <TextInput
                                style={inputStyle}
                                value={formData.footer_logo_url || ''}
                                onChangeText={(v) => updateField('footer_logo_url', v)}
                                placeholder="https://exemplo.com/logo.png"
                                placeholderTextColor={theme.textSecondary}
                            />
                            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                                Logo que aparece ao lado de "Um produto da marca"
                            </Text>
                        </View>
                    </View>
                </CollapsibleWrapper>

                {/* Terms and Privacy Section */}
                <CollapsibleWrapper id="landing-legal" title="Termos e Privacidade" icon="📜" defaultExpanded={false}>
                    <View style={{ gap: 16 }}>
                        <View>
                            <Text style={labelStyle}>Termos de Uso (Markdown)</Text>
                            <TextInput
                                style={[inputStyle, { height: 200, textAlignVertical: 'top' }]}
                                value={formData.terms_of_use || ''}
                                onChangeText={(v) => updateField('terms_of_use', v)}
                                placeholder="Digite os Termos de Uso. Use Markdown para formatação (# Título, ## Subtítulo, - Lista, **negrito**)."
                                placeholderTextColor={theme.textSecondary}
                                multiline
                            />
                            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                                Use Markdown: # Título, ## Subtítulo, **negrito**, - lista
                            </Text>
                        </View>
                        <View>
                            <Text style={labelStyle}>Política de Privacidade (Markdown)</Text>
                            <TextInput
                                style={[inputStyle, { height: 200, textAlignVertical: 'top' }]}
                                value={formData.privacy_policy || ''}
                                onChangeText={(v) => updateField('privacy_policy', v)}
                                placeholder="Digite a Política de Privacidade. Use Markdown para formatação."
                                placeholderTextColor={theme.textSecondary}
                                multiline
                            />
                            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                                Dica: Use **negrito** para destacar informações importantes
                            </Text>
                        </View>
                    </View>
                </CollapsibleWrapper>

                {/* Actions */}
                <View style={{ marginTop: 24, gap: 12 }}>
                    <TouchableOpacity
                        onPress={resetToDefaults}
                        style={{ backgroundColor: theme.card, padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}
                    >
                        <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>🔄 Restaurar Valores Padrão</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Fixed Bottom Actions */}
            <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: theme.card,
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: theme.border,
                flexDirection: 'row',
                gap: 12,
            }}>
                <TouchableOpacity
                    onPress={() => {
                        console.log('[LandingSettings] Save clicked! hasChanges:', hasChanges, 'settingsId:', settingsQuery.data?.id);
                        saveMutation.mutate();
                    }}
                    disabled={!hasChanges || saveMutation.isPending}
                    style={{
                        flex: 1,
                        backgroundColor: hasChanges ? '#6366f1' : '#9ca3af',
                        padding: 14,
                        borderRadius: 8,
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>
                        {saveMutation.isPending ? 'Salvando...' : '💾 Salvar Rascunho'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                        console.log('[LandingSettings] Publish clicked! settingsId:', settingsQuery.data?.id);
                        showConfirm(
                            '🚀 Publicar Alterações',
                            'Isso irá atualizar a landing page pública. Deseja continuar?',
                            () => {
                                console.log('[LandingSettings] User confirmed publish, calling mutation...');
                                publishMutation.mutate();
                            },
                            'Publicar',
                            '#16A34A'
                        );
                    }}
                    disabled={publishMutation.isPending}
                    style={{
                        flex: 1,
                        backgroundColor: '#16A34A',
                        padding: 14,
                        borderRadius: 8,
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>
                        {publishMutation.isPending ? 'Publicando...' : '🚀 Publicar'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
