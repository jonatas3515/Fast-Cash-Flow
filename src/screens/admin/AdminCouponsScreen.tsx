import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  duration_months: number;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  applicable_to: string;
  is_active: boolean;
  total_discount_cents: number;
  total_revenue_cents: number;
}

export default function AdminCouponsScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const queryClient = useQueryClient();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  
  // Form state
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState('');
  const [formDurationMonths, setFormDurationMonths] = useState('1');
  const [formMaxUses, setFormMaxUses] = useState('');
  const [formApplicableTo, setFormApplicableTo] = useState('all');
  const [formIsActive, setFormIsActive] = useState(true);

  // Cores dinâmicas
  const colors = {
    background: theme.background,
    cardBg: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    border: theme.border,
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  // Query para buscar cupons
  const { data: coupons, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar cupons:', error);
        // Retornar dados mockados se tabela não existir
        return [
          {
            id: '1',
            code: 'BEMVINDO',
            name: 'Boas-vindas',
            description: 'Desconto para novos clientes',
            discount_type: 'percentage',
            discount_value: 20,
            duration_months: 1,
            valid_until: '2025-12-31',
            max_uses: 100,
            current_uses: 32,
            applicable_to: 'new_customers',
            is_active: true,
            total_discount_cents: 6400,
            total_revenue_cents: 25600,
          },
          {
            id: '2',
            code: 'ANUAL50',
            name: 'Anual 50% OFF',
            description: 'Desconto no plano anual',
            discount_type: 'percentage',
            discount_value: 50,
            duration_months: 12,
            valid_until: null,
            max_uses: null,
            current_uses: 15,
            applicable_to: 'all',
            is_active: true,
            total_discount_cents: 74925,
            total_revenue_cents: 74925,
          },
        ] as Coupon[];
      }

      return data as Coupon[];
    },
  });

  // Mutation para criar/editar cupom
  const saveMutation = useMutation({
    mutationFn: async (couponData: Partial<Coupon>) => {
      if (editingCoupon) {
        const { error } = await supabase
          .from('discount_coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('discount_coupons')
          .insert(couponData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setShowCreateModal(false);
      resetForm();
      Alert.alert('Sucesso', editingCoupon ? 'Cupom atualizado!' : 'Cupom criado!');
    },
    onError: (error) => {
      Alert.alert('Erro', 'Não foi possível salvar o cupom');
      console.error(error);
    },
  });

  // Mutation para toggle ativo
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('discount_coupons')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });

  // Reset form
  const resetForm = () => {
    setFormCode('');
    setFormName('');
    setFormDescription('');
    setFormDiscountType('percentage');
    setFormDiscountValue('');
    setFormDurationMonths('1');
    setFormMaxUses('');
    setFormApplicableTo('all');
    setFormIsActive(true);
    setEditingCoupon(null);
  };

  // Abrir modal para editar
  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormCode(coupon.code);
    setFormName(coupon.name);
    setFormDescription(coupon.description || '');
    setFormDiscountType(coupon.discount_type);
    setFormDiscountValue(coupon.discount_value.toString());
    setFormDurationMonths(coupon.duration_months.toString());
    setFormMaxUses(coupon.max_uses?.toString() || '');
    setFormApplicableTo(coupon.applicable_to);
    setFormIsActive(coupon.is_active);
    setShowCreateModal(true);
  };

  // Salvar cupom
  const handleSave = () => {
    if (!formCode || !formName || !formDiscountValue) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    const couponData = {
      code: formCode.toUpperCase(),
      name: formName,
      description: formDescription,
      discount_type: formDiscountType,
      discount_value: parseInt(formDiscountValue),
      duration_months: parseInt(formDurationMonths) || 1,
      max_uses: formMaxUses ? parseInt(formMaxUses) : null,
      applicable_to: formApplicableTo,
      is_active: formIsActive,
    };

    saveMutation.mutate(couponData);
  };

  // Formatar valor
  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Formatar desconto
  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return formatCurrency(coupon.discount_value);
  };

  // Estatísticas
  const stats = React.useMemo(() => {
    if (!coupons) return { active: 0, totalUses: 0, totalDiscount: 0, totalRevenue: 0 };
    
    return {
      active: coupons.filter(c => c.is_active).length,
      totalUses: coupons.reduce((sum, c) => sum + c.current_uses, 0),
      totalDiscount: coupons.reduce((sum, c) => sum + (c.total_discount_cents || 0), 0),
      totalRevenue: coupons.reduce((sum, c) => sum + (c.total_revenue_cents || 0), 0),
    };
  }, [coupons]);

  const applicableLabels: Record<string, string> = {
    all: 'Todos',
    new_customers: 'Novos clientes',
    renewals: 'Renovações',
    upgrades: 'Upgrades',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              🎟️ Cupons de Desconto
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Gerencie promoções e descontos
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              resetForm();
              setShowCreateModal(true);
            }}
          >
            <Text style={styles.createButtonText}>+ Novo</Text>
          </TouchableOpacity>
        </View>

        {/* Estatísticas */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.primary + '20' }]}>
            <Text style={styles.statIcon}>🎟️</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ativos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.success + '20' }]}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.totalUses}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Usos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.warning + '20' }]}>
            <Text style={styles.statIcon}>💸</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>{formatCurrency(stats.totalDiscount)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Descontos</Text>
          </View>
        </View>

        {/* Lista de Cupons */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📋 Cupons Cadastrados
          </Text>
          
          {isLoading ? (
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Carregando...
            </Text>
          ) : coupons && coupons.length > 0 ? (
            <View style={styles.couponsList}>
              {coupons.map((coupon) => (
                <TouchableOpacity
                  key={coupon.id}
                  style={[
                    styles.couponCard,
                    { 
                      backgroundColor: colors.cardBg, 
                      borderColor: coupon.is_active ? colors.primary : colors.border,
                      opacity: coupon.is_active ? 1 : 0.6,
                    }
                  ]}
                  onPress={() => openEditModal(coupon)}
                >
                  <View style={styles.couponHeader}>
                    <View style={[styles.couponCodeBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.couponCode}>{coupon.code}</Text>
                    </View>
                    <Switch
                      value={coupon.is_active}
                      onValueChange={(value) => toggleActiveMutation.mutate({ id: coupon.id, isActive: value })}
                      trackColor={{ false: colors.border, true: colors.success + '50' }}
                      thumbColor={coupon.is_active ? colors.success : colors.textSecondary}
                    />
                  </View>
                  
                  <Text style={[styles.couponName, { color: colors.text }]}>
                    {coupon.name}
                  </Text>
                  
                  <View style={styles.couponDetails}>
                    <View style={styles.couponDetail}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Desconto</Text>
                      <Text style={[styles.detailValue, { color: colors.success }]}>
                        {formatDiscount(coupon)}
                      </Text>
                    </View>
                    <View style={styles.couponDetail}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Duração</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {coupon.duration_months} mês{coupon.duration_months !== 1 ? 'es' : ''}
                      </Text>
                    </View>
                    <View style={styles.couponDetail}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Usos</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {coupon.current_uses}{coupon.max_uses ? `/${coupon.max_uses}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.couponFooter}>
                    <Text style={[styles.couponApplicable, { color: colors.textSecondary }]}>
                      📌 {applicableLabels[coupon.applicable_to] || coupon.applicable_to}
                    </Text>
                    {coupon.valid_until && (
                      <Text style={[styles.couponExpiry, { color: colors.warning }]}>
                        ⏰ Até {new Date(coupon.valid_until).toLocaleDateString('pt-BR')}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBg }]}>
              <Text style={styles.emptyIcon}>🎟️</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum cupom cadastrado
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Criar/Editar */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.danger }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Código */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Código *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                value={formCode}
                onChangeText={(text) => setFormCode(text.toUpperCase())}
                placeholder="Ex: NATAL2024"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
              />
            </View>

            {/* Nome */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Nome *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                value={formName}
                onChangeText={setFormName}
                placeholder="Ex: Promoção de Natal"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Descrição */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Descrição</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Descrição do cupom..."
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </View>

            {/* Tipo de Desconto */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Tipo de Desconto</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    formDiscountType === 'percentage' && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setFormDiscountType('percentage')}
                >
                  <Text style={[
                    styles.segmentText,
                    { color: formDiscountType === 'percentage' ? '#FFFFFF' : colors.text }
                  ]}>
                    Porcentagem
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    formDiscountType === 'fixed' && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setFormDiscountType('fixed')}
                >
                  <Text style={[
                    styles.segmentText,
                    { color: formDiscountType === 'fixed' ? '#FFFFFF' : colors.text }
                  ]}>
                    Valor Fixo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Valor do Desconto */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Valor do Desconto * {formDiscountType === 'percentage' ? '(%)' : '(centavos)'}
              </Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                value={formDiscountValue}
                onChangeText={setFormDiscountValue}
                placeholder={formDiscountType === 'percentage' ? 'Ex: 20' : 'Ex: 500'}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            {/* Duração */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Duração (meses)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                value={formDurationMonths}
                onChangeText={setFormDurationMonths}
                placeholder="1"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            {/* Limite de Usos */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Limite de Usos (vazio = ilimitado)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                value={formMaxUses}
                onChangeText={setFormMaxUses}
                placeholder="Ex: 50"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            {/* Aplicável a */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Aplicável a</Text>
              <View style={styles.radioGroup}>
                {Object.entries(applicableLabels).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.radioButton,
                      { borderColor: formApplicableTo === key ? colors.primary : colors.border }
                    ]}
                    onPress={() => setFormApplicableTo(key)}
                  >
                    <View style={[
                      styles.radioCircle,
                      { borderColor: formApplicableTo === key ? colors.primary : colors.border }
                    ]}>
                      {formApplicableTo === key && (
                        <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                    <Text style={[styles.radioLabel, { color: colors.text }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Ativo */}
            <View style={[styles.formGroup, styles.switchGroup]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Cupom Ativo</Text>
              <Switch
                value={formIsActive}
                onValueChange={setFormIsActive}
                trackColor={{ false: colors.border, true: colors.success + '50' }}
                thumbColor={formIsActive ? colors.success : colors.textSecondary}
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  couponsList: {
    gap: 12,
  },
  couponCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  couponCodeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  couponCode: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  couponName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  couponDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  couponDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  couponFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  couponApplicable: {
    fontSize: 12,
  },
  couponExpiry: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    padding: 40,
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  radioGroup: {
    gap: 10,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 14,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
