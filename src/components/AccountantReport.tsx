import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Platform, Alert, ScrollView } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { getTransactionsByMonth, getMonthlyTotals } from '../repositories/transactions';
import { getCurrentCompanyId } from '../lib/company';
import { supabase } from '../lib/supabase';
import { formatCentsBRL } from '../utils/money';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Share } from 'react-native';
import { useResolvedBusinessType } from '../hooks/useSegmentCategories';
import { getCategoryDisplayLabel, getCategoryGroupKey } from '../utils/segment';

interface AccountantReportProps {
  year: number;
  month: number;
  onClose?: () => void;
}

interface CompanyData {
  name: string;
  cnpj?: string;
  cpf?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface CategorySummary {
  category: string;
  income_cents: number;
  expense_cents: number;
  count: number;
}

interface PaymentMethodSummary {
  method: string;
  income_cents: number;
  expense_cents: number;
  count: number;
}

export default function AccountantReport({ year, month, onClose }: AccountantReportProps) {
  const { theme, mode } = useThemeCtx();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const businessType = useResolvedBusinessType();

  // Buscar dados da empresa
  const companyQuery = useQuery({
    queryKey: ['company-data-report'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return null;

      const { data } = await supabase
        .from('companies')
        .select('name, cnpj, cpf, email, phone, address')
        .eq('id', companyId)
        .single();

      return data as CompanyData | null;
    },
  });

  // Buscar transações do mês
  const txQuery = useQuery({
    queryKey: ['accountant-transactions', year, month],
    queryFn: () => getTransactionsByMonth(year, month),
  });

  // Buscar totais do mês
  const totalsQuery = useQuery({
    queryKey: ['accountant-totals', year, month],
    queryFn: () => getMonthlyTotals(year, month),
  });

  const transactions = txQuery.data || [];
  const totals = totalsQuery.data || { income_cents: 0, expense_cents: 0, balance_cents: 0 };
  const company = companyQuery.data;

  // Agrupar por categoria
  const categoryBreakdown = React.useMemo(() => {
    const map = new Map<string, CategorySummary>();
    
    transactions.forEach(tx => {
      const cat = getCategoryGroupKey(businessType, tx.category, tx.description, 'Sem categoria');
      const existing = map.get(cat) || { category: cat, income_cents: 0, expense_cents: 0, count: 0 };
      
      if (tx.type === 'income') {
        existing.income_cents += tx.amount_cents || 0;
      } else {
        existing.expense_cents += tx.amount_cents || 0;
      }
      existing.count++;
      map.set(cat, existing);
    });

    return Array.from(map.values()).sort((a, b) => 
      (b.income_cents + b.expense_cents) - (a.income_cents + a.expense_cents)
    );
  }, [transactions, businessType]);

  // Agrupar por forma de pagamento (se disponível)
  const paymentMethodBreakdown = React.useMemo(() => {
    const map = new Map<string, PaymentMethodSummary>();
    
    transactions.forEach(tx => {
      const method = (tx as any).payment_method || 'Não informado';
      const existing = map.get(method) || { method, income_cents: 0, expense_cents: 0, count: 0 };
      
      if (tx.type === 'income') {
        existing.income_cents += tx.amount_cents || 0;
      } else {
        existing.expense_cents += tx.amount_cents || 0;
      }
      existing.count++;
      map.set(method, existing);
    });

    return Array.from(map.values()).sort((a, b) => 
      (b.income_cents + b.expense_cents) - (a.income_cents + a.expense_cents)
    );
  }, [transactions]);

  const monthName = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long' });
  const periodLabel = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;

  // Gerar HTML do relatório para contador
  const generateAccountantHTML = () => {
    const incomeRows = categoryBreakdown
      .filter(c => c.income_cents > 0)
      .map(c => `
        <tr>
          <td>${c.category}</td>
          <td style="text-align:right">${formatCentsBRL(c.income_cents)}</td>
          <td style="text-align:center">${c.count}</td>
        </tr>
      `).join('');

    const expenseRows = categoryBreakdown
      .filter(c => c.expense_cents > 0)
      .map(c => `
        <tr>
          <td>${c.category}</td>
          <td style="text-align:right">${formatCentsBRL(c.expense_cents)}</td>
          <td style="text-align:center">${c.count}</td>
        </tr>
      `).join('');

    const txRows = transactions.map(tx => `
      <tr>
        <td>${tx.date}</td>
        <td>${tx.type === 'income' ? 'Entrada' : 'Saída'}</td>
        <td>${tx.description || '-'}</td>
        <td>${getCategoryDisplayLabel(businessType, tx.category, tx.description, '-')}</td>
        <td style="text-align:right;color:${tx.type === 'income' ? '#16A34A' : '#D90429'}">
          ${tx.type === 'income' ? '+' : '-'}${formatCentsBRL(tx.amount_cents || 0)}
        </td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório para Contador - ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      padding: 24px; 
      font-size: 12px; 
      color: #333;
      max-width: 800px;
      margin: 0 auto;
    }
    .header { 
      text-align: center; 
      border-bottom: 2px solid #333; 
      padding-bottom: 16px; 
      margin-bottom: 24px; 
    }
    .header h1 { 
      margin: 0 0 8px 0; 
      font-size: 22px; 
      color: #111; 
    }
    .header h2 { 
      margin: 0; 
      font-size: 16px; 
      color: #666; 
      font-weight: normal; 
    }
    .company-info { 
      background: #f5f5f5; 
      padding: 16px; 
      border-radius: 8px; 
      margin-bottom: 24px; 
    }
    .company-info h3 { 
      margin: 0 0 12px 0; 
      font-size: 14px; 
      color: #333; 
    }
    .company-info p { 
      margin: 4px 0; 
      font-size: 12px; 
    }
    .company-info strong { 
      display: inline-block; 
      width: 100px; 
    }
    .summary-cards { 
      display: flex; 
      gap: 16px; 
      margin-bottom: 24px; 
      flex-wrap: wrap; 
    }
    .summary-card { 
      flex: 1; 
      min-width: 150px;
      border: 1px solid #ddd; 
      border-radius: 8px; 
      padding: 16px; 
      text-align: center; 
    }
    .summary-card.income { border-left: 4px solid #16A34A; }
    .summary-card.expense { border-left: 4px solid #D90429; }
    .summary-card.balance { border-left: 4px solid #3B82F6; }
    .summary-card h4 { 
      margin: 0 0 8px 0; 
      font-size: 12px; 
      color: #666; 
      text-transform: uppercase; 
    }
    .summary-card .value { 
      font-size: 20px; 
      font-weight: bold; 
    }
    .summary-card.income .value { color: #16A34A; }
    .summary-card.expense .value { color: #D90429; }
    .summary-card.balance .value { color: ${totals.balance_cents >= 0 ? '#16A34A' : '#D90429'}; }
    .section { margin-bottom: 24px; }
    .section h3 { 
      font-size: 14px; 
      color: #333; 
      border-bottom: 1px solid #ddd; 
      padding-bottom: 8px; 
      margin-bottom: 12px; 
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 11px; 
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 8px; 
      text-align: left; 
    }
    th { 
      background: #f5f5f5; 
      font-weight: bold; 
      font-size: 10px;
      text-transform: uppercase;
    }
    tr:nth-child(even) { background: #fafafa; }
    .footer { 
      text-align: center; 
      color: #999; 
      font-size: 10px; 
      margin-top: 32px; 
      padding-top: 16px; 
      border-top: 1px solid #ddd; 
    }
    .two-columns { 
      display: flex; 
      gap: 24px; 
    }
    .two-columns > div { flex: 1; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 RELATÓRIO FINANCEIRO PARA CONTADOR</h1>
    <h2>${periodLabel}</h2>
  </div>

  <div class="company-info">
    <h3>📋 Dados da Empresa</h3>
    <p><strong>Razão Social:</strong> ${company?.name || 'Não informado'}</p>
    <p><strong>CNPJ/CPF:</strong> ${company?.cnpj || company?.cpf || 'Não informado'}</p>
    <p><strong>E-mail:</strong> ${company?.email || 'Não informado'}</p>
    <p><strong>Telefone:</strong> ${company?.phone || 'Não informado'}</p>
    <p><strong>Endereço:</strong> ${company?.address || 'Não informado'}</p>
    <p><strong>Período:</strong> ${periodLabel}</p>
  </div>

  <div class="summary-cards">
    <div class="summary-card income">
      <h4>Total de Entradas</h4>
      <div class="value">${formatCentsBRL(totals.income_cents)}</div>
    </div>
    <div class="summary-card expense">
      <h4>Total de Saídas</h4>
      <div class="value">${formatCentsBRL(totals.expense_cents)}</div>
    </div>
    <div class="summary-card balance">
      <h4>Resultado do Período</h4>
      <div class="value">${formatCentsBRL(totals.balance_cents)}</div>
    </div>
  </div>

  <div class="two-columns">
    <div class="section">
      <h3>💰 Entradas por Categoria</h3>
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th style="text-align:right">Valor</th>
            <th style="text-align:center">Qtd</th>
          </tr>
        </thead>
        <tbody>
          ${incomeRows || '<tr><td colspan="3" style="text-align:center;color:#999">Nenhuma entrada no período</td></tr>'}
        </tbody>
        <tfoot>
          <tr style="font-weight:bold;background:#e8f5e9">
            <td>TOTAL</td>
            <td style="text-align:right">${formatCentsBRL(totals.income_cents)}</td>
            <td style="text-align:center">${transactions.filter(t => t.type === 'income').length}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="section">
      <h3>💸 Saídas por Categoria</h3>
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th style="text-align:right">Valor</th>
            <th style="text-align:center">Qtd</th>
          </tr>
        </thead>
        <tbody>
          ${expenseRows || '<tr><td colspan="3" style="text-align:center;color:#999">Nenhuma saída no período</td></tr>'}
        </tbody>
        <tfoot>
          <tr style="font-weight:bold;background:#ffebee">
            <td>TOTAL</td>
            <td style="text-align:right">${formatCentsBRL(totals.expense_cents)}</td>
            <td style="text-align:center">${transactions.filter(t => t.type === 'expense').length}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  <div class="section">
    <h3>📝 Lançamentos Detalhados (${transactions.length} registros)</h3>
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Tipo</th>
          <th>Descrição</th>
          <th>Categoria</th>
          <th style="text-align:right">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${txRows || '<tr><td colspan="5" style="text-align:center;color:#999">Nenhum lançamento no período</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
    <p>Fast Cash Flow - Sistema de Gestão Financeira</p>
  </div>
</body>
</html>`;
  };

  // Gerar CSV para contador
  const generateAccountantCSV = () => {
    const lines: string[] = [];
    
    // Cabeçalho com dados da empresa
    lines.push('RELATÓRIO FINANCEIRO PARA CONTADOR');
    lines.push(`Período: ${periodLabel}`);
    lines.push('');
    lines.push('DADOS DA EMPRESA');
    lines.push(`Razão Social: ${company?.name || 'Não informado'}`);
    lines.push(`CNPJ/CPF: ${company?.cnpj || company?.cpf || 'Não informado'}`);
    lines.push(`E-mail: ${company?.email || 'Não informado'}`);
    lines.push(`Telefone: ${company?.phone || 'Não informado'}`);
    lines.push('');
    
    // Resumo
    lines.push('RESUMO DO PERÍODO');
    lines.push(`Total de Entradas: ${formatCentsBRL(totals.income_cents)}`);
    lines.push(`Total de Saídas: ${formatCentsBRL(totals.expense_cents)}`);
    lines.push(`Resultado: ${formatCentsBRL(totals.balance_cents)}`);
    lines.push('');
    
    // Entradas por categoria
    lines.push('ENTRADAS POR CATEGORIA');
    lines.push('Categoria,Valor,Quantidade');
    categoryBreakdown.filter(c => c.income_cents > 0).forEach(c => {
      lines.push(`"${c.category}",${(c.income_cents / 100).toFixed(2)},${c.count}`);
    });
    lines.push('');
    
    // Saídas por categoria
    lines.push('SAÍDAS POR CATEGORIA');
    lines.push('Categoria,Valor,Quantidade');
    categoryBreakdown.filter(c => c.expense_cents > 0).forEach(c => {
      lines.push(`"${c.category}",${(c.expense_cents / 100).toFixed(2)},${c.count}`);
    });
    lines.push('');
    
    // Lançamentos detalhados
    lines.push('LANÇAMENTOS DETALHADOS');
    lines.push('Data,Tipo,Descrição,Categoria,Valor');
    transactions.forEach(tx => {
      const valor = tx.type === 'income' ? (tx.amount_cents || 0) / 100 : -(tx.amount_cents || 0) / 100;
      lines.push(`${tx.date},${tx.type === 'income' ? 'Entrada' : 'Saída'},"${tx.description || ''}","${tx.category || ''}",${valor.toFixed(2)}`);
    });
    
    return lines.join('\n');
  };

  // Exportar PDF
  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      const html = generateAccountantHTML();
      
      if (Platform.OS === 'web') {
        const w = window.open('', '_blank');
        if (w) {
          w.document.open();
          w.document.write(html);
          w.document.close();
          w.focus();
          setTimeout(() => { w.print(); }, 300);
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Salvar Relatório para Contador',
            UTI: 'com.adobe.pdf'
          });
        } else {
          Alert.alert('Sucesso', 'PDF salvo em: ' + uri);
        }
      }
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Exportar CSV
  const handleExportCSV = async () => {
    setIsGenerating(true);
    try {
      const csv = generateAccountantCSV();
      const filename = `relatorio-contador-${year}-${String(month).padStart(2, '0')}.csv`;
      
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const FSAny: any = FileSystem;
        const dir = FSAny.documentDirectory || FSAny.cacheDirectory || '';
        const path = dir + filename;
        await FileSystem.writeAsStringAsync(path, csv);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Exportar CSV' });
        } else {
          await Share.share({ message: 'Relatório CSV', url: path });
        }
      }
    } catch (error: any) {
      console.error('Erro ao gerar CSV:', error);
      Alert.alert('Erro', 'Não foi possível gerar o CSV: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Compartilhar via WhatsApp
  const handleShareWhatsApp = async () => {
    setIsGenerating(true);
    try {
      const html = generateAccountantHTML();
      
      if (Platform.OS === 'web') {
        // Na web, copiar resumo para clipboard e abrir WhatsApp Web
        const summary = `📊 *Relatório para Contador - ${periodLabel}*\n\n` +
          `🏢 ${company?.name || 'Empresa'}\n` +
          `📋 CNPJ/CPF: ${company?.cnpj || company?.cpf || 'Não informado'}\n\n` +
          `💰 Entradas: ${formatCentsBRL(totals.income_cents)}\n` +
          `💸 Saídas: ${formatCentsBRL(totals.expense_cents)}\n` +
          `📈 Resultado: ${formatCentsBRL(totals.balance_cents)}\n\n` +
          `📝 Total de lançamentos: ${transactions.length}`;
        
        const url = `https://wa.me/?text=${encodeURIComponent(summary)}`;
        window.open(url, '_blank');
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        await Share.share({
          message: `📊 Relatório para Contador - ${periodLabel}`,
          url: uri,
          title: 'Relatório Financeiro'
        });
      }
    } catch (error: any) {
      console.error('Erro ao compartilhar:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    onClose?.();
  };

  if (!showModal) return null;

  return (
    <Modal
      visible={showModal}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              📊 Relatório para Contador
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={[styles.period, { color: theme.textSecondary }]}>
              Período: {periodLabel}
            </Text>

            {/* Resumo */}
            <View style={styles.summaryCards}>
              <View style={[styles.summaryCard, { borderColor: '#16A34A' }]}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Entradas</Text>
                <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
                  {formatCentsBRL(totals.income_cents)}
                </Text>
              </View>
              <View style={[styles.summaryCard, { borderColor: '#D90429' }]}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Saídas</Text>
                <Text style={[styles.summaryValue, { color: '#D90429' }]}>
                  {formatCentsBRL(totals.expense_cents)}
                </Text>
              </View>
              <View style={[styles.summaryCard, { borderColor: '#3B82F6' }]}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Resultado</Text>
                <Text style={[styles.summaryValue, { color: totals.balance_cents >= 0 ? '#16A34A' : '#D90429' }]}>
                  {formatCentsBRL(totals.balance_cents)}
                </Text>
              </View>
            </View>

            {/* Info */}
            <View style={[styles.infoBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>
                📋 O que inclui este relatório:
              </Text>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                • Dados da empresa (CNPJ/CPF, razão social){'\n'}
                • Resumo do período (faturamento, despesas, resultado){'\n'}
                • Lançamentos agrupados por categoria{'\n'}
                • Lista completa de {transactions.length} lançamentos
              </Text>
            </View>
          </ScrollView>

          {/* Botões de ação */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#D90429' }]}
              onPress={handleExportPDF}
              disabled={isGenerating}
            >
              <Text style={styles.actionButtonText}>
                {isGenerating ? '⏳' : '📄'} Baixar PDF
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: mode === 'dark' ? '#FFC300' : '#111' }]}
              onPress={handleExportCSV}
              disabled={isGenerating}
            >
              <Text style={[styles.actionButtonText, { color: mode === 'dark' ? '#111' : '#fff' }]}>
                {isGenerating ? '⏳' : '📊'} Baixar CSV
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#25D366' }]}
              onPress={handleShareWhatsApp}
              disabled={isGenerating}
            >
              <Text style={styles.actionButtonText}>
                {isGenerating ? '⏳' : '📱'} WhatsApp
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Botão para abrir o relatório (para usar na ReportsScreen)
export function AccountantReportButton({ year, month }: { year: number; month: number }) {
  const { theme, mode } = useThemeCtx();
  const [showReport, setShowReport] = useState(false);

  return (
    <>
      <TouchableOpacity 
        style={[styles.reportButton, { backgroundColor: '#6366F1' }]}
        onPress={() => setShowReport(true)}
      >
        <Text style={styles.reportButtonText}>
          📊 Relatório para Contador
        </Text>
      </TouchableOpacity>

      {showReport && (
        <AccountantReport 
          year={year} 
          month={month} 
          onClose={() => setShowReport(false)} 
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 20,
  },
  content: {
    padding: 16,
  },
  period: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  reportButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  reportButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
