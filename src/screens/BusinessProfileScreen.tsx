import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useToast } from '../ui/ToastProvider';
import ScreenTitle from '../components/ScreenTitle';
import {
    getCompanyProfile,
    updateCompanyProfile,
    createCompanyProfile,
    BUSINESS_TYPE_OPTIONS,
    REVENUE_RANGE_OPTIONS,
    MAIN_GOAL_OPTIONS,
    type CompanyProfile
} from '../repositories/company_profile';
import { getCurrentCompanyId } from '../lib/company';

export default function BusinessProfileScreen() {
    const { theme } = useThemeCtx();
    const toast = useToast();

    // Estados para o perfil do negócio
    const [companyProfile, setCompanyProfile] = React.useState<CompanyProfile | null>(null);
    const [savingProfile, setSavingProfile] = React.useState(false);
    const [showBusinessTypeDropdown, setShowBusinessTypeDropdown] = React.useState(false);
    const [showRevenueDropdown, setShowRevenueDropdown] = React.useState(false);
    const [showGoalDropdown, setShowGoalDropdown] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    // Carregar perfil do negócio ao iniciar
    React.useEffect(() => {
        loadCompanyProfile();
    }, []);

    const loadCompanyProfile = async () => {
        try {
            setLoading(true);
            const companyId = await getCurrentCompanyId();
            if (!companyId) {
                setLoading(false);
                return;
            }
            const profile = await getCompanyProfile(companyId);
            if (profile) {
                setCompanyProfile(profile);
            } else {
                // Criar perfil padrão se não existir
                try {
                    const newProfile = await createCompanyProfile(companyId, {
                        business_type: 'outros',
                        monthly_revenue_range: 'up_to_5k',
                        main_goal: 'organize_cash_flow',
                    });
                    setCompanyProfile(newProfile);
                } catch (createErr) {
                    console.warn('Não foi possível criar perfil padrão:', createErr);
                }
            }
        } catch (err) {
            console.warn('Erro ao carregar perfil do negócio:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateProfileField = async (field: keyof CompanyProfile, value: string) => {
        if (!companyProfile) return;

        try {
            const companyId = await getCurrentCompanyId();
            if (!companyId) return;

            const updated = await updateCompanyProfile(companyId, { [field]: value });
            setCompanyProfile(updated);
            toast.show('Perfil atualizado!', 'success');
        } catch (err) {
            console.error('Erro ao atualizar perfil:', err);
            toast.show('Erro ao atualizar perfil', 'error');
        }
    };

    const saveCompanyProfile = async () => {
        if (!companyProfile) return;

        try {
            setSavingProfile(true);
            const companyId = await getCurrentCompanyId();
            if (!companyId) return;

            await updateCompanyProfile(companyId, {
                business_type: companyProfile.business_type,
                monthly_revenue_range: companyProfile.monthly_revenue_range,
                main_goal: companyProfile.main_goal,
            });
            toast.show('Perfil salvo com sucesso!', 'success');
        } catch (err) {
            console.error('Erro ao salvar perfil:', err);
            toast.show('Erro ao salvar perfil', 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <ScreenTitle title="Perfil do Negócio" subtitle="Carregando..." />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: theme.textSecondary }}>Carregando perfil...</Text>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScreenTitle
                title="Perfil do Negócio"
                subtitle="Personalize sua experiência com base no seu tipo de negócio"
            />

            <View style={{ padding: 16, gap: 16 }}>
                {/* Descrição */}
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                        📊 Como funciona
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>
                        O perfil do negócio personaliza sua experiência no app:
                    </Text>
                    <View style={{ marginTop: 8, gap: 4 }}>
                        <Text style={{ color: theme.textSecondary, fontSize: 11 }}>• Categorias de entrada/saída personalizadas</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 11 }}>• Dicas de rotina específicas do segmento</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 11 }}>• Recomendações baseadas no seu objetivo</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 11 }}>• Benchmarks comparativos do mercado</Text>
                    </View>
                </View>

                {/* Tipo de Negócio */}
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Tipo de Negócio</Text>
                    <TouchableOpacity
                        style={[styles.input, {
                            backgroundColor: theme.input,
                            borderColor: theme.inputBorder,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }]}
                        onPress={() => setShowBusinessTypeDropdown(!showBusinessTypeDropdown)}
                    >
                        <Text style={{ color: theme.text }}>
                            {companyProfile ? BUSINESS_TYPE_OPTIONS.find(opt => opt.value === companyProfile.business_type)?.label : 'Selecione...'}
                        </Text>
                        <Text style={{ color: '#888' }}>▼</Text>
                    </TouchableOpacity>

                    {showBusinessTypeDropdown && (
                        <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.inputBorder }]}>
                            {BUSINESS_TYPE_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}
                                    onPress={() => {
                                        updateProfileField('business_type', option.value);
                                        setShowBusinessTypeDropdown(false);
                                    }}
                                >
                                    <Text style={{
                                        color: companyProfile?.business_type === option.value ? '#16A34A' : theme.text,
                                        fontWeight: companyProfile?.business_type === option.value ? '700' : '500'
                                    }}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Faturamento Médio */}
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Faturamento Médio Mensal</Text>
                    <TouchableOpacity
                        style={[styles.input, {
                            backgroundColor: theme.input,
                            borderColor: theme.inputBorder,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }]}
                        onPress={() => setShowRevenueDropdown(!showRevenueDropdown)}
                    >
                        <Text style={{ color: theme.text }}>
                            {companyProfile ? REVENUE_RANGE_OPTIONS.find(opt => opt.value === companyProfile.monthly_revenue_range)?.label : 'Selecione...'}
                        </Text>
                        <Text style={{ color: '#888' }}>▼</Text>
                    </TouchableOpacity>

                    {showRevenueDropdown && (
                        <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.inputBorder }]}>
                            {REVENUE_RANGE_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}
                                    onPress={() => {
                                        updateProfileField('monthly_revenue_range', option.value);
                                        setShowRevenueDropdown(false);
                                    }}
                                >
                                    <Text style={{
                                        color: companyProfile?.monthly_revenue_range === option.value ? '#16A34A' : theme.text,
                                        fontWeight: companyProfile?.monthly_revenue_range === option.value ? '700' : '500'
                                    }}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Objetivo Principal */}
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Objetivo Principal</Text>
                    <TouchableOpacity
                        style={[styles.input, {
                            backgroundColor: theme.input,
                            borderColor: theme.inputBorder,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }]}
                        onPress={() => setShowGoalDropdown(!showGoalDropdown)}
                    >
                        <Text style={{ color: theme.text }}>
                            {companyProfile ? MAIN_GOAL_OPTIONS.find(opt => opt.value === companyProfile.main_goal)?.label : 'Selecione...'}
                        </Text>
                        <Text style={{ color: '#888' }}>▼</Text>
                    </TouchableOpacity>

                    {showGoalDropdown && (
                        <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.inputBorder }]}>
                            {MAIN_GOAL_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}
                                    onPress={() => {
                                        updateProfileField('main_goal', option.value);
                                        setShowGoalDropdown(false);
                                    }}
                                >
                                    <Text style={{
                                        color: companyProfile?.main_goal === option.value ? '#16A34A' : theme.text,
                                        fontWeight: companyProfile?.main_goal === option.value ? '700' : '500'
                                    }}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Botão Salvar */}
                <TouchableOpacity
                    disabled={savingProfile || !companyProfile}
                    onPress={saveCompanyProfile}
                    style={[styles.saveBtn, {
                        backgroundColor: savingProfile || !companyProfile ? '#6b7280' : '#16A34A',
                    }]}
                >
                    <Text style={styles.saveBtnText}>
                        {savingProfile ? 'Salvando...' : '💾 Salvar Perfil'}
                    </Text>
                </TouchableOpacity>

                {/* Status */}
                {companyProfile && (
                    <View style={[styles.statusCard, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={{ color: '#166534', fontSize: 12, fontWeight: '600' }}>
                            ✅ Perfil configurado! As personalizações já estão ativas.
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    card: {
        padding: 16,
        borderRadius: 12,
        gap: 4,
    },
    input: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    dropdown: {
        marginTop: 8,
        borderRadius: 8,
        borderWidth: 1,
        maxHeight: 300,
        overflow: 'scroll',
    },
    saveBtn: {
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    statusCard: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
});
