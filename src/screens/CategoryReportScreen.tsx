/**
 * Category Report Screen
 * Shows income and expense breakdown by category with percentages and pie chart.
 * 
 * Reuses existing aggregation logic from Dashboard/categoryAggregator.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import { getTransactionsByMonth, getTransactionsByRange } from '../repositories/transactions';
import { aggregateByCategory, addCategoryPercentages, getTopCategories } from '../utils/categoryAggregator';
import { formatCentsBRL } from '../utils/money';
import { addMonth, getCurrentYearMonth } from '../utils/date';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ScreenTitle from '../components/ScreenTitle';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';

function toDDMMYYYY(s: string) { return `${s.substring(8, 10)}/${s.substring(5, 7)}/${s.substring(0, 4)}`; }
function ymd(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s); }
function normalizeYMD(v: string) {
    if (ymd(v)) return v;
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return v;
}
function todayYMD() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type ViewMode = 'month' | 'range';
type DataType = 'expense' | 'income';

// Pie chart colors
const PIE_COLORS = [
    '#16A34A', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export default function CategoryReportScreen() {
    const { theme, mode: themeMode } = useThemeCtx();
    const { formatMoney, lang } = useI18n();
    const start = getCurrentYearMonth();
    const [ym, setYm] = React.useState(start);
    const [viewMode, setViewMode] = React.useState<ViewMode>('month');
    const [dataType, setDataType] = React.useState<DataType>('expense');
    const [startDate, setStartDate] = React.useState(todayYMD());
    const [endDate, setEndDate] = React.useState(todayYMD());

    const validRange = ymd(startDate) && ymd(endDate) && startDate <= endDate;

    // Query for monthly data
    const monthlyQ = useQuery({
        queryKey: ['category-month', ym.year, ym.month],
        queryFn: () => getTransactionsByMonth(ym.year, ym.month),
        enabled: viewMode === 'month',
    });

    // Query for range data
    const rangeQ = useQuery({
        queryKey: ['category-range', startDate, endDate],
        queryFn: () => validRange ? getTransactionsByRange(startDate, endDate) : Promise.resolve([]),
        enabled: viewMode === 'range' && validRange,
    });

    const txs = viewMode === 'month' ? (monthlyQ.data || []) : (rangeQ.data || []);
    const breakdown = React.useMemo(() => aggregateByCategory(txs), [txs]);

    const categories = dataType === 'income' ? breakdown.income : breakdown.expense;
    const total = dataType === 'income' ? breakdown.incomeTotal : breakdown.expenseTotal;
    const categoriesWithPercent = addCategoryPercentages(categories, total);
    const topCategories = getTopCategories(categories, 8);

    const monthName = (new Date(ym.year, ym.month - 1, 1)).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { month: 'long' });
    const periodLabel = viewMode === 'month'
        ? `${monthName} ${ym.year}`
        : `${toDDMMYYYY(startDate)} a ${toDDMMYYYY(endDate)}`;

    // Simple Pie Chart component
    const PieChart = ({ data, size = 200 }: { data: typeof topCategories, size?: number }) => {
        const total = data.reduce((sum, c) => sum + c.amount_cents, 0);
        if (total === 0) return null;

        let currentAngle = 0;
        const center = size / 2;
        const radius = size * 0.4;

        const paths = data.map((category, idx) => {
            const percentage = category.amount_cents / total;
            const angle = percentage * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            // Calculate path
            const startRad = (startAngle - 90) * Math.PI / 180;
            const endRad = (endAngle - 90) * Math.PI / 180;
            const x1 = center + radius * Math.cos(startRad);
            const y1 = center + radius * Math.sin(startRad);
            const x2 = center + radius * Math.cos(endRad);
            const y2 = center + radius * Math.sin(endRad);
            const largeArc = angle > 180 ? 1 : 0;

            const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

            return (
                <Path
                    key={idx}
                    d={d}
                    fill={PIE_COLORS[idx % PIE_COLORS.length]}
                />
            );
        });

        return (
            <Svg width={size} height={size}>
                <G>{paths}</G>
            </Svg>
        );
    };

    // Generate HTML for PDF export
    const generateHTML = () => {
        const typeLabel = dataType === 'income' ? 'Receitas' : 'Despesas';
        const rowsHtml = categoriesWithPercent.map((c, idx) => `
      <tr>
        <td><span class="dot" style="background:${PIE_COLORS[idx % PIE_COLORS.length]}"></span> ${c.category}</td>
        <td class="value">${formatMoney(c.amount_cents)}</td>
        <td class="percent">${c.percent}%</td>
        <td class="count">${c.count} lançamentos</td>
      </tr>
    `).join('');

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1f2937; }
    h1 { font-size: 20px; text-align: center; color: #16A34A; margin-bottom: 4px; }
    h2 { font-size: 14px; text-align: center; color: #6b7280; margin: 0 0 20px 0; }
    .summary { text-align: center; margin-bottom: 20px; }
    .summary .total { font-size: 24px; font-weight: 700; color: ${dataType === 'income' ? '#16A34A' : '#DC2626'}; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #1f2937; color: #fff; padding: 12px; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    .dot { display: inline-block; width: 12px; height: 12px; border-radius: 6px; margin-right: 8px; }
    .value { font-weight: 600; text-align: right; }
    .percent { text-align: center; color: #6b7280; }
    .count { text-align: right; color: #9ca3af; font-size: 12px; }
    .footer { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 30px; }
  </style>
</head>
<body>
  <h1>📊 Relatório por Categoria - ${typeLabel}</h1>
  <h2>${periodLabel}</h2>
  <div class="summary">
    <div class="total">${formatMoney(total)}</div>
    <div>Total de ${typeLabel}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Categoria</th>
        <th style="text-align:right">Valor</th>
        <th style="text-align:center">%</th>
        <th style="text-align:right">Qtd</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <div class="footer">
    ✅ Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} via Fast Cash Flow
  </div>
</body>
</html>`;
    };

    const exportPDF = async () => {
        if (categories.length === 0) {
            Alert.alert('Erro', 'Nenhum dado para exportar');
            return;
        }

        try {
            const html = generateHTML();

            if (Platform.OS === 'web') {
                const w = window.open('', '_blank');
                if (w) {
                    w.document.open();
                    w.document.write(html);
                    w.document.close();
                    w.focus();
                    setTimeout(() => { w.print(); w.close(); }, 300);
                }
                return;
            }

            const { uri } = await Print.printToFileAsync({ html });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
            } else {
                Alert.alert('PDF gerado', uri);
            }
        } catch (error: any) {
            Alert.alert('Erro', 'Não foi possível gerar o PDF');
        }
    };

    const exportCSV = () => {
        if (categories.length === 0) {
            Alert.alert('Erro', 'Nenhum dado para exportar');
            return;
        }

        const rows = [
            ['Categoria', 'Valor (centavos)', 'Percentual', 'Quantidade'],
            ...categoriesWithPercent.map(c => [c.category, String(c.amount_cents), `${c.percent}%`, String(c.count)])
        ];

        const csv = rows.map(r => r.join(',')).join('\n');

        if (Platform.OS === 'web') {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `categorias_${dataType}_${periodLabel.replace(/\s/g, '_')}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            Alert.alert('CSV', 'Exportação CSV disponível apenas na web');
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                <ScreenTitle
                    title="Relatório por Categoria"
                    subtitle="Análise de receitas e despesas"
                />

                {/* Mode Selector */}
                <View style={styles.modeSelector}>
                    <TouchableOpacity
                        style={[styles.modeBtn, viewMode === 'month' && { backgroundColor: '#16A34A' }]}
                        onPress={() => setViewMode('month')}
                    >
                        <Text style={[styles.modeBtnText, viewMode === 'month' && { color: '#fff' }]}>📅 Mensal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeBtn, viewMode === 'range' && { backgroundColor: '#16A34A' }]}
                        onPress={() => setViewMode('range')}
                    >
                        <Text style={[styles.modeBtnText, viewMode === 'range' && { color: '#fff' }]}>📊 Por Período</Text>
                    </TouchableOpacity>
                </View>

                {/* Date Navigation/Selection */}
                {viewMode === 'month' ? (
                    <View style={styles.nav}>
                        <TouchableOpacity onPress={() => setYm(m => addMonth(m.year, m.month, -1))}>
                            <Text style={[styles.navArrow, { color: theme.text }]}>◀</Text>
                        </TouchableOpacity>
                        <Text style={[styles.navTitle, { color: theme.text }]}>{periodLabel}</Text>
                        <TouchableOpacity onPress={() => setYm(m => addMonth(m.year, m.month, +1))}>
                            <Text style={[styles.navArrow, { color: theme.text }]}>▶</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.dateInputs}>
                        <View style={{ flex: 1, gap: 4 }}>
                            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 12 }}>Início</Text>
                            {/* @ts-ignore */}
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e: any) => setStartDate(normalizeYMD(e.target.value))}
                                style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 } as any}
                            />
                        </View>
                        <Text style={{ color: theme.text, alignSelf: 'center', marginTop: 20 }}>até</Text>
                        <View style={{ flex: 1, gap: 4 }}>
                            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 12 }}>Fim</Text>
                            {/* @ts-ignore */}
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e: any) => setEndDate(normalizeYMD(e.target.value))}
                                style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 } as any}
                            />
                        </View>
                    </View>
                )}

                {/* Data Type Selector */}
                <View style={styles.typeSelector}>
                    <TouchableOpacity
                        style={[styles.typeBtn, dataType === 'expense' && { backgroundColor: '#DC2626' }]}
                        onPress={() => setDataType('expense')}
                    >
                        <Text style={[styles.typeBtnText, dataType === 'expense' && { color: '#fff' }]}>💸 Despesas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.typeBtn, dataType === 'income' && { backgroundColor: '#16A34A' }]}
                        onPress={() => setDataType('income')}
                    >
                        <Text style={[styles.typeBtnText, dataType === 'income' && { color: '#fff' }]}>💰 Receitas</Text>
                    </TouchableOpacity>
                </View>

                {/* Export Buttons */}
                <View style={styles.exportRow}>
                    <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#D90429' }]} onPress={exportPDF}>
                        <Text style={styles.exportBtnText}>📄 PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#1f2937' }]} onPress={exportCSV}>
                        <Text style={styles.exportBtnText}>📊 CSV</Text>
                    </TouchableOpacity>
                </View>

                {/* Summary Card */}
                <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                        Total de {dataType === 'income' ? 'Receitas' : 'Despesas'}
                    </Text>
                    <Text style={[styles.summaryValue, { color: dataType === 'income' ? '#16A34A' : '#DC2626' }]}>
                        {formatMoney(total)}
                    </Text>
                    <Text style={[styles.summaryCount, { color: theme.textSecondary }]}>
                        {categories.length} categorias • {categories.reduce((sum, c) => sum + c.count, 0)} lançamentos
                    </Text>
                </View>

                {/* Pie Chart */}
                {topCategories.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Text style={[styles.chartTitle, { color: theme.text }]}>📊 Distribuição por Categoria</Text>
                        <View style={styles.chartContainer}>
                            <PieChart data={topCategories} size={180} />
                            <View style={styles.legendContainer}>
                                {topCategories.map((cat, idx) => (
                                    <View key={cat.category} style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }]} />
                                        <Text style={[styles.legendText, { color: theme.text }]} numberOfLines={1}>
                                            {cat.category}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {/* Categories Table */}
                <View style={[styles.tableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.tableTitle, { color: theme.text }]}>📋 Detalhamento</Text>
                    {categoriesWithPercent.length === 0 ? (
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                            Nenhuma transação encontrada
                        </Text>
                    ) : (
                        categoriesWithPercent.map((cat, idx) => (
                            <View key={cat.category} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                                <View style={styles.tableRowLeft}>
                                    <View style={[styles.tableDot, { backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }]} />
                                    <Text style={[styles.categoryName, { color: theme.text }]} numberOfLines={1}>
                                        {cat.category}
                                    </Text>
                                </View>
                                <View style={styles.tableRowRight}>
                                    <Text style={[styles.categoryPercent, { color: theme.textSecondary }]}>
                                        {cat.percent}%
                                    </Text>
                                    <Text style={[styles.categoryValue, { color: dataType === 'income' ? '#16A34A' : '#DC2626' }]}>
                                        {formatMoney(cat.amount_cents)}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    modeSelector: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    modeBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    modeBtnText: {
        fontWeight: '600',
        color: '#374151',
    },
    nav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingHorizontal: 8,
    },
    navArrow: {
        fontSize: 24,
        fontWeight: '700',
    },
    navTitle: {
        fontSize: 18,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    dateInputs: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    typeBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    typeBtnText: {
        fontWeight: '600',
        color: '#374151',
    },
    exportRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    exportBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    exportBtnText: {
        color: '#fff',
        fontWeight: '700',
    },
    summaryCard: {
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 4,
    },
    summaryCount: {
        fontSize: 12,
    },
    chartCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    chartContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    legendContainer: {
        flex: 1,
        gap: 6,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 12,
        flex: 1,
    },
    tableCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    tableTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    tableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    tableRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    tableDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    categoryName: {
        fontSize: 14,
        flex: 1,
    },
    tableRowRight: {
        alignItems: 'flex-end',
    },
    categoryPercent: {
        fontSize: 11,
    },
    categoryValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    emptyText: {
        textAlign: 'center',
        paddingVertical: 20,
    },
});
