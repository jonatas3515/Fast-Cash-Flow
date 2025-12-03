import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { addMonth, getCurrentYearMonth } from '../utils/date';
import { getTransactionsByMonth, getMonthlyDailySeries, getMonthlyTotals } from '../repositories/transactions';
import { formatCentsBRL } from '../utils/money';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Linking, Share } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useSettings } from '../settings/SettingsProvider';
import { useI18n } from '../i18n/I18nProvider';
import { useFocusEffect } from '@react-navigation/native';
import ScreenTitle from '../components/ScreenTitle';

export default function ReportsScreen() {
  const start = getCurrentYearMonth();
  const [ym, setYm] = React.useState(start);
  const { theme } = useThemeCtx();
  const { settings } = useSettings();
  const { t: tr, formatMoney, lang } = useI18n();

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
      ['id','type','date','time','description','category','amount_cents'],
      ...txs.map(t => [t.id, t.type, t.date, t.time || '', t.description || '', t.category || '', String(t.amount_cents || 0)]),
    ];
    const csv = rows.map(r => r.map(field => '"' + String(field).replace(/"/g, '""') + '"').join(',')).join('\n');
    const filename = `fast-cash-${ym.year}-${String(ym.month).padStart(2,'0')}.csv`;
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

  const exportPDF = async () => {
    if (Platform.OS === 'android') {
      Alert.alert(
        'Exportar PDF',
        'No Android, use o botão "Exportar CSV" para gerar relatórios. Em breve teremos a função PDF disponível!',
        [{ text: 'OK' }]
      );
      return;
    }

    // Código web continua igual
    const txs = txQ.data || [];
    const totals = await getMonthlyTotals(ym.year, ym.month);
    
    let logoSrc = settings.logoUrl || '';
    if (logoSrc.startsWith('file://')) {
      try {
        const b64 = await FileSystem.readAsStringAsync(logoSrc, { encoding: 'base64' as any });
        logoSrc = `data:image/png;base64,${b64}`;
      } catch {}
    }
    
    const rows = txs.map(tx => `
      <tr>
        <td>${tx.date} ${tx.time || ''}</td>
        <td>${tx.type === 'income' ? tr('income') : tr('expense')}</td>
        <td>${(tx.description || '').replace(/</g,'&lt;')}</td>
        <td>${(tx.category || '').replace(/</g,'&lt;')}</td>
        <td style="text-align:right">${formatMoney(tx.amount_cents || 0)}</td>
      </tr>`).join('');
    
    const daysInMonth = new Date(ym.year, ym.month, 0).getDate();
    const avgIncome = Math.round((totals.income_cents||0)/Math.max(1,daysInMonth));
    const avgExpense = Math.round((totals.expense_cents||0)/Math.max(1,daysInMonth));
    const avgBalance = Math.round((totals.balance_cents||0)/Math.max(1,daysInMonth));
    
    const html = `
      <html><head><meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; padding: 16px; }
        h1 { font-size: 20px; margin: 0 0 12px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 6px; font-size: 12px; }
        th { background: #f3f4f6; text-align: left; }
        .cards { display:flex; gap:12px; margin: 10px 0; }
        .card { border:1px solid #e5e7eb; border-radius:8px; padding:10px; }
      </style></head>
      <body>
        <h1>${logoSrc ? `<img src="${logoSrc}" style="height:56px" />` : ''} FAST CASH FLOW — ${(new Date(ym.year, ym.month - 1, 1)).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { month: 'long' })} / ${ym.year}</h1>
        <div class="cards">
          <div class="card"><div><b>${tr('income')}</b></div><div>${formatMoney(totals.income_cents)}</div><div style="color:#666;font-size:11px">Média/dia: ${formatMoney(avgIncome)}</div></div>
          <div class="card"><div><b>${tr('expense')}</b></div><div>${formatMoney(totals.expense_cents)}</div><div style="color:#666;font-size:11px">Média/dia: ${formatMoney(avgExpense)}</div></div>
          <div class="card"><div><b>${tr('balance')}</b></div><div>${formatMoney(totals.balance_cents)}</div><div style="color:#666;font-size:11px">Média/dia: ${formatMoney(avgBalance)}</div></div>
        </div>
        <table>
          <thead><tr><th>${tr('date_time')}</th><th>${tr('income')}/${tr('expense')}</th><th>${tr('table_description')}</th><th>${tr('table_category')}</th><th>${tr('balance')}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>`;
    
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); w.close(); }, 300);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <ScreenTitle 
        title="Relatórios" 
        subtitle="Visualize dados de períodos específicos" 
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setYm(m => addMonth(m.year, m.month, -1))}><Text style={[styles.nav, { color: theme.text }]}>{tr('prev')}</Text></TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{(new Date(ym.year, ym.month - 1, 1)).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { month: 'long' })} / {ym.year}</Text>
        <TouchableOpacity onPress={() => setYm(m => addMonth(m.year, m.month, +1))}><Text style={[styles.nav, { color: theme.text }]}>{tr('next')}</Text></TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: (theme.background === '#0B0B0B' ? '#FFC300' : '#111') }]} onPress={exportCSV}>
          <Text style={[styles.btnText, { color: theme.background === '#0B0B0B' ? '#111' : '#fff' }]}>{tr('export_csv')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#D90429' }]} onPress={exportPDF}>
          <Text style={styles.btnText}>{tr('export_pdf')}</Text>
        </TouchableOpacity>
      </View>

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
