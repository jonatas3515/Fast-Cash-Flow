import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Rect, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { getMonthlyDailySeries, getMonthlyTotals, getTransactionsByMonth } from '../repositories/transactions';
import { getOrCreateSettings, DashboardSettings } from '../repositories/dashboard_settings';
import { addMonth, getCurrentYearMonth, monthNamePt } from '../utils/date';
import { formatCentsBRL } from '../utils/money';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, TextInput } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useSettings } from '../settings/SettingsProvider';

export default function MonthScreen() {
  const start = getCurrentYearMonth();
  const [ym, setYm] = React.useState(start);
  const { theme } = useThemeCtx();
  const { t, lang, formatMoney } = useI18n();
  const { settings } = useSettings();
  const [mmYYYY, setMmYYYY] = React.useState(''); // MM/YYYY

  const totalsQ = useQuery({
    queryKey: ['month-totals', ym.year, ym.month],
    queryFn: () => getMonthlyTotals(ym.year, ym.month),
  });

  const seriesQ = useQuery({
    queryKey: ['month-series', ym.year, ym.month],
    queryFn: () => getMonthlyDailySeries(ym.year, ym.month),
  });

  // Query para buscar configurações do dashboard
  const settingsQuery = useQuery({
    queryKey: ['dashboard-settings'],
    queryFn: async () => {
      try {
        const { getCurrentCompanyId } = await import('../lib/company');
        const companyId = await getCurrentCompanyId();
        if (!companyId) return null;
        return await getOrCreateSettings(companyId);
      } catch (error) {
        console.error('[MonthScreen] Erro ao carregar configurações:', error);
        return null;
      }
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      totalsQ.refetch();
      seriesQ.refetch();
    }, [ym.year, ym.month])
  );

  const incomeData = (seriesQ.data || []).map(d => ({ x: d.day, y: (d.income_cents || 0) / 100 }));
  const expenseData = (seriesQ.data || []).map(d => ({ x: d.day, y: (d.expense_cents || 0) / 100 }));

  // Cálculo de alertas
  const alert = React.useMemo(() => {
    const settings = settingsQuery.data;
    const totals = totalsQ.data;
    const current = getCurrentYearMonth();
    const isCurrentMonth = ym.year === current.year && ym.month === current.month;
    
    if (!settings || !totals || !isCurrentMonth) return null;
    
    // Alerta de saldo mensal negativo
    if (settings.alert_negative_balance && totals.balance_cents < 0) {
      return {
        message: `Atenção: seu saldo deste mês está negativo em ${formatMoney(Math.abs(totals.balance_cents))}`,
        color: '#D90429'
      };
    }
    
    return null;
  }, [settingsQuery.data, totalsQ.data, ym, formatMoney]);

  const goPrev = () => setYm(m => addMonth(m.year, m.month, -1));
  const goNext = () => setYm(m => addMonth(m.year, m.month, +1));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrev}><Text style={[styles.nav, { color: theme.text }]}>{t('prev')}</Text></TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{(new Date(ym.year, ym.month - 1, 1)).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { month: 'long' })} / {ym.year}</Text>
        <TouchableOpacity onPress={goNext}><Text style={[styles.nav, { color: theme.text }]}>{t('next')}</Text></TouchableOpacity>
      </View>

      {/* Banner de Alerta */}
      {alert && (
        <View style={{ backgroundColor: '#FEF2F2', borderColor: alert.color, borderWidth: 1, borderRadius: 8, padding: 12, marginHorizontal: 16, marginTop: 8 }}>
          <Text style={{ color: alert.color, fontWeight: '700', fontSize: 14 }}>⚠️ Alerta do Mês</Text>
          <Text style={{ color: alert.color, fontSize: 12, marginTop: 4 }}>{alert.message}</Text>
        </View>
      )}

      <View style={styles.cardRow}>
        <View style={[styles.card, { borderColor: '#16A34A', backgroundColor: theme.card }]}>
          <Text style={[styles.cardLabel, { color: theme.text }]}>{t('income')}</Text>
          <Text style={[styles.cardValue, { color: '#16A34A' }]}>
            {formatMoney(totalsQ.data?.income_cents || 0)}
          </Text>
        </View>
        <View style={[styles.card, { borderColor: '#D90429', backgroundColor: theme.card }]}>
          <Text style={[styles.cardLabel, { color: theme.text }]}>{t('expense')}</Text>
          <Text style={[styles.cardValue, { color: '#D90429' }]}>
            {formatMoney(totalsQ.data?.expense_cents || 0)}
          </Text>
        </View>
      </View>

      <View style={[styles.cardFull, { backgroundColor: theme.card }]}>
        <Text style={[styles.cardLabel, { color: theme.text }]}>{t('month_balance')}</Text>
        <Text style={[styles.cardValue, { color: (totalsQ.data?.balance_cents || 0) >= 0 ? '#16A34A' : '#D90429' }]}>
          {formatMoney(totalsQ.data?.balance_cents || 0)}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
          <TouchableOpacity onPress={async () => {
            let logoSrc = settings.logoUrl || '';
            if (logoSrc) {
              try {
                if (logoSrc.startsWith('file://')) {
                  const b64 = await FileSystem.readAsStringAsync(logoSrc, { encoding: 'base64' as any });
                  logoSrc = `data:image/png;base64,${b64}`;
                } else if (logoSrc.startsWith('http://') || logoSrc.startsWith('https://')) {
                  const baseDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
                  const tmp = `${baseDir}logo.png`;
                  const dl = await FileSystem.downloadAsync(logoSrc, tmp);
                  const b64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: 'base64' as any });
                  logoSrc = `data:image/png;base64,${b64}`;
                }
              } catch {}
            }
            const txs = await getTransactionsByMonth(ym.year, ym.month);
            const series = await getMonthlyDailySeries(ym.year, ym.month);
            const maxY = Math.max(1, ...series.map(s => Math.max(s.income_cents, s.expense_cents)))/100;
            const chartW = 640; const chartH = 220; const margin = 30;
            const days = Math.max(1, series.length || 31);
            const innerW = chartW - margin * 2;
            const step = innerW / days; const barW = Math.max(2, step * 0.4);
            const bars = series.map((s, i) => {
              const x = margin + i * step;
              const incomeH = maxY ? (s.income_cents/100) / maxY * (chartH - margin) : 0;
              const expenseH = maxY ? (s.expense_cents/100) / maxY * (chartH - margin) : 0;
              return `
                <rect x="${x}" y="${chartH - incomeH}" width="${barW}" height="${incomeH}" fill="#16A34A" />
                <rect x="${x + barW + 2}" y="${chartH - expenseH}" width="${barW}" height="${expenseH}" fill="#D90429" />`;
            }).join('');
            const rows = txs.map(tx => `
              <tr>
                <td>${tx.date} ${tx.time || ''}</td>
                <td>${tx.type === 'income' ? t('income') : t('expense')}</td>
                <td>${(tx.description || '').replace(/</g,'&lt;')}</td>
                <td>${(tx.category || '').replace(/</g,'&lt;')}</td>
                <td style="text-align:right">${formatMoney(tx.amount_cents || 0)}</td>
              </tr>`).join('');
            const html = `
              <html><head><meta charset='utf-8'/>
              <style>body{font-family:Arial,sans-serif;padding:16px}h1{font-size:18px;margin:0 0 12px 0}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;font-size:12px}th{background:#f3f4f6;text-align:left}.cards{display:flex;gap:12px;margin:10px 0}.card{border:1px solid #e5e7eb;border-radius:8px;padding:10px}</style></head>
              <body>
                <h1>${logoSrc ? `<img src='${logoSrc}' style='height:28px'/> ` : ''}${t('month')} — ${(new Date(ym.year, ym.month - 1, 1)).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { month: 'long' })} / ${ym.year}</h1>
                <div class='cards'>
                  <div class='card'><div><b>${t('income')}</b></div><div>${formatMoney(totalsQ.data?.income_cents || 0)}</div></div>
                  <div class='card'><div><b>${t('expense')}</b></div><div>${formatMoney(totalsQ.data?.expense_cents || 0)}</div></div>
                  <div class='card'><div><b>${t('balance')}</b></div><div>${formatMoney(totalsQ.data?.balance_cents || 0)}</div></div>
                </div>
                <div style='margin:12px 0'>
                  <svg width='${chartW}' height='${chartH}'>
                    <rect x='0' y='0' width='${chartW}' height='${chartH}' fill='#ffffff' />
                    ${bars}
                  </svg>
                </div>
                <table>
                  <thead><tr><th>${t('date_time')}</th><th>${t('income')}/${t('expense')}</th><th>${t('table_description')}</th><th>${t('table_category')}</th><th>${t('balance')}</th></tr></thead>
                  <tbody>${rows}</tbody>
                </table>
              </body></html>`;
            if (Platform.OS === 'web') {
              const w = window.open('', '_blank');
              if (w) { w.document.open(); w.document.write(html); w.document.close(); w.focus(); setTimeout(() => { w.print(); w.close(); }, 300); }
            } else {
              const file = await Print.printToFileAsync({ html });
              if (!file || !file.uri) { Alert.alert('Erro ao gerar PDF'); return; }
              if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
              else Alert.alert('PDF gerado', file.uri);
            }
          }} style={{ backgroundColor: '#D90429', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('export_pdf')}</Text>
          </TouchableOpacity>
        </View>
        {(() => {
          const w = 340, h = 200, pad = 28; const iw = w - pad*2, ih = h - pad*2;
          const days = Math.max(incomeData.length, expenseData.length);
          const maxY = Math.max(1, ...incomeData.map(d=>d.y), ...expenseData.map(d=>d.y));
          const barGroup = days > 0 ? iw / days : iw;
          const barW = Math.max(2, barGroup * 0.35);
          const sx = (i: number) => pad + i * barGroup;
          const sy = (v: number) => pad + ih - (v / maxY) * ih;
          return (
            <View style={{ borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 6 }}>
              <Svg width={w} height={h}>
                <SvgLine x1={pad} y1={pad} x2={pad} y2={pad+ih} stroke={theme.text} strokeWidth={1} />
                <SvgLine x1={pad} y1={pad+ih} x2={pad+iw} y2={pad+ih} stroke={theme.text} strokeWidth={1} />
                {incomeData.map((d, i) => (
                  <Rect key={`inc-${i}`} x={sx(i) - barW} y={sy(d.y)} width={barW} height={Math.max(1, pad+ih - sy(d.y))} fill="#16A34A" />
                ))}
                {expenseData.map((d, i) => (
                  <Rect key={`exp-${i}`} x={sx(i) + 2} y={sy(d.y)} width={barW} height={Math.max(1, pad+ih - sy(d.y))} fill="#D90429" />
                ))}
                <SvgText x={pad} y={16} fill={theme.text} fontSize="10">{t('income')}</SvgText>
                <SvgText x={pad+70} y={16} fill={theme.text} fontSize="10">{t('expense')}</SvgText>
              </Svg>
            </View>
          );
        })()}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <TextInput value={mmYYYY} onChangeText={setMmYYYY} placeholder={'MM/YYYY'} placeholderTextColor="#999" style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, color: theme.text, backgroundColor: theme.card, minWidth: 120 }} />
          <TouchableOpacity onPress={() => {
            const m = mmYYYY.trim();
            if (/^\d{2}\/\d{4}$/.test(m)) {
              const [mm, yyyy] = m.split('/');
              const mi = Math.max(1, Math.min(12, parseInt(mm, 10)));
              const yi = parseInt(yyyy, 10) || ym.year;
              setYm({ year: yi, month: mi });
            } else {
              Alert.alert('Formato inválido', 'Use MM/YYYY');
            }
          }} style={{ backgroundColor: '#16A34A', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Aplicar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { fontSize: 24, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700' },
  cardRow: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  cardLabel: { color: '#555', fontSize: 12 },
  cardValue: { fontSize: 18, fontWeight: '700' },
  cardFull: { borderWidth: 1, borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  chartFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
