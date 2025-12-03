import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import Svg, { Path, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { getTransactionsByRange, getWeeklyTotals } from '../repositories/transactions';
import { addDays, dateToYMD, startOfWeekSunday, todayYMD, ymdToDate } from '../utils/date';
import { formatCentsBRL } from '../utils/money';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../i18n/I18nProvider';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useSettings } from '../settings/SettingsProvider';

export default function WeekScreen() {
  const [start, setStart] = React.useState(startOfWeekSunday(todayYMD()));
  const end = addDays(start, 6);
  const { theme } = useThemeCtx();
  const { t, formatMoney } = useI18n();
  const [customWeekStart, setCustomWeekStart] = React.useState<string>(''); // dd/mm/aaaa
  const { settings } = useSettings();
  const isCustomEmpty = customWeekStart.trim() === '';
  const isCustomValid = /^\d{2}\/\d{2}\/\d{4}$/.test(customWeekStart);
  const ddmmyyyyToYmd = (s: string): string => {
    const [dd, mm, yyyy] = s.split('/');
    return `${yyyy}-${mm}-${dd}`;
  };
  const ymdToDDMMYYYY = (s: string): string => {
    return `${s.substring(8,10)}/${s.substring(5,7)}/${s.substring(0,4)}`;
  };

  const totalsQ = useQuery({
    queryKey: ['week-totals', start],
    queryFn: () => getWeeklyTotals(start, end),
  });

  const seriesQ = useQuery({
    queryKey: ['week-series', start],
    queryFn: async () => {
      const txs = await getTransactionsByRange(start, end);
      const map = new Map<string, { income: number; expense: number }>();
      for (const t of txs) {
        const cur = map.get(t.date) || { income: 0, expense: 0 };
        if (t.type === 'income') cur.income += t.amount_cents || 0; else cur.expense += t.amount_cents || 0;
        map.set(t.date, cur);
      }
      const points = [] as { x: number; income: number; expense: number; balance: number }[];
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const v = map.get(d) || { income: 0, expense: 0 };
        const income = (v.income || 0) / 100;
        const expense = (v.expense || 0) / 100;
        points.push({ x: i + 1, income, expense, balance: income - expense });
      }
      return points;
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      totalsQ.refetch();
      seriesQ.refetch();
    }, [start])
  );

  const goPrev = () => setStart(s => addDays(s, -7));
  const goNext = () => setStart(s => addDays(s, +7));
  const applyCustomStart = () => {
    if (isCustomValid) setStart(ddmmyyyyToYmd(customWeekStart));
  };

  const exportPDF = async () => {
    const rangeStart = isCustomValid ? ddmmyyyyToYmd(customWeekStart) : start;
    const rangeEnd = addDays(rangeStart, 6);
    const txs = await getTransactionsByRange(rangeStart, rangeEnd);
    const totals = await getWeeklyTotals(rangeStart, rangeEnd);
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
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of txs) {
      const cur = map.get(t.date) || { income: 0, expense: 0 };
      if (t.type === 'income') cur.income += t.amount_cents || 0; else cur.expense += t.amount_cents || 0;
      map.set(t.date, cur);
    }
    const points = [] as { x: number; income: number; expense: number; balance: number }[];
    for (let i = 0; i < 7; i++) {
      const d = addDays(rangeStart, i);
      const v = map.get(d) || { income: 0, expense: 0 };
      const income = (v.income || 0) / 100;
      const expense = (v.expense || 0) / 100;
      points.push({ x: i + 1, income, expense, balance: income - expense });
    }
    const w = 640, h = 220, m = 30, innerW = w - m * 2, innerH = h - m;
    const maxV = Math.max(1, ...points.flatMap(p => [p.income, p.expense, Math.abs(p.balance)]));
    const step = innerW / (points.length - 1 || 1);
    const toY = (v: number) => h - (v / maxV) * innerH;
    const pathFor = (values: number[]) => values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${m + i * step} ${toY(v)}`).join(' ');
    const lineIncome = pathFor(points.map(p => p.income));
    const lineExpense = pathFor(points.map(p => p.expense));
    const lineBalance = pathFor(points.map(p => p.balance));
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
        <h1>${logoSrc ? `<img src='${logoSrc}' style='height:28px'/> ` : ''}${t('week')} ${ymdToDDMMYYYY(rangeStart)} a ${ymdToDDMMYYYY(rangeEnd)}</h1>
        <div class='cards'>
          <div class='card'><div><b>${t('income')}</b></div><div>${formatMoney(totals.income_cents)}</div></div>
          <div class='card'><div><b>${t('expense')}</b></div><div>${formatMoney(totals.expense_cents)}</div></div>
          <div class='card'><div><b>${t('balance')}</b></div><div>${formatMoney(totals.balance_cents)}</div></div>
        </div>
        <div style='margin:12px 0'>
          <svg width='${w}' height='${h}'>
            <rect x='0' y='0' width='${w}' height='${h}' fill='#ffffff' />
            <path d='${lineIncome}' stroke='#16A34A' stroke-width='2' fill='none' />
            <path d='${lineExpense}' stroke='#D90429' stroke-width='2' fill='none' />
            <path d='${lineBalance}' stroke='#111' stroke-width='2' fill='none' />
          </svg>
        </div>
        <table>
          <thead><tr><th>${t('date_time')}</th><th>${t('income')}/${t('expense')}</th><th>${t('table_description')}</th><th>${t('table_category')}</th><th>${t('balance')}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>`;
    if (Platform.OS === 'web') {
      const win = window.open('', '_blank');
      if (win) { win.document.open(); win.document.write(html); win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 300); }
    } else {
      const file = await Print.printToFileAsync({ html });
      if (!file || !file.uri) { Alert.alert('Erro ao gerar PDF'); return; }
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
      else Alert.alert('PDF gerado', file.uri);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }] }>
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrev}><Text style={[styles.nav, { color: theme.text }]}>{t('prev')}</Text></TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{t('week')} {`${String(start).substring(8,10)}/${String(start).substring(5,7)}/${String(start).substring(0,4)}`} a {`${String(end).substring(8,10)}/${String(end).substring(5,7)}/${String(end).substring(0,4)}`}</Text>
        <TouchableOpacity onPress={goNext}><Text style={[styles.nav, { color: theme.text }]}>{t('next')}</Text></TouchableOpacity>
      </View>

      <View style={styles.cards}>
        <View style={[styles.card, { borderColor: '#16A34A', backgroundColor: theme.card }]}>
          <Text style={[styles.label, { color: theme.text }]}>{t('income')}</Text>
          <Text style={[styles.value, { color: '#16A34A' }]}>{formatMoney(totalsQ.data?.income_cents || 0)}</Text>
        </View>
        <View style={[styles.card, { borderColor: '#D90429', backgroundColor: theme.card }]}>
          <Text style={[styles.label, { color: theme.text }]}>{t('expense')}</Text>
          <Text style={[styles.value, { color: '#D90429' }]}>{formatMoney(totalsQ.data?.expense_cents || 0)}</Text>
        </View>
      </View>

      <View style={[styles.cardFull, { backgroundColor: theme.card }]}>
        <Text style={[styles.label, { color: theme.text }]}>{t('balance')} ({t('daily_average')})</Text>
        <Text style={[styles.value, { color: (totalsQ.data?.balance_cents || 0) >= 0 ? '#16A34A' : '#D90429' }]}>
          {formatMoney(totalsQ.data?.balance_cents || 0)} • Média: {formatMoney(totalsQ.data?.avg_daily_cents || 0)}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput value={customWeekStart} onChangeText={setCustomWeekStart} placeholder={'DD/MM/AAAA'} placeholderTextColor="#999" style={{ borderWidth: 1, borderColor: (!isCustomEmpty && !isCustomValid) ? '#EF4444' : '#ddd', borderRadius: 8, padding: 8, color: theme.text, backgroundColor: theme.card, minWidth: 170 }} />
            <TouchableOpacity disabled={!isCustomValid} onPress={applyCustomStart} style={{ backgroundColor: isCustomValid ? '#16A34A' : '#999', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Aplicar</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={!isCustomEmpty && !isCustomValid} onPress={exportPDF} style={{ backgroundColor: (!isCustomEmpty && !isCustomValid) ? '#999' : '#D90429', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{t('export_pdf')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {(() => {
          const pts = (seriesQ.data || []) as Array<{ x: number; income: number; expense: number; balance: number }>;
          const w = 340, h = 170, pad = 24; const iw = w - pad*2, ih = h - pad*2;
          const maxY = Math.max(1, ...pts.map(p => Math.max(p.income, p.expense, p.balance)));
          const sx = (i: number) => pad + (i/(Math.max(1, pts.length-1))) * iw;
          const sy = (v: number) => pad + ih - (v/maxY) * ih;
          const toPath = (arr: number[], key: 'income'|'expense'|'balance') => {
            return arr.map((_,i) => `${i===0?'M':'L'}${sx(i)},${sy(pts[i][key])}`).join(' ');
          };
          const inc = toPath(new Array(pts.length).fill(0),'income');
          const exp = toPath(new Array(pts.length).fill(0),'expense');
          const bal = toPath(new Array(pts.length).fill(0),'balance');
          return (
            <View style={{ borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 6 }}>
              <Svg width={w} height={h}>
                <SvgLine x1={pad} y1={pad} x2={pad} y2={pad+ih} stroke={theme.text} strokeWidth={1} />
                <SvgLine x1={pad} y1={pad+ih} x2={pad+iw} y2={pad+ih} stroke={theme.text} strokeWidth={1} />
                <Path d={inc} stroke="#16A34A" strokeWidth={2} fill="none" />
                <Path d={exp} stroke="#D90429" strokeWidth={2} fill="none" />
                <Path d={bal} stroke={theme.text} strokeWidth={1.5} fill="none" />
                <SvgText x={pad} y={14} fill={theme.text} fontSize="10">{t('income')}</SvgText>
                <SvgText x={pad+70} y={14} fill={theme.text} fontSize="10">{t('expense')}</SvgText>
                <SvgText x={pad+140} y={14} fill={theme.text} fontSize="10">{t('balance')}</SvgText>
              </Svg>
            </View>
          );
        })()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { fontSize: 24, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700' },
  cards: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  label: { color: '#555', fontSize: 12 },
  value: { fontSize: 16, fontWeight: '700' },
  cardFull: { borderWidth: 1, borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
