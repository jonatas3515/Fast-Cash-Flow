import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ScrollView,
    StyleSheet,
    Platform,
    Image,
    useWindowDimensions,
    ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useToast } from '../ui/ToastProvider';
import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';
import { formatCentsBRL } from '../utils/money';
import { cartToReceiptItems, calculateCartTotal, calculateCartItemCount, type CartItem } from '../utils/posHelpers';
import ScreenTitle from '../components/ScreenTitle';
import FilterHeader, { normalizeText } from '../components/FilterHeader';

interface Product {
    id: string;
    code: string | null;
    name: string;
    price_cents: number;
    unit: string;
    stock_quantity: number;
    category: string | null;
    image_url: string | null;
    status: 'active' | 'inactive';
}

const CATEGORY_OPTIONS = [
    { key: 'all', label: 'Todos', color: '#6b7280' },
];

export default function POSScreen({ navigation }: any) {
    const { theme } = useThemeCtx();
    const toast = useToast();
    const { width } = useWindowDimensions();
    const isWide = width >= 768;

    const [companyId, setCompanyId] = React.useState<string | null>(null);
    const [searchText, setSearchText] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState('all');
    const [cart, setCart] = React.useState<CartItem[]>([]);

    // Carregar ID da empresa
    React.useEffect(() => {
        (async () => {
            const id = await getCurrentCompanyId();
            if (id) setCompanyId(id);
        })();
    }, []);

    // Query produtos
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['products-pos', companyId],
        enabled: !!companyId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('products')
                .select('id, code, name, price_cents, unit, stock_quantity, category, image_url, status')
                .eq('company_id', companyId)
                .eq('status', 'active')
                .is('deleted_at', null)
                .order('name');
            if (error) throw error;
            return data || [];
        },
    });

    // Extrair categorias únicas dos produtos
    const categories = React.useMemo(() => {
        const cats = new Set<string>();
        products.forEach(p => {
            if (p.category) cats.add(p.category);
        });
        return [
            { key: 'all', label: 'Todos', color: '#6b7280' },
            ...Array.from(cats).map(cat => ({ key: cat, label: cat, color: theme.primary })),
        ];
    }, [products, theme.primary]);

    // Filtrar produtos
    const filteredProducts = React.useMemo(() => {
        let filtered = [...products];

        if (activeCategory !== 'all') {
            filtered = filtered.filter(p => p.category === activeCategory);
        }

        if (searchText.trim()) {
            const search = normalizeText(searchText);
            filtered = filtered.filter(p =>
                normalizeText(p.name).includes(search) ||
                normalizeText(p.code || '').includes(search)
            );
        }

        return filtered;
    }, [products, activeCategory, searchText]);

    // Funções do carrinho
    const addToCart = (product: Product) => {
        setCart(prevCart => {
            const existing = prevCart.find(item => item.product.id === product.id);
            if (existing) {
                return prevCart.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevCart, { product, quantity: 1 }];
        });
        toast.show(`${product.name} adicionado!`, 'success');
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prevCart => {
            return prevCart
                .map(item => {
                    if (item.product.id === productId) {
                        const newQty = item.quantity + delta;
                        if (newQty <= 0) return null;
                        return { ...item, quantity: newQty };
                    }
                    return item;
                })
                .filter(Boolean) as CartItem[];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
    };

    const clearCart = () => {
        setCart([]);
    };

    // Navegação para checkout
    const goToCheckout = () => {
        if (cart.length === 0) {
            toast.show('Adicione itens ao carrinho primeiro!', 'error');
            return;
        }

        const receiptItems = cartToReceiptItems(cart);
        navigation.navigate('CupomFiscal', { initialItems: receiptItems });
        clearCart();
    };

    // Totais
    const cartTotal = calculateCartTotal(cart);
    const cartItemCount = calculateCartItemCount(cart);

    // Renderizar card de produto
    const renderProductCard = ({ item }: { item: Product }) => (
        <TouchableOpacity
            style={[styles.productCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => addToCart(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.productImage, { backgroundColor: theme.background }]}>
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.productImageContent} />
                ) : (
                    <Text style={styles.productImagePlaceholder}>🍔</Text>
                )}
            </View>
            <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
                {item.name}
            </Text>
            <Text style={[styles.productPrice, { color: theme.primary }]}>
                {formatCentsBRL(item.price_cents)}
            </Text>
            <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primary }]}
                onPress={() => addToCart(item)}
            >
                <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    // Renderizar item do carrinho
    const renderCartItem = (item: CartItem, index: number) => (
        <View
            key={item.product.id}
            style={[styles.cartItem, { backgroundColor: theme.background, borderBottomColor: theme.border }]}
        >
            <View style={styles.cartItemInfo}>
                <Text style={[styles.cartItemName, { color: theme.text }]} numberOfLines={1}>
                    {item.product.name}
                </Text>
                <Text style={[styles.cartItemPrice, { color: theme.textSecondary }]}>
                    {formatCentsBRL(item.product.price_cents)} × {item.quantity}
                </Text>
            </View>
            <View style={styles.cartItemActions}>
                <TouchableOpacity
                    style={[styles.qtyBtn, { backgroundColor: theme.card }]}
                    onPress={() => updateQuantity(item.product.id, -1)}
                >
                    <Text style={[styles.qtyBtnText, { color: theme.text }]}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.qtyText, { color: theme.text }]}>{item.quantity}</Text>
                <TouchableOpacity
                    style={[styles.qtyBtn, { backgroundColor: theme.card }]}
                    onPress={() => updateQuantity(item.product.id, 1)}
                >
                    <Text style={[styles.qtyBtnText, { color: theme.text }]}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeFromCart(item.product.id)}>
                    <Text style={styles.removeBtn}>🗑️</Text>
                </TouchableOpacity>
            </View>
            <Text style={[styles.cartItemTotal, { color: theme.primary }]}>
                {formatCentsBRL(item.product.price_cents * item.quantity)}
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScreenTitle title="PDV Visual" subtitle="Vendas rápidas" />

            <View style={[styles.mainContainer, isWide && styles.mainContainerWide]}>
                {/* Coluna de Produtos */}
                <View style={[styles.productsColumn, isWide && styles.productsColumnWide]}>
                    {/* Busca e Filtros */}
                    <FilterHeader
                        searchValue={searchText}
                        onSearchChange={setSearchText}
                        searchPlaceholder="Buscar produto..."
                        filterOptions={categories}
                        activeFilter={activeCategory}
                        onFilterChange={setActiveCategory}
                    />

                    {/* Grid de produtos */}
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.primary} />
                            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Carregando produtos...</Text>
                        </View>
                    ) : filteredProducts.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📦</Text>
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                {searchText || activeCategory !== 'all'
                                    ? 'Nenhum produto encontrado'
                                    : 'Nenhum produto cadastrado'}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredProducts}
                            keyExtractor={(item) => item.id}
                            renderItem={renderProductCard}
                            numColumns={isWide ? 4 : 2}
                            key={isWide ? 'wide' : 'narrow'}
                            contentContainerStyle={styles.productGrid}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>

                {/* Coluna do Carrinho */}
                <View style={[styles.cartColumn, isWide && styles.cartColumnWide, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.cartHeader}>
                        <Text style={[styles.cartTitle, { color: theme.text }]}>🛒 Carrinho</Text>
                        {cart.length > 0 && (
                            <TouchableOpacity onPress={clearCart}>
                                <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Limpar</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {cart.length === 0 ? (
                        <View style={styles.emptyCart}>
                            <Text style={styles.emptyCartIcon}>🛒</Text>
                            <Text style={[styles.emptyCartText, { color: theme.textSecondary }]}>
                                Carrinho vazio
                            </Text>
                            <Text style={[styles.emptyCartHint, { color: theme.textSecondary }]}>
                                Toque em um produto para adicionar
                            </Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.cartItems} showsVerticalScrollIndicator={false}>
                            {cart.map((item, index) => renderCartItem(item, index))}
                        </ScrollView>
                    )}

                    {/* Totais e Botão Cobrar */}
                    <View style={[styles.cartFooter, { borderTopColor: theme.border }]}>
                        <View style={styles.totalRow}>
                            <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Itens:</Text>
                            <Text style={[styles.totalValue, { color: theme.text }]}>{cartItemCount}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={[styles.grandTotalLabel, { color: theme.text }]}>Total:</Text>
                            <Text style={[styles.grandTotalValue, { color: theme.primary }]}>
                                {formatCentsBRL(cartTotal)}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.checkoutBtn, { backgroundColor: cart.length > 0 ? theme.primary : '#9ca3af' }]}
                            onPress={goToCheckout}
                            disabled={cart.length === 0}
                        >
                            <Text style={styles.checkoutBtnText}>💰 Cobrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    mainContainer: {
        flex: 1,
        flexDirection: 'column',
    },
    mainContainerWide: {
        flexDirection: 'row',
        gap: 16,
    },
    productsColumn: {
        flex: 1,
    },
    productsColumnWide: {
        flex: 2,
    },
    cartColumn: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginTop: 16,
    },
    cartColumnWide: {
        flex: 1,
        marginTop: 0,
        maxWidth: 350,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 15,
        textAlign: 'center',
    },
    productGrid: {
        paddingBottom: 100,
        gap: 12,
    },
    productCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        margin: 6,
        alignItems: 'center',
        minWidth: 140,
        maxWidth: 180,
    },
    productImage: {
        width: 80,
        height: 80,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    productImageContent: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    productImagePlaceholder: {
        fontSize: 32,
    },
    productName: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4,
        height: 36,
    },
    productPrice: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 8,
    },
    addBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addBtnText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '600',
    },
    cartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cartTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptyCart: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyCartIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    emptyCartText: {
        fontSize: 15,
        fontWeight: '600',
    },
    emptyCartHint: {
        fontSize: 12,
        marginTop: 4,
    },
    cartItems: {
        flex: 1,
        maxHeight: 400,
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        marginBottom: 4,
        borderRadius: 8,
    },
    cartItemInfo: {
        flex: 1,
    },
    cartItemName: {
        fontSize: 14,
        fontWeight: '600',
    },
    cartItemPrice: {
        fontSize: 12,
        marginTop: 2,
    },
    cartItemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: 8,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyBtnText: {
        fontSize: 18,
        fontWeight: '700',
    },
    qtyText: {
        fontSize: 14,
        fontWeight: '600',
        minWidth: 20,
        textAlign: 'center',
    },
    removeBtn: {
        fontSize: 16,
        marginLeft: 4,
    },
    cartItemTotal: {
        fontSize: 14,
        fontWeight: '700',
        minWidth: 70,
        textAlign: 'right',
    },
    cartFooter: {
        borderTopWidth: 1,
        paddingTop: 12,
        marginTop: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    totalLabel: {
        fontSize: 14,
    },
    totalValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    grandTotalLabel: {
        fontSize: 18,
        fontWeight: '700',
    },
    grandTotalValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    checkoutBtn: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 12,
    },
    checkoutBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
