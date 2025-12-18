import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeCtx } from '../theme/ThemeProvider';
import { getCurrentCompanyId } from '../lib/company';
import {
  Product,
  ProductIngredient,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listProductIngredients,
  createProductIngredient,
  updateProductIngredient,
  deleteProductIngredient,
  PRODUCT_CATEGORIES,
  RECIPIENT_UNITS,
} from '../repositories/products';
import {
  calculateIngredientCost,
  calculateFullProductPricing,
  calculateTotalIngredientCost,
  formatCentsToBRL,
  parseBRLToCents,
  DEFAULT_INGREDIENT_COST_PERCENT,
  DEFAULT_LABOR_COST_PERCENT,
  DEFAULT_PROFIT_MARGIN_PERCENT,
} from '../utils/productPricing';
import { todayYMD } from '../utils/date';

// =====================================================
// COMPONENTES AUXILIARES
// =====================================================

// Componente de Picker customizado
function CustomPicker({
  value,
  options,
  onChange,
  placeholder,
  theme,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder: string;
  theme: any;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          padding: 12,
          backgroundColor: theme.card,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: value ? theme.text : '#999', fontSize: 14 }}>
          {value || placeholder}
        </Text>
        <Text style={{ color: theme.textSecondary }}>▼</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 12,
              padding: 8,
              maxHeight: 300,
              width: '80%',
              maxWidth: 300,
            }}
          >
            <ScrollView>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  style={{
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    backgroundColor: value === opt ? theme.primary + '20' : 'transparent',
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 14 }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Componente de Card de Produto
function ProductCard({
  product,
  onEdit,
  onDelete,
  theme,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  theme: any;
}) {
  const categoryEmojis: { [key: string]: string } = {
    'Doce': '🍫',
    'Salgado': '🥐',
    'Bolo': '🎂',
    'Pizza': '🍕',
    'Bebida': '🥤',
    'Lanche': '🍔',
    'Refeição': '🍽️',
    'Sobremesa': '🍰',
    'Outros': '📦',
  };

  const emoji = categoryEmojis[product.category] || '📦';
  const formattedDate = product.production_date
    ? new Date(product.production_date + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      })
    : '';

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 28 }}>{emoji}</Text>

      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>
          {product.name}
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
          {product.recipient_amount} {product.recipient_unit} | {formattedDate}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 16 }}>
          {formatCentsToBRL(product.final_sale_price)}
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 10 }}>por unidade</Text>
      </View>

      <TouchableOpacity
        onPress={onEdit}
        style={{
          padding: 8,
          backgroundColor: theme.primary + '20',
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 16 }}>⚙️</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onDelete}
        style={{
          padding: 8,
          backgroundColor: '#EF444420',
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 16 }}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
}

// =====================================================
// TELA PRINCIPAL
// =====================================================

export default function ProductPricingScreen() {
  const { theme } = useThemeCtx();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const isWideWeb = Platform.OS === 'web' && width >= 1024;

  // Estados
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showHelpModal, setShowHelpModal] = React.useState(false);

  // Estados do Modal de Produto
  const [productModalVisible, setProductModalVisible] = React.useState(false);
  const [productModalStep, setProductModalStep] = React.useState<'info' | 'ingredients' | 'pricing'>('info');
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);

  // Estados do formulário de produto
  const [productName, setProductName] = React.useState('');
  const [productCategory, setProductCategory] = React.useState('');
  const [productDescription, setProductDescription] = React.useState('');
  const [productDate, setProductDate] = React.useState(todayYMD());
  const [recipientAmount, setRecipientAmount] = React.useState('1');
  const [recipientUnit, setRecipientUnit] = React.useState('unidades');

  // Estados de ingredientes
  const [ingredients, setIngredients] = React.useState<ProductIngredient[]>([]);
  const [showIngredientForm, setShowIngredientForm] = React.useState(false);
  const [editingIngredient, setEditingIngredient] = React.useState<ProductIngredient | null>(null);
  const [ingredientName, setIngredientName] = React.useState('');
  const [packageWeight, setPackageWeight] = React.useState('');
  const [packagePrice, setPackagePrice] = React.useState('');
  const [usedAmount, setUsedAmount] = React.useState('');

  // Estados de precificação
  const [ingredientCostPercent, setIngredientCostPercent] = React.useState(String(DEFAULT_INGREDIENT_COST_PERCENT));
  const [laborCostPercent, setLaborCostPercent] = React.useState(String(DEFAULT_LABOR_COST_PERCENT));
  const [profitMarginPercent, setProfitMarginPercent] = React.useState(String(DEFAULT_PROFIT_MARGIN_PERCENT));
  const [packagingCost, setPackagingCost] = React.useState('0');

  // Carregar company ID
  React.useEffect(() => {
    getCurrentCompanyId().then(setCompanyId);
  }, []);

  // Query de produtos
  const productsQuery = useQuery({
    queryKey: ['products', companyId],
    queryFn: () => (companyId ? listProducts(companyId) : Promise.resolve([])),
    enabled: !!companyId,
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Filtrar produtos
  const filteredProducts = React.useMemo(() => {
    if (!productsQuery.data) return [];
    if (!searchTerm.trim()) return productsQuery.data;

    const term = searchTerm.toLowerCase();
    return productsQuery.data.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
    );
  }, [productsQuery.data, searchTerm]);

  // Calcular precificação em tempo real
  const pricingResult = React.useMemo(() => {
    const totalIngredientCost = ingredients.reduce((sum, ing) => sum + (ing.ingredient_cost || 0), 0);

    return calculateFullProductPricing({
      totalIngredientCost,
      ingredientCostPercent: parseFloat(ingredientCostPercent) || DEFAULT_INGREDIENT_COST_PERCENT,
      laborCostPercent: parseFloat(laborCostPercent) || DEFAULT_LABOR_COST_PERCENT,
      profitMarginPercent: parseFloat(profitMarginPercent) || DEFAULT_PROFIT_MARGIN_PERCENT,
      packagingCostPerUnit: parseBRLToCents(packagingCost),
      recipientAmount: parseFloat(recipientAmount) || 1,
    });
  }, [ingredients, ingredientCostPercent, laborCostPercent, profitMarginPercent, packagingCost, recipientAmount]);

  // Funções de controle do modal
  const openNewProduct = () => {
    setEditingProduct(null);
    setProductName('');
    setProductCategory('');
    setProductDescription('');
    setProductDate(todayYMD());
    setRecipientAmount('1');
    setRecipientUnit('unidades');
    setIngredients([]);
    setIngredientCostPercent(String(DEFAULT_INGREDIENT_COST_PERCENT));
    setLaborCostPercent(String(DEFAULT_LABOR_COST_PERCENT));
    setProfitMarginPercent(String(DEFAULT_PROFIT_MARGIN_PERCENT));
    setPackagingCost('0');
    setProductModalStep('info');
    setProductModalVisible(true);
  };

  const openEditProduct = async (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductCategory(product.category);
    setProductDescription(product.description || '');
    setProductDate(product.production_date);
    setRecipientAmount(String(product.recipient_amount));
    setRecipientUnit(product.recipient_unit);
    setIngredientCostPercent(String(product.ingredient_cost_percent));
    setLaborCostPercent(String(product.labor_cost_percent));
    setProfitMarginPercent(String(product.profit_margin_percent));
    setPackagingCost(String(product.packaging_cost_per_unit / 100));

    // Carregar ingredientes
    try {
      const ings = await listProductIngredients(product.id);
      setIngredients(ings);
    } catch (e) {
      console.error('Erro ao carregar ingredientes:', e);
      setIngredients([]);
    }

    setProductModalStep('info');
    setProductModalVisible(true);
  };

  const closeProductModal = () => {
    setProductModalVisible(false);
    setEditingProduct(null);
    setIngredients([]);
  };

  const handleDeleteProduct = (product: Product) => {
    const confirmDelete = () => {
      deleteProductMutation.mutate(product.id);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Deseja excluir o produto "${product.name}"?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Excluir Produto',
        `Deseja excluir o produto "${product.name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  // Funções de ingredientes
  const openIngredientForm = (ingredient?: ProductIngredient) => {
    if (ingredient) {
      setEditingIngredient(ingredient);
      setIngredientName(ingredient.name);
      setPackageWeight(String(ingredient.package_weight));
      setPackagePrice(String(ingredient.package_price / 100));
      setUsedAmount(String(ingredient.used_amount));
    } else {
      setEditingIngredient(null);
      setIngredientName('');
      setPackageWeight('');
      setPackagePrice('');
      setUsedAmount('');
    }
    setShowIngredientForm(true);
  };

  const saveIngredient = () => {
    const weight = parseFloat(packageWeight) || 0;
    const price = parseBRLToCents(packagePrice);
    const used = parseFloat(usedAmount) || 0;

    const cost = calculateIngredientCost({
      packagePrice: price,
      usedAmount: used,
      packageWeight: weight,
    });

    const newIngredient: ProductIngredient = {
      id: editingIngredient?.id || `temp-${Date.now()}`,
      product_id: editingProduct?.id || '',
      name: ingredientName,
      package_weight: weight,
      package_price: price,
      used_amount: used,
      ingredient_cost: cost,
      created_at: editingIngredient?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editingIngredient) {
      setIngredients((prev) =>
        prev.map((ing) => (ing.id === editingIngredient.id ? newIngredient : ing))
      );
    } else {
      setIngredients((prev) => [...prev, newIngredient]);
    }

    setShowIngredientForm(false);
    setEditingIngredient(null);
  };

  const deleteIngredient = (ingredientId: string) => {
    setIngredients((prev) => prev.filter((ing) => ing.id !== ingredientId));
  };

  // Salvar produto
  const saveProduct = async () => {
    if (!companyId) return;

    const totalIngredientCost = ingredients.reduce((sum, ing) => sum + (ing.ingredient_cost || 0), 0);

    const productData = {
      company_id: companyId,
      name: productName,
      category: productCategory,
      description: productDescription || undefined,
      recipient_amount: parseFloat(recipientAmount) || 1,
      recipient_unit: recipientUnit,
      production_date: productDate,
      total_ingredient_cost: totalIngredientCost,
      ingredient_cost_percent: parseFloat(ingredientCostPercent) || DEFAULT_INGREDIENT_COST_PERCENT,
      labor_cost_percent: parseFloat(laborCostPercent) || DEFAULT_LABOR_COST_PERCENT,
      profit_margin_percent: parseFloat(profitMarginPercent) || DEFAULT_PROFIT_MARGIN_PERCENT,
      cost_per_unit: pricingResult.costPerUnit,
      packaging_cost_per_unit: parseBRLToCents(packagingCost),
      final_sale_price: pricingResult.finalSalePrice,
      ifood_basic_price: pricingResult.iFoodBasicPrice,
      ifood_partner_price: pricingResult.iFoodPartnerPrice,
    };

    try {
      let savedProduct: Product;

      if (editingProduct) {
        savedProduct = await updateProductMutation.mutateAsync({
          id: editingProduct.id,
          data: productData,
        });
      } else {
        savedProduct = await createProductMutation.mutateAsync(productData);
      }

      // Salvar ingredientes
      for (const ing of ingredients) {
        if (ing.id.startsWith('temp-')) {
          // Novo ingrediente
          await createProductIngredient({
            product_id: savedProduct.id,
            name: ing.name,
            package_weight: ing.package_weight,
            package_price: ing.package_price,
            used_amount: ing.used_amount,
            ingredient_cost: ing.ingredient_cost,
          });
        } else if (editingProduct) {
          // Atualizar ingrediente existente
          await updateProductIngredient(ing.id, {
            name: ing.name,
            package_weight: ing.package_weight,
            package_price: ing.package_price,
            used_amount: ing.used_amount,
            ingredient_cost: ing.ingredient_cost,
          });
        }
      }

      closeProductModal();
    } catch (e) {
      console.error('Erro ao salvar produto:', e);
      if (Platform.OS === 'web') {
        window.alert('Erro ao salvar produto. Tente novamente.');
      } else {
        Alert.alert('Erro', 'Erro ao salvar produto. Tente novamente.');
      }
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View
        style={{
          padding: 16,
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
              💰 PRECIFICAÇÃO DE PRODUTOS
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
              Calcule preços e margens com precisão
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowHelpModal(true)}
              style={{
                padding: 10,
                backgroundColor: theme.primary + '20',
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 16 }}>❓</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openNewProduct}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: '#16A34A',
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>+ Novo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Busca */}
        <View style={{ marginTop: 12 }}>
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="🔍 Buscar produto..."
            placeholderTextColor="#999"
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 8,
              padding: 12,
              backgroundColor: theme.background,
              color: theme.text,
              fontSize: 14,
            }}
          />
        </View>
      </View>

      {/* Lista de Produtos */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
            📚 MEUS PRODUTOS
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 8 }}>
            ({filteredProducts.length})
          </Text>
        </View>

        {productsQuery.isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ color: theme.textSecondary, marginTop: 12 }}>
              Carregando produtos...
            </Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View
            style={{
              padding: 40,
              alignItems: 'center',
              backgroundColor: theme.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
              Nenhum produto cadastrado
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 4 }}>
              Clique em "+ Novo" para começar a precificar seus produtos
            </Text>
          </View>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => openEditProduct(product)}
              onDelete={() => handleDeleteProduct(product)}
              theme={theme}
            />
          ))
        )}
      </ScrollView>

      {/* Modal de Produto */}
      <Modal visible={productModalVisible} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              width: '100%',
              maxWidth: 500,
              maxHeight: '90%',
            }}
          >
            {/* Header do Modal */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
                {editingProduct ? '✏️ EDITAR PRODUTO' : '➕ NOVO PRODUTO'}
              </Text>
              <TouchableOpacity onPress={closeProductModal}>
                <Text style={{ color: theme.textSecondary, fontSize: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Steps Indicator */}
            <View
              style={{
                flexDirection: 'row',
                padding: 12,
                gap: 8,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              {(['info', 'ingredients', 'pricing'] as const).map((step, index) => (
                <TouchableOpacity
                  key={step}
                  onPress={() => setProductModalStep(step)}
                  style={{
                    flex: 1,
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: productModalStep === step ? theme.primary : theme.background,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: productModalStep === step ? '#fff' : theme.textSecondary,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {index + 1}. {step === 'info' ? 'Dados' : step === 'ingredients' ? 'Ingredientes' : 'Preços'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ padding: 16, maxHeight: 400 }}>
              {/* Step 1: Informações do Produto */}
              {productModalStep === 'info' && (
                <View style={{ gap: 16 }}>
                  <View>
                    <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
                      Nome do Produto *
                    </Text>
                    <TextInput
                      value={productName}
                      onChangeText={setProductName}
                      placeholder="ex: Brigadeiro, Bolo, Pizza"
                      placeholderTextColor="#999"
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 8,
                        padding: 12,
                        backgroundColor: theme.background,
                        color: theme.text,
                        fontSize: 14,
                      }}
                    />
                  </View>

                  <View>
                    <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
                      Categoria *
                    </Text>
                    <CustomPicker
                      value={productCategory}
                      options={PRODUCT_CATEGORIES}
                      onChange={setProductCategory}
                      placeholder="Selecione uma categoria"
                      theme={theme}
                    />
                  </View>

                  <View>
                    <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
                      Data da Precificação
                    </Text>
                    <TextInput
                      value={productDate}
                      onChangeText={setProductDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#999"
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 8,
                        padding: 12,
                        backgroundColor: theme.background,
                        color: theme.text,
                        fontSize: 14,
                      }}
                    />
                  </View>

                </View>
              )}

              {/* Step 2: Ingredientes */}
              {productModalStep === 'ingredients' && (
                <View style={{ gap: 16 }}>
                  <TouchableOpacity
                    onPress={() => openIngredientForm()}
                    style={{
                      padding: 12,
                      backgroundColor: '#16A34A20',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#16A34A',
                      borderStyle: 'dashed',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#16A34A', fontWeight: '600' }}>
                      ➕ Adicionar Ingrediente
                    </Text>
                  </TouchableOpacity>

                  {ingredients.length === 0 ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
                        Nenhum ingrediente adicionado.{'\n'}Clique acima para adicionar.
                      </Text>
                    </View>
                  ) : (
                    ingredients.map((ing) => (
                      <View
                        key={ing.id}
                        style={{
                          backgroundColor: theme.background,
                          borderRadius: 8,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: theme.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>
                            🥫 {ing.name}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity onPress={() => openIngredientForm(ing)}>
                              <Text style={{ fontSize: 16 }}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteIngredient(ing.id)}>
                              <Text style={{ fontSize: 16 }}>🗑️</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={{ marginTop: 8, gap: 4 }}>
                          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                            Embalagem: {ing.package_weight}g | Preço: {formatCentsToBRL(ing.package_price)}
                          </Text>
                          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                            Usado: {ing.used_amount}g | <Text style={{ color: '#16A34A', fontWeight: '600' }}>Custo: {formatCentsToBRL(ing.ingredient_cost)}</Text>
                          </Text>
                        </View>
                      </View>
                    ))
                  )}

                  {/* Resumo */}
                  {ingredients.length > 0 && (
                    <View
                      style={{
                        backgroundColor: theme.background,
                        borderRadius: 8,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: theme.primary,
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ color: theme.text, fontWeight: '700', marginBottom: 8 }}>
                        📊 RESUMO
                      </Text>
                      <View style={{ gap: 4 }}>
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          ├─ Custo Total de Insumos: <Text style={{ color: theme.text, fontWeight: '600' }}>{formatCentsToBRL(pricingResult.totalIngredientCost)}</Text>
                        </Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          ├─ Variáveis ({ingredientCostPercent}%): <Text style={{ color: theme.text, fontWeight: '600' }}>{formatCentsToBRL(pricingResult.variablesCost)}</Text>
                        </Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          ├─ Mão de Obra ({laborCostPercent}%): <Text style={{ color: theme.text, fontWeight: '600' }}>{formatCentsToBRL(pricingResult.laborCost)}</Text>
                        </Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          ├─ Lucro ({profitMarginPercent}%): <Text style={{ color: theme.text, fontWeight: '600' }}>{formatCentsToBRL(pricingResult.profitAmount)}</Text>
                        </Text>
                        <Text style={{ color: '#16A34A', fontSize: 14, fontWeight: '700', marginTop: 4 }}>
                          └─ Preço Final: {formatCentsToBRL(pricingResult.finalSalePrice)} por unidade
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Step 3: Margens e Preços */}
              {productModalStep === 'pricing' && (
                <View style={{ gap: 16 }}>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>
                    ⚙️ AJUSTE DE MARGENS
                  </Text>

                  <View>
                    <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
                      Variáveis Incalculáveis (%)
                    </Text>
                    <TextInput
                      value={ingredientCostPercent}
                      onChangeText={setIngredientCostPercent}
                      placeholder="25"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 8,
                        padding: 12,
                        backgroundColor: theme.background,
                        color: theme.text,
                        fontSize: 14,
                      }}
                    />
                    <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                      💡 Custos que variam (energia, gás, água, desgaste)
                    </Text>
                  </View>

                  <View>
                    <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
                      Mão de Obra (%)
                    </Text>
                    <TextInput
                      value={laborCostPercent}
                      onChangeText={setLaborCostPercent}
                      placeholder="30"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 8,
                        padding: 12,
                        backgroundColor: theme.background,
                        color: theme.text,
                        fontSize: 14,
                      }}
                    />
                    <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                      💡 Seu tempo de produção
                    </Text>
                  </View>

                  <View>
                    <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
                      Lucro (%)
                    </Text>
                    <TextInput
                      value={profitMarginPercent}
                      onChangeText={setProfitMarginPercent}
                      placeholder="100"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 8,
                        padding: 12,
                        backgroundColor: theme.background,
                        color: theme.text,
                        fontSize: 14,
                      }}
                    />
                    <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                      💡 Seu ganho por unidade
                    </Text>
                  </View>

                  <View>
                    <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
                      Custo de Embalagem (R$)
                    </Text>
                    <TextInput
                      value={packagingCost}
                      onChangeText={setPackagingCost}
                      placeholder="0,00"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 8,
                        padding: 12,
                        backgroundColor: theme.background,
                        color: theme.text,
                        fontSize: 14,
                      }}
                    />
                    <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                      💡 Custo da embalagem por unidade
                    </Text>
                  </View>

                  {/* Rendimento da Receita */}
                  <View
                    style={{
                      backgroundColor: '#3B82F620',
                      borderRadius: 12,
                      padding: 16,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: '700', marginBottom: 12 }}>
                      🍰 RENDIMENTO DA RECEITA
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12 }}>
                      Quantas unidades essa receita rende? Ex: 25 brigadeiros, 8 fatias de bolo, 12 salgados
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
                          Quantidade *
                        </Text>
                        <TextInput
                          value={recipientAmount}
                          onChangeText={setRecipientAmount}
                          placeholder="25"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                          style={{
                            borderWidth: 1,
                            borderColor: theme.border,
                            borderRadius: 8,
                            padding: 12,
                            backgroundColor: theme.background,
                            color: theme.text,
                            fontSize: 14,
                          }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
                          Unidade
                        </Text>
                        <CustomPicker
                          value={recipientUnit}
                          options={RECIPIENT_UNITS}
                          onChange={setRecipientUnit}
                          placeholder="unidades"
                          theme={theme}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Preços Calculados */}
                  <View
                    style={{
                      backgroundColor: '#16A34A20',
                      borderRadius: 12,
                      padding: 16,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: '700', marginBottom: 12 }}>
                      💰 PREÇOS CALCULADOS
                    </Text>
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: theme.textSecondary }}>💵 Custo Unitário:</Text>
                        <Text style={{ color: theme.text, fontWeight: '600' }}>
                          {formatCentsToBRL(pricingResult.costPerUnit)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: theme.textSecondary }}>📦 Embalagem:</Text>
                        <Text style={{ color: theme.text, fontWeight: '600' }}>
                          {formatCentsToBRL(pricingResult.packagingCostPerUnit)}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: theme.border,
                        }}
                      >
                        <Text style={{ color: '#16A34A', fontWeight: '700' }}>🛒 Preço Final (Venda Direta):</Text>
                        <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 16 }}>
                          {formatCentsToBRL(pricingResult.finalSalePrice)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Preços para Plataformas */}
                  <View
                    style={{
                      backgroundColor: '#F9731620',
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: '700', marginBottom: 12 }}>
                      🍔 PREÇOS PARA PLATAFORMAS
                    </Text>
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: theme.textSecondary }}>iFood Básico (17%):</Text>
                        <Text style={{ color: '#F97316', fontWeight: '600' }}>
                          {formatCentsToBRL(pricingResult.iFoodBasicPrice)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: theme.textSecondary }}>iFood Parceiro (28%):</Text>
                        <Text style={{ color: '#F97316', fontWeight: '600' }}>
                          {formatCentsToBRL(pricingResult.iFoodPartnerPrice)}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 8 }}>
                      💡 Preços ajustados para cobrir a comissão da plataforma
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Footer do Modal */}
            <View
              style={{
                flexDirection: 'row',
                padding: 16,
                gap: 12,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
            >
              <TouchableOpacity
                onPress={closeProductModal}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>

              {productModalStep === 'pricing' ? (
                <TouchableOpacity
                  onPress={saveProduct}
                  disabled={!productName || !productCategory}
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 8,
                    backgroundColor: productName && productCategory ? '#16A34A' : '#ccc',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    {createProductMutation.isPending || updateProductMutation.isPending
                      ? 'Salvando...'
                      : 'Salvar'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() =>
                    setProductModalStep(productModalStep === 'info' ? 'ingredients' : 'pricing')
                  }
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 8,
                    backgroundColor: theme.primary,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Próximo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Ingrediente */}
      <Modal visible={showIngredientForm} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 20,
              width: '100%',
              maxWidth: 400,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
              {editingIngredient ? '✏️ Editar Ingrediente' : '➕ Novo Ingrediente'}
            </Text>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
                  Nome do Ingrediente *
                </Text>
                <TextInput
                  value={ingredientName}
                  onChangeText={setIngredientName}
                  placeholder="ex: Chocolate em barra"
                  placeholderTextColor="#999"
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: 14,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
                    Peso/Volume Embalagem (g/ml)
                  </Text>
                  <TextInput
                    value={packageWeight}
                    onChangeText={setPackageWeight}
                    placeholder="1000"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 8,
                      padding: 12,
                      backgroundColor: theme.background,
                      color: theme.text,
                      fontSize: 14,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
                    Preço do Pacote (R$)
                  </Text>
                  <TextInput
                    value={packagePrice}
                    onChangeText={setPackagePrice}
                    placeholder="42,90"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 8,
                      padding: 12,
                      backgroundColor: theme.background,
                      color: theme.text,
                      fontSize: 14,
                    }}
                  />
                </View>
              </View>

              <View>
                <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
                  Quantidade Usada (g/ml)
                </Text>
                <TextInput
                  value={usedAmount}
                  onChangeText={setUsedAmount}
                  placeholder="50"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: 14,
                  }}
                />
              </View>

              {/* Preview do custo */}
              {packageWeight && packagePrice && usedAmount && (
                <View
                  style={{
                    backgroundColor: '#16A34A20',
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Custo calculado:</Text>
                  <Text style={{ color: '#16A34A', fontSize: 18, fontWeight: '700' }}>
                    {formatCentsToBRL(
                      calculateIngredientCost({
                        packagePrice: parseBRLToCents(packagePrice),
                        usedAmount: parseFloat(usedAmount) || 0,
                        packageWeight: parseFloat(packageWeight) || 1,
                      })
                    )}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowIngredientForm(false);
                  setEditingIngredient(null);
                }}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveIngredient}
                disabled={!ingredientName || !packageWeight || !packagePrice || !usedAmount}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor:
                    ingredientName && packageWeight && packagePrice && usedAmount
                      ? '#16A34A'
                      : '#ccc',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Ajuda */}
      <Modal visible={showHelpModal} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              width: '100%',
              maxWidth: 600,
              maxHeight: '90%',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
                📖 Como Usar a Precificação
              </Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Text style={{ color: theme.textSecondary, fontSize: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                    🎯 O que é?
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}>
                    A Precificação de Produtos ajuda você a calcular exatamente quanto custa fazer seu produto e quanto você deve cobrar para ter lucro.
                  </Text>
                </View>

                <View>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                    📝 Passo 1: Criar Produto
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}>
                    • Digite o nome (ex: "Brigadeiro"){'\n'}
                    • Escolha a categoria{'\n'}
                    • Informe quantas unidades sua receita rende
                  </Text>
                </View>

                <View>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                    🥫 Passo 2: Adicionar Ingredientes
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}>
                    Para cada ingrediente, informe:{'\n'}
                    • Nome do ingrediente{'\n'}
                    • Peso/volume da embalagem{'\n'}
                    • Preço pago no pacote{'\n'}
                    • Quantidade usada na receita{'\n\n'}
                    O app calcula automaticamente o custo proporcional!
                  </Text>
                </View>

                <View>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                    💰 Passo 3: Ajustar Margens
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}>
                    • <Text style={{ fontWeight: '600' }}>Variáveis (25%)</Text>: energia, gás, água{'\n'}
                    • <Text style={{ fontWeight: '600' }}>Mão de Obra (30%)</Text>: seu tempo{'\n'}
                    • <Text style={{ fontWeight: '600' }}>Lucro (100%)</Text>: seu ganho{'\n\n'}
                    Ajuste conforme sua realidade!
                  </Text>
                </View>

                <View>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                    🍔 Preços para Plataformas
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}>
                    O app calcula automaticamente os preços para iFood:{'\n'}
                    • <Text style={{ fontWeight: '600' }}>Básico (17%)</Text>: menor comissão{'\n'}
                    • <Text style={{ fontWeight: '600' }}>Parceiro (28%)</Text>: maior visibilidade
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: '#F59E0B20',
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#F59E0B', fontWeight: '700', marginBottom: 4 }}>
                    ⚠️ Dica Importante
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                    Atualize a precificação mensalmente quando os preços dos ingredientes mudarem!
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
              <TouchableOpacity
                onPress={() => setShowHelpModal(false)}
                style={{
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Entendi!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
