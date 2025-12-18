import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Image,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useToast } from '../ui/ToastProvider';
import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';
import { formatCentsBRL, parseBRLToCents, maskBRLInput } from '../utils/money';
import ScreenTitle from '../components/ScreenTitle';
import * as ImagePicker from 'expo-image-picker';

interface ProductFormData {
  code: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  cost_cents: number;
  price_cents: number;
  stock_quantity: number;
  min_stock: number;
  unit: string;
  track_stock: boolean;
  weight_kg: string;
  height_cm: string;
  width_cm: string;
  length_cm: string;
  image_url: string;
  supplier_name: string;
  supplier_phone: string;
  status: 'active' | 'inactive';
  featured: boolean;
}

const INITIAL_FORM: ProductFormData = {
  code: '',
  barcode: '',
  name: '',
  description: '',
  category: '',
  cost_cents: 0,
  price_cents: 0,
  stock_quantity: 0,
  min_stock: 5,
  unit: 'UN',
  track_stock: true,
  weight_kg: '',
  height_cm: '',
  width_cm: '',
  length_cm: '',
  image_url: '',
  supplier_name: '',
  supplier_phone: '',
  status: 'active',
  featured: false,
};

const UNITS = ['UN', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'PCT', 'CX'];

// Form Progress Indicator
function FormProgress({
  sections,
  colors
}: {
  sections: { label: string; filled: boolean }[];
  colors: { filled: string; empty: string; text: string; textSecondary: string };
}) {
  const filledCount = sections.filter(s => s.filled).length;
  const progress = (filledCount / sections.length) * 100;

  return (
    <View style={formProgressStyles.container}>
      <View style={formProgressStyles.header}>
        <Text style={[formProgressStyles.title, { color: colors.text }]}>
          Progresso do Cadastro
        </Text>
        <Text style={[formProgressStyles.percent, { color: colors.filled }]}>
          {filledCount}/{sections.length}
        </Text>
      </View>
      <View style={[formProgressStyles.bar, { backgroundColor: colors.empty }]}>
        <View
          style={[
            formProgressStyles.fill,
            { width: `${progress}%`, backgroundColor: colors.filled }
          ]}
        />
      </View>
      <View style={formProgressStyles.sections}>
        {sections.map((section, i) => (
          <View key={i} style={formProgressStyles.sectionItem}>
            <Text style={[
              formProgressStyles.sectionDot,
              { color: section.filled ? colors.filled : colors.textSecondary }
            ]}>
              {section.filled ? '✓' : '○'}
            </Text>
            <Text style={[
              formProgressStyles.sectionLabel,
              { color: section.filled ? colors.text : colors.textSecondary }
            ]}>
              {section.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const formProgressStyles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  percent: {
    fontSize: 14,
    fontWeight: '700',
  },
  bar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  sections: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionDot: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 11,
  },
});

export default function ProductFormScreen({ navigation, route }: any) {
  const { theme } = useThemeCtx();
  const toast = useToast();
  const queryClient = useQueryClient();

  const productId = route?.params?.productId;
  const isDuplicate = route?.params?.duplicate;
  const isEditing = !!productId && !isDuplicate;

  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<ProductFormData>(INITIAL_FORM);
  const [costText, setCostText] = React.useState('');
  const [priceText, setPriceText] = React.useState('');
  const [imageLoading, setImageLoading] = React.useState(false);

  // Calculate form progress
  const formSections = React.useMemo(() => [
    { label: 'Nome', filled: !!formData.name.trim() },
    { label: 'Imagem', filled: !!formData.image_url },
    { label: 'Preços', filled: formData.cost_cents > 0 && formData.price_cents > 0 },
    { label: 'Estoque', filled: formData.stock_quantity > 0 || !formData.track_stock },
    { label: 'Fornecedor', filled: !!formData.supplier_name },
    { label: 'Status', filled: true }, // Always considered filled
  ], [formData]);

  // Função para selecionar imagem
  const pickImage = async () => {
    try {
      // Solicitar permissão
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.show('Permissão para acessar galeria negada', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        await uploadImage(uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      toast.show('Erro ao selecionar imagem', 'error');
    }
  };

  // Função para tirar foto
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        toast.show('Permissão para acessar câmera negada', 'error');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        await uploadImage(uri);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      toast.show('Erro ao tirar foto', 'error');
    }
  };

  // Função para fazer upload da imagem
  const uploadImage = async (uri: string) => {
    if (!companyId) return;

    setImageLoading(true);
    try {
      // Gerar nome único para o arquivo
      const fileName = `product_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `${companyId}/products/${fileName}`;

      // Para web, usar fetch para obter o blob
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) throw uploadError;
      } else {
        // Para mobile, usar FormData
        const formData = new FormData();
        formData.append('file', {
          uri,
          name: fileName,
          type: 'image/jpeg',
        } as any);

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, formData, {
            contentType: 'multipart/form-data',
            upsert: true,
          });

        if (uploadError) throw uploadError;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        updateField('image_url', urlData.publicUrl);
        toast.show('Imagem enviada com sucesso!', 'success');
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.show('Erro ao enviar imagem: ' + error.message, 'error');
    } finally {
      setImageLoading(false);
    }
  };

  // Remover imagem
  const removeImage = () => {
    updateField('image_url', '');
    toast.show('Imagem removida', 'success');
  };

  React.useEffect(() => {
    (async () => {
      const id = await getCurrentCompanyId();
      if (id) setCompanyId(id);
    })();
  }, []);

  // Query para carregar produto existente
  const { isLoading: loadingProduct } = useQuery({
    queryKey: ['product', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      if (error) throw error;
      if (data) {
        setFormData({
          code: isDuplicate ? '' : (data.code || ''),
          barcode: isDuplicate ? '' : (data.barcode || ''),
          name: isDuplicate ? `${data.name} (Cópia)` : (data.name || ''),
          description: data.description || '',
          category: data.category || '',
          cost_cents: data.cost_cents || 0,
          price_cents: data.price_cents || 0,
          stock_quantity: isDuplicate ? 0 : (data.stock_quantity || 0),
          min_stock: data.min_stock || 5,
          unit: data.unit || 'UN',
          track_stock: data.track_stock ?? true,
          weight_kg: data.weight_kg?.toString() || '',
          height_cm: data.height_cm?.toString() || '',
          width_cm: data.width_cm?.toString() || '',
          length_cm: data.length_cm?.toString() || '',
          image_url: data.image_url || '',
          supplier_name: data.supplier_name || '',
          supplier_phone: data.supplier_phone || '',
          status: data.status || 'active',
          featured: data.featured || false,
        });
        setCostText(formatCentsBRL(data.cost_cents || 0).replace('R$ ', ''));
        setPriceText(formatCentsBRL(data.price_cents || 0).replace('R$ ', ''));
      }
      return data;
    },
  });

  // Query para buscar categorias existentes
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('company_id', companyId)
        .not('category', 'is', null);
      if (error) throw error;
      const unique = [...new Set(data?.map(p => p.category).filter(Boolean))];
      return unique as string[];
    },
  });

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID não encontrado');
      if (!formData.name.trim()) throw new Error('Nome é obrigatório');

      const productData = {
        company_id: companyId,
        code: formData.code || null,
        barcode: formData.barcode || null,
        name: formData.name.trim(),
        description: formData.description || null,
        category: formData.category || null,
        cost_cents: formData.cost_cents,
        price_cents: formData.price_cents,
        stock_quantity: formData.stock_quantity,
        min_stock: formData.min_stock,
        unit: formData.unit,
        track_stock: formData.track_stock,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
        width_cm: formData.width_cm ? parseFloat(formData.width_cm) : null,
        length_cm: formData.length_cm ? parseFloat(formData.length_cm) : null,
        image_url: formData.image_url || null,
        supplier_name: formData.supplier_name || null,
        supplier_phone: formData.supplier_phone || null,
        status: formData.status,
        featured: formData.featured,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.show(isEditing ? 'Produto atualizado!' : 'Produto cadastrado!', 'success');
      navigation.goBack();
    },
    onError: (err: any) => {
      toast.show('Erro: ' + err.message, 'error');
    },
  });

  const updateField = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calcular margem e lucro
  const margin = formData.cost_cents > 0
    ? ((formData.price_cents - formData.cost_cents) / formData.cost_cents) * 100
    : 0;
  const profit = formData.price_cents - formData.cost_cents;

  // Atualizar preço baseado na margem desejada
  const applyMargin = (targetMargin: number) => {
    if (formData.cost_cents > 0) {
      const newPrice = Math.round(formData.cost_cents * (1 + targetMargin / 100));
      updateField('price_cents', newPrice);
      setPriceText(formatCentsBRL(newPrice).replace('R$ ', ''));
    }
  };

  if (loadingProduct) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenTitle title={isEditing ? 'Editar Produto' : isDuplicate ? 'Duplicar Produto' : 'Novo Produto'} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Form Progress Indicator */}
        <FormProgress
          sections={formSections}
          colors={{
            filled: theme.primary,
            empty: theme.border,
            text: theme.text,
            textSecondary: theme.textSecondary,
          }}
        />

        {/* Identificação */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Identificação</Text>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Código/SKU</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={formData.code}
                onChangeText={(v) => updateField('code', v.toUpperCase())}
                placeholder="Ex: PROD001"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Código de Barras</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={formData.barcode}
                onChangeText={(v) => updateField('barcode', v)}
                placeholder="EAN/GTIN"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Nome do Produto *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={formData.name}
            onChangeText={(v) => updateField('name', v)}
            placeholder="Nome do produto"
            placeholderTextColor={theme.textSecondary}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={formData.description}
            onChangeText={(v) => updateField('description', v)}
            placeholder="Descrição detalhada do produto..."
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>Categoria</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={formData.category}
            onChangeText={(v) => updateField('category', v)}
            placeholder="Ex: Bolos, Doces, Salgados..."
            placeholderTextColor={theme.textSecondary}
          />
          {categories.length > 0 && (
            <View style={styles.categoryChips}>
              {categories.slice(0, 5).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, { backgroundColor: theme.primary + '20' }]}
                  onPress={() => updateField('category', cat)}
                >
                  <Text style={[styles.categoryChipText, { color: theme.primary }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Imagem do Produto */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Imagem do Produto</Text>

          <View style={styles.imageContainer}>
            {formData.image_url ? (
              <View style={styles.imagePreviewContainer}>
                {Platform.OS === 'web' ? (
                  // @ts-ignore
                  <img
                    src={formData.image_url}
                    style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 12 }}
                    alt="Produto"
                  />
                ) : (
                  <Image
                    source={{ uri: formData.image_url }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                )}
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={removeImage}
                >
                  <Text style={styles.removeImageBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={styles.imagePlaceholderIcon}>📷</Text>
                <Text style={[styles.imagePlaceholderText, { color: theme.textSecondary }]}>
                  Nenhuma imagem
                </Text>
              </View>
            )}

            <View style={styles.imageButtons}>
              <TouchableOpacity
                style={[styles.imageBtn, { backgroundColor: theme.primary }]}
                onPress={pickImage}
                disabled={imageLoading}
              >
                {imageLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.imageBtnText}>🖼️ Galeria</Text>
                )}
              </TouchableOpacity>

              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={[styles.imageBtn, { backgroundColor: theme.primary }]}
                  onPress={takePhoto}
                  disabled={imageLoading}
                >
                  <Text style={styles.imageBtnText}>📸 Câmera</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.imageHint, { color: theme.textSecondary }]}>
              Recomendado: imagem quadrada (1:1) de até 2MB
            </Text>
          </View>
        </View>

        {/* Precificação */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Precificação</Text>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Preço de Custo *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={costText}
                onChangeText={(v) => {
                  const masked = maskBRLInput(v);
                  setCostText(masked);
                  updateField('cost_cents', parseBRLToCents(masked));
                }}
                placeholder="0,00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Preço de Venda *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={priceText}
                onChangeText={(v) => {
                  const masked = maskBRLInput(v);
                  setPriceText(masked);
                  updateField('price_cents', parseBRLToCents(masked));
                }}
                placeholder="0,00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Cálculos automáticos */}
          <View style={[styles.calculationBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: theme.textSecondary }]}>Lucro Unitário:</Text>
              <Text style={[styles.calcValue, { color: profit >= 0 ? '#10b981' : '#ef4444' }]}>
                {formatCentsBRL(profit)}
              </Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: theme.textSecondary }]}>Margem de Lucro:</Text>
              <Text style={[styles.calcValue, { color: margin >= 30 ? '#10b981' : margin >= 15 ? '#f59e0b' : '#ef4444' }]}>
                {margin.toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* Atalhos de margem */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Aplicar margem rápida:</Text>
          <View style={styles.marginButtons}>
            {[30, 50, 80, 100].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.marginBtn, { backgroundColor: theme.primary + '20' }]}
                onPress={() => applyMargin(m)}
              >
                <Text style={[styles.marginBtnText, { color: theme.primary }]}>{m}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Estoque */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Estoque</Text>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>Controlar estoque?</Text>
            <Switch
              value={formData.track_stock}
              onValueChange={(v) => updateField('track_stock', v)}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={formData.track_stock ? theme.primary : '#f4f3f4'}
            />
          </View>

          {formData.track_stock && (
            <>
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Quantidade em Estoque</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    value={formData.stock_quantity.toString()}
                    onChangeText={(v) => updateField('stock_quantity', parseInt(v) || 0)}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Estoque Mínimo</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    value={formData.min_stock.toString()}
                    onChangeText={(v) => updateField('min_stock', parseInt(v) || 0)}
                    placeholder="5"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Unidade de Medida</Text>
              <View style={styles.unitButtons}>
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.unitBtn,
                      { borderColor: formData.unit === u ? theme.primary : theme.border },
                      formData.unit === u && { backgroundColor: theme.primary + '20' }
                    ]}
                    onPress={() => updateField('unit', u)}
                  >
                    <Text style={[styles.unitBtnText, { color: formData.unit === u ? theme.primary : theme.text }]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Fornecedor */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Fornecedor (Opcional)</Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Nome do Fornecedor</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={formData.supplier_name}
            onChangeText={(v) => updateField('supplier_name', v)}
            placeholder="Nome do fornecedor"
            placeholderTextColor={theme.textSecondary}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>Telefone do Fornecedor</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={formData.supplier_phone}
            onChangeText={(v) => updateField('supplier_phone', v)}
            placeholder="(00) 00000-0000"
            placeholderTextColor={theme.textSecondary}
            keyboardType="phone-pad"
          />
        </View>

        {/* Status */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Status</Text>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>
              Produto {formData.status === 'active' ? 'Ativo' : 'Inativo'}
            </Text>
            <Switch
              value={formData.status === 'active'}
              onValueChange={(v) => updateField('status', v ? 'active' : 'inactive')}
              trackColor={{ false: '#ef4444', true: '#10b981' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>
              Produto em Destaque ⭐
            </Text>
            <Switch
              value={formData.featured}
              onValueChange={(v) => updateField('featured', v)}
              trackColor={{ false: theme.border, true: '#f59e0b' }}
              thumbColor={formData.featured ? '#f59e0b' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Botões */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? '💾 Salvar' : '✅ Cadastrar'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  calculationBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calcLabel: {
    fontSize: 13,
  },
  calcValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  marginButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  marginBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  marginBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  unitButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  unitBtn: {
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Estilos para upload de imagem
  imageContainer: {
    alignItems: 'center',
    gap: 12,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  imagePlaceholderText: {
    fontSize: 13,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  imageBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imageHint: {
    fontSize: 12,
    textAlign: 'center',
  },
});
