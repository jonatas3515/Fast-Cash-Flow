/**
 * DRE (Demonstração do Resultado do Exercício) Screen
 * Gerencial - uses existing transaction data to display income statement.
 * 
 * Structure:
 * (+) Receita Bruta
 * (-) Deduções (não implementado - placeholder para futuro)
 * (=) Receita Líquida
 * (-) Custos Variáveis
 * (=) Lucro Bruto
 * (-) Despesas Fixas
 * (-) Despesas Variáveis
 * (+) Outras Receitas (não implementado - placeholder)
 * (-) Outras Despesas (não implementado - placeholder)
 * (=) Resultado do Período
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import { getTransactionsByMonth, getTransactionsByRange } from '../repositories/transactions';
import { classifyFixedVsVariable } from '../utils/transactionClassifier';
import { formatCentsBRL } from '../utils/money';
import { addMonth, getCurrentYearMonth } from '../utils/date';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useSettings } from '../settings/SettingsProvider';
import ScreenTitle from '../components/ScreenTitle';

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

interface DREData {
    receitaBruta: number;
    deducoes: number;
    receitaLiquida: number;
    custosVariaveis: number;
    lucroBruto: number;
    despesasFixas: number;
    despesasVariaveis: number;
    outrasReceitas: number;
    outrasDespesas: number;
    resultadoPeriodo: number;
}

export default function DREScreen() {
    const { theme, mode: themeMode } = useThemeCtx();
    const { formatMoney, lang } = useI18n();
    const { settings } = useSettings();
    const start = getCurrentYearMonth();
    const [ym, setYm] = React.useState(start);
    const [viewMode, setViewMode] = React.useState<ViewMode>('month');
    const [startDate, setStartDate] = React.useState(todayYMD());
    const [endDate, setEndDate] = React.useState(todayYMD());

    const validRange = ymd(startDate) && ymd(endDate) && startDate <= endDate;

    // Query for monthly data
    const monthlyQ = useQuery({
        queryKey: ['dre-month', ym.year, ym.month],
        queryFn: () => getTransactionsByMonth(ym.year, ym.month),
        enabled: viewMode === 'month',
    });

    // Query for range data
    const rangeQ = useQuery({
        queryKey: ['dre-range', startDate, endDate],
        queryFn: () => validRange ? getTransactionsByRange(startDate, endDate) : Promise.resolve([]),
        enabled: viewMode === 'range' && validRange,
    });

    const [dreData, setDreData] = React.useState<DREData | null>(null);
    const [loading, setLoading] = React.useState(false);

    // Calculate DRE when data changes
    React.useEffect(() => {
        const calculateDRE = async () => {
            const txs = viewMode === 'month' ? (monthlyQ.data || []) : (rangeQ.data || []);
            if (txs.length === 0) {
                setDreData(null);
                return;
            }

            setLoading(true);
            try {
                // Calculate totals
                let receitaBruta = 0;
                let totalDespesas = 0;

                for (const tx of txs) {
                    if (tx.type === 'income') {
                        receitaBruta += tx.amount_cents || 0;
                    } else if (tx.type === 'expense') {
                        totalDespesas += tx.amount_cents || 0;
                    }
                }

                // Classify fixed vs variable expenses
                const { fixed: despesasFixas, variable: despesasVariaveis } = await classifyFixedVsVariable(txs);

                // DRE calculations
                const deducoes = 0; // Placeholder for future
                const receitaLiquida = receitaBruta - deducoes;
                const custosVariaveis = Math.round(despesasVariaveis * 0.6); // Estimate: 60% of variable expenses are costs
                const lucroBruto = receitaLiquida - custosVariaveis;
                const outrasReceitas = 0; // Placeholder
                const outrasDespesas = 0; // Placeholder
                const resultadoPeriodo = lucroBruto - despesasFixas - (despesasVariaveis - custosVariaveis) + outrasReceitas - outrasDespesas;

                setDreData({
                    receitaBruta,
                    deducoes,
                    receitaLiquida,
                    custosVariaveis,
                    lucroBruto,
                    despesasFixas,
                    despesasVariaveis: despesasVariaveis - custosVariaveis, // Only variable expenses not in costs
                    outrasReceitas,
                    outrasDespesas,
                    resultadoPeriodo,
                });
            } catch (error) {
                console.error('Error calculating DRE:', error);
            } finally {
                setLoading(false);
            }
        };

        calculateDRE();
    }, [viewMode, monthlyQ.data, rangeQ.data]);

    const monthName = (new Date(ym.year, ym.month - 1, 1)).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { month: 'long' });
    const periodLabel = viewMode === 'month'
        ? `${monthName} ${ym.year}`
        : `${toDDMMYYYY(startDate)} a ${toDDMMYYYY(endDate)}`;

    // Generate HTML for PDF export
    const generateDREHTML = () => {
        if (!dreData) return '';

        const rows = [
            { label: '(+) Receita Bruta', value: dreData.receitaBruta, type: 'income' },
            { label: '(-) Deduções', value: dreData.deducoes, type: 'expense', indent: 1 },
            { label: '(=) Receita Líquida', value: dreData.receitaLiquida, type: 'subtotal' },
            { label: '(-) Custos Variáveis', value: dreData.custosVariaveis, type: 'expense', indent: 1 },
            { label: '(=) Lucro Bruto', value: dreData.lucroBruto, type: 'subtotal' },
            { label: '(-) Despesas Fixas', value: dreData.despesasFixas, type: 'expense', indent: 1 },
            { label: '(-) Despesas Variáveis', value: dreData.despesasVariaveis, type: 'expense', indent: 1 },
            { label: '(+) Outras Receitas', value: dreData.outrasReceitas, type: 'income', indent: 1 },
            { label: '(-) Outras Despesas', value: dreData.outrasDespesas, type: 'expense', indent: 1 },
            { label: '(=) RESULTADO DO PERÍODO', value: dreData.resultadoPeriodo, type: 'result' },
        ];

        const rowsHtml = rows.map(r => `
      <tr class="${r.type}">
        <td style="padding-left: ${(r.indent || 0) * 20}px">${r.label}</td>
        <td class="value">${formatMoney(r.value)}</td>
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
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #1f2937; color: #fff; padding: 12px; text-align: left; }
    th:last-child { text-align: right; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    td.value { text-align: right; font-weight: 600; }
    tr.income td.value { color: #16A34A; }
    tr.expense td.value { color: #DC2626; }
    tr.subtotal { background: #f3f4f6; }
    tr.subtotal td { font-weight: 700; }
    tr.result { background: #16A34A; }
    tr.result td { color: #fff; font-weight: 800; font-size: 16px; }
    .footer { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 30px; }
  </style>
</head>
<body>
  <h1>📊 DRE - Demonstração do Resultado</h1>
  <h2>${periodLabel}</h2>
  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th>Valor</th>
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
        if (!dreData) {
            Alert.alert('Erro', 'Nenhum dado para exportar');
            return;
        }

        try {
            const html = generateDREHTML();

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
        if (!dreData) {
            Alert.alert('Erro', 'Nenhum dado para exportar');
            return;
        }

        const rows = [
            ['Descrição', 'Valor'],
            ['Receita Bruta', String(dreData.receitaBruta)],
            ['Deduções', String(dreData.deducoes)],
            ['Receita Líquida', String(dreData.receitaLiquida)],
            ['Custos Variáveis', String(dreData.custosVariaveis)],
            ['Lucro Bruto', String(dreData.lucroBruto)],
            ['Despesas Fixas', String(dreData.despesasFixas)],
            ['Despesas Variáveis', String(dreData.despesasVariaveis)],
            ['Outras Receitas', String(dreData.outrasReceitas)],
            ['Outras Despesas', String(dreData.outrasDespesas)],
            ['Resultado do Período', String(dreData.resultadoPeriodo)],
        ];

        const csv = rows.map(r => r.join(',')).join('\n');

        if (Platform.OS === 'web') {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dre_${periodLabel.replace(/\s/g, '_')}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            Alert.alert('CSV', 'Exportação CSV disponível apenas na web');
        }
    };

    const DRERow = ({ label, value, type, indent = 0 }: { label: string; value: number; type: string; indent?: number }) => {
        const isResult = type === 'result';
        const isSubtotal = type === 'subtotal';
        const isIncome = type === 'income';
        const isExpense = type === 'expense';

        return (
            <View style={[
                styles.row,
                isResult && { backgroundColor: value >= 0 ? '#16A34A' : '#DC2626' },
                isSubtotal && { backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border },
            ]}>
                <Text style={[
                    styles.label,
                    { color: isResult ? '#fff' : theme.text, paddingLeft: indent * 16 },
                    (isSubtotal || isResult) && { fontWeight: '700' },
                ]}>
                    {label}
                </Text>
                <Text style={[
                    styles.value,
                    { color: isResult ? '#fff' : (isIncome ? '#16A34A' : (isExpense ? '#DC2626' : theme.text)) },
                    (isSubtotal || isResult) && { fontWeight: '700', fontSize: isResult ? 18 : 16 },
                ]}>
                    {formatMoney(value)}
                </Text>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                <ScreenTitle
                    title="DRE Gerencial"
                    subtitle="Demonstração do Resultado do Exercício"
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

                {/* Export Buttons */}
                <View style={styles.exportRow}>
                    <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#D90429' }]} onPress={exportPDF}>
                        <Text style={styles.exportBtnText}>📄 Exportar PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#1f2937' }]} onPress={exportCSV}>
                        <Text style={styles.exportBtnText}>📊 Exportar CSV</Text>
                    </TouchableOpacity>
                </View>

                {/* DRE Table */}
                {loading ? (
                    <View style={styles.loading}>
                        <Text style={{ color: theme.textSecondary }}>Calculando DRE...</Text>
                    </View>
                ) : dreData ? (
                    <View style={[styles.dreTable, { borderColor: theme.border }]}>
                        <View style={[styles.tableHeader, { backgroundColor: '#1f2937' }]}>
                            <Text style={styles.tableHeaderText}>Descrição</Text>
                            <Text style={styles.tableHeaderText}>Valor</Text>
                        </View>
                        <DRERow label="(+) Receita Bruta" value={dreData.receitaBruta} type="income" />
                        <DRERow label="(-) Deduções" value={dreData.deducoes} type="expense" indent={1} />
                        <DRERow label="(=) Receita Líquida" value={dreData.receitaLiquida} type="subtotal" />
                        <DRERow label="(-) Custos Variáveis" value={dreData.custosVariaveis} type="expense" indent={1} />
                        <DRERow label="(=) Lucro Bruto" value={dreData.lucroBruto} type="subtotal" />
                        <DRERow label="(-) Despesas Fixas" value={dreData.despesasFixas} type="expense" indent={1} />
                        <DRERow label="(-) Despesas Variáveis" value={dreData.despesasVariaveis} type="expense" indent={1} />
                        <DRERow label="(+) Outras Receitas" value={dreData.outrasReceitas} type="income" indent={1} />
                        <DRERow label="(-) Outras Despesas" value={dreData.outrasDespesas} type="expense" indent={1} />
                        <DRERow label="(=) RESULTADO DO PERÍODO" value={dreData.resultadoPeriodo} type="result" />
                    </View>
                ) : (
                    <View style={styles.empty}>
                        <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
                            📊 Nenhuma transação encontrada para o período selecionado
                        </Text>
                    </View>
                )}

                {/* Info Card */}
                <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.infoTitle, { color: theme.text }]}>ℹ️ Sobre o DRE Gerencial</Text>
                    <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                        Este é um DRE simplificado baseado nas suas transações. As despesas são classificadas automaticamente
                        como fixas (recorrentes) ou variáveis com base nas despesas cadastradas.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    modeSelector: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
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
        marginBottom: 16,
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
        marginBottom: 16,
    },
    exportRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    exportBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    exportBtnText: {
        color: '#fff',
        fontWeight: '700',
    },
    dreTable: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 16,
    },
    tableHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
    },
    tableHeaderText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    label: {
        fontSize: 14,
        flex: 1,
    },
    value: {
        fontSize: 14,
        fontWeight: '600',
    },
    loading: {
        padding: 40,
        alignItems: 'center',
    },
    empty: {
        padding: 40,
        alignItems: 'center',
    },
    infoCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    infoTitle: {
        fontWeight: '700',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 13,
        lineHeight: 20,
    },
});
