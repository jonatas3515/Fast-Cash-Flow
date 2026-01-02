import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { addMonth, getCurrentYearMonth } from '../utils/date';
import { getTransactionsByMonth, getMonthlyDailySeries, getMonthlyTotals } from '../repositories/transactions';
import { formatCentsBRL } from '../utils/money';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Linking, Share } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useSettings } from '../settings/SettingsProvider';
import { useI18n } from '../i18n/I18nProvider';
import { useFocusEffect } from '@react-navigation/native';
import ScreenTitle from '../components/ScreenTitle';
import { getCurrentCompanyId } from '../lib/company';
import { AccountantReportButton } from '../components/AccountantReport';
import FeatureBanner, { FEATURE_BANNERS } from '../components/FeatureBanner';

export default function ReportsScreen() {
  const start = getCurrentYearMonth();
  const [ym, setYm] = React.useState(start);
  const { theme } = useThemeCtx();
  const { settings } = useSettings();
  const { t: tr, formatMoney, lang } = useI18n();

  // Marcar relatório como gerado para o onboarding
  React.useEffect(() => {
    (async () => {
      const companyId = await getCurrentCompanyId();
      if (companyId && Platform.OS === 'web') {
        try {
          window.localStorage.setItem(`report_generated_${companyId}`, 'true');
        } catch (e) {
          console.log('Não foi possível salvar flag de relatório');
        }
      }
    })();
  }, []);

  const txQ = useQuery({
    queryKey: ['reports-month', ym.year, ym.month],
    queryFn: () => getTransactionsByMonth(ym.year, ym.month),
  });
  const totalsQ = useQuery({
    queryKey: ['reports-totals', ym.year, ym.month],
    queryFn: () => getMonthlyTotals(ym.year, ym.month),
  });

  useFocusEffect(
    React.useCallback(() => {
      txQ.refetch();
    }, [ym.year, ym.month])
  );

  const exportCSV = async () => {
    const txs = txQ.data || [];
    const rows = [
      ['id', 'type', 'date', 'time', 'description', 'category', 'amount_cents'],
      ...txs.map(t => [t.id, t.type, t.date, t.time || '', t.description || '', t.category || '', String(t.amount_cents || 0)]),
    ];
    const csv = rows.map(r => r.map(field => '"' + String(field).replace(/"/g, '""') + '"').join(',')).join('\n');
    const filename = `fast-cash-${ym.year}-${String(ym.month).padStart(2, '0')}.csv`;
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const FSAny: any = FileSystem;
    const dir = FSAny.documentDirectory || FSAny.cacheDirectory || '';
    const path = dir + filename;
    await FileSystem.writeAsStringAsync(path, csv);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Exportar CSV' });
    } else {
      await Share.share({ message: 'Relatório CSV', url: path });
    }
  };

  // Gera HTML do relatório (usado por PDF e Web)
  const generateReportHTML = async () => {
    const txs = txQ.data || [];
    const totals = await getMonthlyTotals(ym.year, ym.month);

    // Buscar dados do mês anterior para comparação
    const prevMonth = ym.month === 1 ? 12 : ym.month - 1;
    const prevYear = ym.month === 1 ? ym.year - 1 : ym.year;
    let prevTotals = { income_cents: 0, expense_cents: 0, balance_cents: 0 };
    try {
      prevTotals = await getMonthlyTotals(prevYear, prevMonth);
    } catch { }

    // Calcular variações
    const incomeChange = prevTotals.income_cents > 0
      ? ((totals.income_cents - prevTotals.income_cents) / prevTotals.income_cents * 100).toFixed(0)
      : '—';
    const expenseChange = prevTotals.expense_cents > 0
      ? ((totals.expense_cents - prevTotals.expense_cents) / prevTotals.expense_cents * 100).toFixed(0)
      : '—';

    let logoSrc = settings.logoUrl || '';
    if (logoSrc.startsWith('file://')) {
      try {
        const b64 = await FileSystem.readAsStringAsync(logoSrc, { encoding: 'base64' as any });
        logoSrc = `data:image/png;base64,${b64}`;
      } catch { }
    }

    const rows = txs.map((tx, index) => `
      <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
        <td>${tx.date} ${tx.time || ''}</td>
        <td class="${tx.type === 'income' ? 'income' : 'expense'}">${tx.type === 'income' ? tr('income') : tr('expense')}</td>
        <td>${(tx.description || '').replace(/</g, '&lt;')}</td>
        <td>${(tx.category || '').replace(/</g, '&lt;')}</td>
        <td style="text-align:right" class="${tx.type === 'income' ? 'income' : 'expense'}">${formatMoney(tx.amount_cents || 0)}</td>
      </tr>`).join('');

    const daysInMonth = new Date(ym.year, ym.month, 0).getDate();
    const avgIncome = Math.round((totals.income_cents || 0) / Math.max(1, daysInMonth));
    const avgExpense = Math.round((totals.expense_cents || 0) / Math.max(1, daysInMonth));
    const avgBalance = Math.round((totals.balance_cents || 0) / Math.max(1, daysInMonth));

    const monthName = (new Date(ym.year, ym.month - 1, 1)).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { month: 'long' });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 16px; font-size: 14px; color: #1f2937; background: #fff; }
    h1 { font-size: 22px; margin: 0 0 8px 0; text-align: center; color: #16A34A; }
    h2 { text-align: center; color: #6b7280; font-size: 16px; margin: 0 0 12px 0; font-weight: 500; }
    .dashboard-ref { text-align: center; color: #9ca3af; font-size: 11px; margin-bottom: 20px; padding: 8px; background: #f9fafb; border-radius: 6px; }
    
    /* Executive Summary */
    .executive-summary { 
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
      border: 2px solid #16A34A;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .executive-summary h3 { 
      margin: 0 0 12px 0;
      color: #15803d;
      font-size: 16px;
      text-align: center;
    }
    
    .cards { display: flex; gap: 12px; margin: 16px 0; flex-wrap: wrap; }
    .card { 
      border: 1px solid #e5e7eb; 
      border-radius: 10px; 
      padding: 14px; 
      flex: 1; 
      min-width: 140px;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .card-title { font-weight: 600; font-size: 12px; margin-bottom: 6px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .card-value { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .card-subtitle { color: #9ca3af; font-size: 11px; }
    .card-change { 
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      margin-top: 6px;
    }
    .change-positive { background: #dcfce7; color: #16A34A; }
    .change-negative { background: #fee2e2; color: #DC2626; }
    
    .logo { text-align: center; margin-bottom: 12px; }
    
    /* Table with zebra and sticky header */
    .table-container { margin-top: 20px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead { position: sticky; top: 0; z-index: 10; }
    th { 
      background: linear-gradient(180deg, #1f2937 0%, #374151 100%);
      color: #fff;
      text-align: left; 
      font-weight: 600; 
      padding: 12px 8px;
      border: none;
    }
    th:first-child { border-radius: 8px 0 0 0; }
    th:last-child { border-radius: 0 8px 0 0; }
    td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; }
    tr.even { background: #ffffff; }
    tr.odd { background: #f9fafb; }
    tr:hover { background: #f0fdf4; }
    .income { color: #16A34A; font-weight: 600; }
    .expense { color: #DC2626; font-weight: 600; }
    
    .footer { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="logo">
    ${logoSrc ? `<img src="${logoSrc}" style="height:56px">` : ''}
  </div>
  <h1>📊 FAST CASH FLOW</h1>
  <h2>${monthName} ${ym.year}</h2>
  <div class="dashboard-ref">
    📈 Estes números vêm do seu dashboard de ${monthName}/${ym.year}
  </div>
  
  <!-- Resumo Executivo -->
  <div class="executive-summary">
    <h3>📋 Resumo Executivo</h3>
    <div class="cards">
      <div class="card">
        <div class="card-title">💰 ${tr('income')}</div>
        <div class="card-value" style="color:#16A34A">${formatMoney(totals.income_cents)}</div>
        <div class="card-subtitle">Média/dia: ${formatMoney(avgIncome)}</div>
        ${incomeChange !== '—' ? `<span class="card-change ${Number(incomeChange) >= 0 ? 'change-positive' : 'change-negative'}">${Number(incomeChange) >= 0 ? '↑' : '↓'} ${incomeChange}% vs mês anterior</span>` : ''}
      </div>
      <div class="card">
        <div class="card-title">💸 ${tr('expense')}</div>
        <div class="card-value" style="color:#D90429">${formatMoney(totals.expense_cents)}</div>
        <div class="card-subtitle">Média/dia: ${formatMoney(avgExpense)}</div>
        ${expenseChange !== '—' ? `<span class="card-change ${Number(expenseChange) <= 0 ? 'change-positive' : 'change-negative'}">${Number(expenseChange) <= 0 ? '↓' : '↑'} ${expenseChange}% vs mês anterior</span>` : ''}
      </div>
      <div class="card">
        <div class="card-title">💎 ${tr('balance')}</div>
        <div class="card-value" style="color:${totals.balance_cents >= 0 ? '#16A34A' : '#D90429'}">
          ${formatMoney(totals.balance_cents)}
        </div>
        <div class="card-subtitle">Média/dia: ${formatMoney(avgBalance)}</div>
      </div>
    </div>
  </div>
  
  <!-- Tabela de Transações -->
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>📅 ${tr('date_time')}</th>
          <th>📊 Tipo</th>
          <th>📝 ${tr('table_description')}</th>
          <th>🏷️ ${tr('table_category')}</th>
          <th style="text-align:right">💵 Valor</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
  
  <div class="footer">
    ✅ Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} via Fast Cash Flow
  </div>
</body>
</html>`;
  };

  // Exporta PDF - funciona em Android, iOS e Web
  const exportPDF = async (): Promise<string | null> => {
    try {
      const html = await generateReportHTML();

      // Web: abre em nova janela para impressão
      if (Platform.OS === 'web') {
        const w = window.open('', '_blank');
        if (w) {
          w.document.open();
          w.document.write(html);
          w.document.close();
          w.focus();
          setTimeout(() => { w.print(); w.close(); }, 300);
        }
        return null;
      }

      // Android/iOS: gera PDF usando expo-print
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      console.log('✅ PDF gerado:', uri);
      return uri;

    } catch (error: any) {
      console.error('❌ Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF: ' + error.message);
      return null;
    }
  };

  // Baixar/Compartilhar PDF
  const handleDownloadPDF = async () => {
    const pdfUri = await exportPDF();
    if (pdfUri) {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Salvar Relatório PDF',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Sucesso', 'PDF salvo em: ' + pdfUri);
      }
    }
  };

  // Enviar via WhatsApp - abre o WhatsApp diretamente onde o usuário escolhe o contato
  const handleShareWhatsApp = async () => {
    try {
      const totals = await getMonthlyTotals(ym.year, ym.month);
      const monthName = (new Date(ym.year, ym.month - 1, 1)).toLocaleString('pt-BR', { month: 'long' });

      // Gerar resumo em texto para o WhatsApp
      const text = `📊 *Relatório Fast Cash Flow*
📅 *${monthName} ${ym.year}*

💰 *Entradas:* ${formatMoney(totals.income_cents)}
💸 *Saídas:* ${formatMoney(totals.expense_cents)}
💎 *Saldo:* ${formatMoney(totals.balance_cents)}

_Gerado via Fast Cash Flow_`;

      const encodedText = encodeURIComponent(text);
      const waUrl = `https://wa.me/?text=${encodedText}`;

      if (Platform.OS === 'web') {
        // Web: tentar navigator.share primeiro, senão abre wa.me
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            await navigator.share({
              title: `Relatório Fast Cash Flow - ${monthName} ${ym.year}`,
              text: text,
            });
            return;
          } catch (shareError) {
            // Se usuário cancelou ou não suporta, continua para wa.me
            console.log('Web Share cancelado ou não suportado, abrindo wa.me');
          }
        }
        window.open(waUrl, '_blank');
      } else {
        // Mobile: abre WhatsApp diretamente via URL
        await Linking.openURL(waUrl);
      }
    } catch (error: any) {
      console.error('Erro ao enviar para WhatsApp:', error);
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenTitle
        title="Relatórios"
        subtitle="Visualize dados de períodos específicos"
      />

      <FeatureBanner {...FEATURE_BANNERS.reports} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setYm(m => addMonth(m.year, m.month, -1))}><Text style={[styles.nav, { color: theme.text }]}>{tr('prev')}</Text></TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{(new Date(ym.year, ym.month - 1, 1)).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { month: 'long' })} / {ym.year}</Text>
        <TouchableOpacity onPress={() => setYm(m => addMonth(m.year, m.month, +1))}><Text style={[styles.nav, { color: theme.text }]}>{tr('next')}</Text></TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: (theme.background === '#0B0B0B' ? '#FFC300' : '#111') }]} onPress={exportCSV}>
          <Text style={[styles.btnText, { color: theme.background === '#0B0B0B' ? '#111' : '#fff' }]}>{tr('export_csv')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#D90429' }]} onPress={handleDownloadPDF}>
          <Text style={styles.btnText}>{tr('export_pdf')}</Text>
        </TouchableOpacity>
      </View>

      {/* Botão WhatsApp - funciona em todas as plataformas */}
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: '#25D366', marginTop: 8 }]}
        onPress={handleShareWhatsApp}
      >
        <Text style={styles.btnText}>📱 Enviar via WhatsApp</Text>
      </TouchableOpacity>

      {/* Botão Relatório para Contador */}
      <AccountantReportButton year={ym.year} month={ym.month} />

      {(() => {
        const totals = totalsQ.data || { income_cents: 0, expense_cents: 0, balance_cents: 0 };
        const daysInMonth = new Date(ym.year, ym.month, 0).getDate();
        const avgIncome = Math.round(totals.income_cents / daysInMonth);
        const avgExpense = Math.round(totals.expense_cents / daysInMonth);
        const avgBalance = Math.round(totals.balance_cents / daysInMonth);
        return (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            <View style={{ borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 10 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{tr('income')}</Text>
              <Text style={{ color: '#16A34A' }}>{formatMoney(totals.income_cents)}</Text>
              <Text style={{ color: '#888', fontSize: 12 }}>Média/dia: {formatMoney(avgIncome)}</Text>
            </View>
            <View style={{ borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 10 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{tr('expense')}</Text>
              <Text style={{ color: '#D90429' }}>{formatMoney(totals.expense_cents)}</Text>
              <Text style={{ color: '#888', fontSize: 12 }}>Média/dia: {formatMoney(avgExpense)}</Text>
            </View>
            <View style={{ borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 10 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{tr('balance')}</Text>
              <Text style={{ color: totals.balance_cents < 0 ? '#D90429' : '#10B981' }}>{formatMoney(totals.balance_cents)}</Text>
              <Text style={{ color: '#888', fontSize: 12 }}>Média/dia: {formatMoney(avgBalance)}</Text>
            </View>
          </View>
        );
      })()}

      <Text style={{ color: theme.text }}>{tr('items')}: {txQ.data?.length || 0}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { fontSize: 24, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
