import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { listProducts, Product } from '../repositories/products';
import { getTransactionsByMonth } from '../repositories/transactions';
import { formatCentsToBRL } from '../utils/productPricing';
import { getCurrentCompanyId } from '../lib/company';
import { useResolvedBusinessType } from '../hooks/useSegmentCategories';
import { getCategoryGroupKey } from '../utils/segment';

interface MarginAnalysisProps {
  navigation?: any;
  minMarginPercent?: number; // Margem mínima aceitável (default 20%)
}

interface ProductAnalysis {
  product: Product;
  revenue: number;
  margin: number;
  marginPercent: number;
  salesCount: number;
}

export default function MarginAnalysis({ navigation, minMarginPercent = 20 }: MarginAnalysisProps) {
  const { theme } = useThemeCtx();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const businessType = useResolvedBusinessType();

  // Query para produtos
  const productsQuery = useQuery({
    queryKey: ['products-margin-analysis'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return [];
      return listProducts(companyId);
    },
  });

  // Query para transações do mês
  const transactionsQuery = useQuery({
    queryKey: ['transactions-margin-analysis', year, month],
    queryFn: () => getTransactionsByMonth(year, month),
  });

  // Análise de produtos
  const analysis = React.useMemo(() => {
    const products = productsQuery.data || [];
    const transactions = transactionsQuery.data || [];
    
    // Mapear vendas por produto/categoria
    const salesMap = new Map<string, { revenue: number; count: number }>();
    
    for (const tx of transactions) {
      if (tx.type !== 'income') continue;
      const key = getCategoryGroupKey(businessType, tx.category, tx.description, 'Outros');
      const current = salesMap.get(key) || { revenue: 0, count: 0 };
      current.revenue += tx.amount_cents;
      current.count += 1;
      salesMap.set(key, current);
    }

    // Calcular análise por produto
    const productAnalysis: ProductAnalysis[] = [];
    
    for (const product of products) {
      const sales = salesMap.get(product.name) || { revenue: 0, count: 0 };
      
      // Calcular margem baseada no preço de venda e custo
      const salePrice = product.final_sale_price || 0;
      const cost = product.cost_per_unit || 0;
      const margin = salePrice - cost;
      const marginPercent = salePrice > 0 ? (margin / salePrice) * 100 : 0;
      
      productAnalysis.push({
        product,
        revenue: sales.revenue,
        margin,
        marginPercent,
        salesCount: sales.count,
      });
    }

    // Ordenar por faturamento e margem
    const topRevenue = [...productAnalysis]
      .filter(p => p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const worstMargin = [...productAnalysis]
      .filter(p => p.product.final_sale_price && p.product.final_sale_price > 0)
      .sort((a, b) => a.marginPercent - b.marginPercent)
      .slice(0, 5);

    const lowMarginProducts = productAnalysis.filter(
      p => p.marginPercent > 0 && p.marginPercent < minMarginPercent
    );

    return {
      topRevenue,
      worstMargin,
      lowMarginProducts,
      totalProducts: products.length,
    };
  }, [productsQuery.data, transactionsQuery.data, minMarginPercent, businessType]);

  if (productsQuery.isLoading || transactionsQuery.isLoading) {
    return null;
  }

  if (analysis.totalProducts === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        <Text style={[styles.title, { color: theme.text }]}>
          📊 Análise de Margem
        </Text>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Cadastre produtos para ver a análise de margem
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: '#6366F1' }]}
            onPress={() => navigation?.navigate('Produtos')}
          >
            <Text style={styles.emptyBtnText}>Cadastrar Produtos</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        📊 Análise de Margem
      </Text>

      {/* Alerta de produtos com margem baixa */}
      {analysis.lowMarginProducts.length > 0 && (
        <View style={[styles.alertBox, { backgroundColor: '#FEE2E2' }]}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>
              {analysis.lowMarginProducts.length} produto(s) com margem abaixo de {minMarginPercent}%
            </Text>
            <Text style={styles.alertText}>
              Revise os custos ou preços desses produtos para melhorar sua rentabilidade
            </Text>
          </View>
        </View>
      )}

      {/* Top 5 que mais faturam */}
      {analysis.topRevenue.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🏆 Top 5 - Mais Faturam
          </Text>
          {analysis.topRevenue.map((item, index) => (
            <View key={item.product.id} style={styles.productRow}>
              <View style={styles.productRank}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: theme.text }]}>
                  {item.product.name}
                </Text>
                <Text style={[styles.productStats, { color: theme.textSecondary }]}>
                  {item.salesCount} vendas • Margem: {item.marginPercent.toFixed(0)}%
                </Text>
              </View>
              <Text style={[styles.productRevenue, { color: '#16A34A' }]}>
                {formatCentsToBRL(item.revenue)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Top 5 com pior margem */}
      {analysis.worstMargin.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            ⚠️ Top 5 - Pior Margem
          </Text>
          {analysis.worstMargin.map((item, index) => {
            const isLow = item.marginPercent < minMarginPercent;
            return (
              <TouchableOpacity
                key={item.product.id}
                style={[styles.productRow, isLow && styles.lowMarginRow]}
                onPress={() => navigation?.navigate('Produtos')}
              >
                <View style={[styles.marginBadge, { backgroundColor: isLow ? '#FEE2E2' : '#FEF3C7' }]}>
                  <Text style={[styles.marginText, { color: isLow ? '#991B1B' : '#92400E' }]}>
                    {item.marginPercent.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: theme.text }]}>
                    {item.product.name}
                  </Text>
                  <Text style={[styles.productStats, { color: theme.textSecondary }]}>
                    Custo: {formatCentsToBRL(item.product.cost_per_unit || 0)} → 
                    Venda: {formatCentsToBRL(item.product.final_sale_price || 0)}
                  </Text>
                </View>
                <Text style={[styles.productMargin, { color: isLow ? '#991B1B' : '#92400E' }]}>
                  {formatCentsToBRL(item.margin)}/un
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Botão para ver todos */}
      <TouchableOpacity
        style={[styles.viewAllBtn, { backgroundColor: '#6366F1' }]}
        onPress={() => navigation?.navigate('Produtos')}
      >
        <Text style={styles.viewAllText}>Ver Todos os Produtos →</Text>
      </TouchableOpacity>
    </View>
  );
}

// Componente compacto para o Dashboard
export function MarginAlertBadge({ navigation }: { navigation?: any }) {
  const { theme } = useThemeCtx();
  const minMargin = 20;

  const productsQuery = useQuery({
    queryKey: ['products-margin-badge'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return [];
      return listProducts(companyId);
    },
  });

  const lowMarginCount = React.useMemo(() => {
    const products = productsQuery.data || [];
    return products.filter((p: Product) => {
      if (!p.final_sale_price || p.final_sale_price <= 0) return false;
      const cost = p.cost_per_unit || 0;
      const margin = ((p.final_sale_price - cost) / p.final_sale_price) * 100;
      return margin > 0 && margin < minMargin;
    }).length;
  }, [productsQuery.data]);

  if (lowMarginCount === 0) return null;

  return (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor: '#FEE2E2' }]}
      onPress={() => navigation?.navigate('Produtos')}
    >
      <Text style={styles.badgeIcon}>⚠️</Text>
      <Text style={styles.badgeText}>
        {lowMarginCount} produto(s) com margem baixa
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  alertBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  alertIcon: {
    fontSize: 20,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  alertText: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  lowMarginRow: {
    backgroundColor: '#FEF2F2',
  },
  productRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  marginBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  marginText: {
    fontSize: 11,
    fontWeight: '700',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
  },
  productStats: {
    fontSize: 10,
    marginTop: 2,
  },
  productRevenue: {
    fontSize: 14,
    fontWeight: '800',
  },
  productMargin: {
    fontSize: 12,
    fontWeight: '700',
  },
  viewAllBtn: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  badgeIcon: {
    fontSize: 14,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
});
