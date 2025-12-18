import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { formatCentsToBRL, parseBRLToCents } from '../utils/productPricing';
import { maskBRLInput } from '../utils/money';

interface PriceCalculatorProps {
  initialCost?: number;
  onCalculate?: (result: PricingResult) => void;
}

interface PricingResult {
  unitCost: number;
  indirectCosts: number;
  taxAmount: number;
  profitAmount: number;
  suggestedPrice: number;
  realMargin: number;
  breakEvenUnits: number;
}

export default function PriceCalculator({ initialCost = 0, onCalculate }: PriceCalculatorProps) {
  const { theme } = useThemeCtx();
  
  // Campos de entrada
  const [unitCost, setUnitCost] = useState(initialCost > 0 ? formatCentsToBRL(initialCost) : '');
  const [indirectCostPercent, setIndirectCostPercent] = useState('15'); // % de custos indiretos
  const [taxPercent, setTaxPercent] = useState('6'); // % de imposto (MEI ~6%)
  const [desiredMargin, setDesiredMargin] = useState('30'); // % de margem desejada
  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState(''); // Custos fixos mensais
  
  // Cálculos
  const result = useMemo<PricingResult>(() => {
    const cost = parseBRLToCents(unitCost);
    const indirect = parseFloat(indirectCostPercent) || 0;
    const tax = parseFloat(taxPercent) || 0;
    const margin = parseFloat(desiredMargin) || 0;
    const fixedCosts = parseBRLToCents(monthlyFixedCosts);
    
    if (cost <= 0) {
      return {
        unitCost: 0,
        indirectCosts: 0,
        taxAmount: 0,
        profitAmount: 0,
        suggestedPrice: 0,
        realMargin: 0,
        breakEvenUnits: 0,
      };
    }
    
    // Custo indireto rateado
    const indirectCosts = Math.round(cost * (indirect / 100));
    
    // Custo total antes de imposto e margem
    const totalCost = cost + indirectCosts;
    
    // Preço sugerido = custo total / (1 - margem% - imposto%)
    // Fórmula de markup: preço = custo / (1 - (margem + imposto)/100)
    const markupDivisor = 1 - ((margin + tax) / 100);
    const suggestedPrice = markupDivisor > 0 ? Math.round(totalCost / markupDivisor) : 0;
    
    // Imposto sobre o preço de venda
    const taxAmount = Math.round(suggestedPrice * (tax / 100));
    
    // Lucro real
    const profitAmount = suggestedPrice - totalCost - taxAmount;
    
    // Margem real
    const realMargin = suggestedPrice > 0 ? (profitAmount / suggestedPrice) * 100 : 0;
    
    // Ponto de equilíbrio (quantas unidades para cobrir custos fixos)
    const profitPerUnit = profitAmount;
    const breakEvenUnits = profitPerUnit > 0 && fixedCosts > 0 
      ? Math.ceil(fixedCosts / profitPerUnit) 
      : 0;
    
    return {
      unitCost: cost,
      indirectCosts,
      taxAmount,
      profitAmount,
      suggestedPrice,
      realMargin,
      breakEvenUnits,
    };
  }, [unitCost, indirectCostPercent, taxPercent, desiredMargin, monthlyFixedCosts]);

  const isLowMargin = result.realMargin > 0 && result.realMargin < 20;

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        🧮 Calculadora de Preço
      </Text>

      {/* Campos de entrada */}
      <View style={styles.inputsGrid}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Custo Unitário (R$)
          </Text>
          <TextInput
            value={unitCost}
            onChangeText={t => setUnitCost(maskBRLInput(t))}
            placeholder="0,00"
            placeholderTextColor="#999"
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Custos Indiretos (%)
          </Text>
          <TextInput
            value={indirectCostPercent}
            onChangeText={setIndirectCostPercent}
            placeholder="15"
            placeholderTextColor="#999"
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
          />
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Energia, aluguel, água...
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Imposto Estimado (%)
          </Text>
          <TextInput
            value={taxPercent}
            onChangeText={setTaxPercent}
            placeholder="6"
            placeholderTextColor="#999"
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
          />
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            MEI: ~6% | Simples: ~10-15%
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Margem Desejada (%)
          </Text>
          <TextInput
            value={desiredMargin}
            onChangeText={setDesiredMargin}
            placeholder="30"
            placeholderTextColor="#999"
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
          />
        </View>

        <View style={[styles.inputGroup, { flex: 2 }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Custos Fixos Mensais (R$) - opcional
          </Text>
          <TextInput
            value={monthlyFixedCosts}
            onChangeText={t => setMonthlyFixedCosts(maskBRLInput(t))}
            placeholder="0,00"
            placeholderTextColor="#999"
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
          />
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Para calcular ponto de equilíbrio
          </Text>
        </View>
      </View>

      {/* Resultados */}
      {result.suggestedPrice > 0 && (
        <View style={styles.resultsSection}>
          <Text style={[styles.resultsTitle, { color: theme.text }]}>
            📊 Resultado
          </Text>

          {/* Preço sugerido destacado */}
          <View style={[styles.priceBox, { backgroundColor: '#DCFCE7' }]}>
            <Text style={styles.priceLabel}>Preço de Venda Sugerido</Text>
            <Text style={styles.priceValue}>{formatCentsToBRL(result.suggestedPrice)}</Text>
          </View>

          {/* Detalhamento */}
          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>
                Custo unitário:
              </Text>
              <Text style={[styles.breakdownValue, { color: theme.text }]}>
                {formatCentsToBRL(result.unitCost)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>
                + Custos indiretos ({indirectCostPercent}%):
              </Text>
              <Text style={[styles.breakdownValue, { color: theme.text }]}>
                {formatCentsToBRL(result.indirectCosts)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>
                - Imposto ({taxPercent}%):
              </Text>
              <Text style={[styles.breakdownValue, { color: '#EF4444' }]}>
                {formatCentsToBRL(result.taxAmount)}
              </Text>
            </View>
            <View style={[styles.breakdownRow, styles.profitRow]}>
              <Text style={[styles.breakdownLabel, { color: '#166534', fontWeight: '700' }]}>
                = Lucro por unidade:
              </Text>
              <Text style={[styles.breakdownValue, { color: '#16A34A', fontWeight: '800' }]}>
                {formatCentsToBRL(result.profitAmount)}
              </Text>
            </View>
          </View>

          {/* Métricas */}
          <View style={styles.metricsRow}>
            <View style={[
              styles.metricCard, 
              { backgroundColor: isLowMargin ? '#FEE2E2' : '#DBEAFE' }
            ]}>
              <Text style={styles.metricIcon}>{isLowMargin ? '⚠️' : '📈'}</Text>
              <Text style={[
                styles.metricValue, 
                { color: isLowMargin ? '#991B1B' : '#1E40AF' }
              ]}>
                {result.realMargin.toFixed(1)}%
              </Text>
              <Text style={[
                styles.metricLabel, 
                { color: isLowMargin ? '#991B1B' : '#1E40AF' }
              ]}>
                Margem Real
              </Text>
            </View>

            {result.breakEvenUnits > 0 && (
              <View style={[styles.metricCard, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.metricIcon}>🎯</Text>
                <Text style={[styles.metricValue, { color: '#92400E' }]}>
                  {result.breakEvenUnits}
                </Text>
                <Text style={[styles.metricLabel, { color: '#92400E' }]}>
                  Ponto de Equilíbrio
                </Text>
                <Text style={[styles.metricHint, { color: '#92400E' }]}>
                  unidades/mês
                </Text>
              </View>
            )}
          </View>

          {/* Alerta de margem baixa */}
          {isLowMargin && (
            <View style={[styles.alertBox, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Margem Baixa!</Text>
                <Text style={styles.alertText}>
                  Sua margem está abaixo de 20%. Considere revisar o custo ou aumentar o preço.
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
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
  inputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    minWidth: 140,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  hint: {
    fontSize: 10,
    marginTop: 2,
  },
  resultsSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  priceBox: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: '#166534',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#16A34A',
  },
  breakdown: {
    gap: 8,
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 12,
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  profitRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricHint: {
    fontSize: 9,
  },
  alertBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
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
});
