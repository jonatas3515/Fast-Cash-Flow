import React from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import { getTransactionsByRange } from '../repositories/transactions';
import { listAllDebts } from '../repositories/debts';
import { formatCentsBRL } from '../utils/money';
import { listRecurringExpenses, RecurringExpense } from '../repositories/recurring_expenses';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useSettings } from '../settings/SettingsProvider';
import { getAdminAppCompanyId } from '../lib/company';
import Svg, { Rect, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { todayYMD } from '../utils/date';
import ScreenTitle from '../components/ScreenTitle';
const RNDateTimePicker: any = Platform.OS !== 'web' ? require('@react-native-community/datetimepicker').default : null;

function ymd(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s); }
function toDDMMYYYY(s: string) { return `${s.substring(8, 10)}/${s.substring(5, 7)}/${s.substring(0, 4)}`; }
function normalizeYMD(v: string) {
  if (ymd(v)) return v;
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  try {
    const d = new Date(v);
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    if (!isNaN(d.getTime())) return `${y}-${mm}-${dd}`;
  } catch { }
  return v;
}

function isTxFromRecurring(tx: any, recurring: RecurringExpense[]): boolean {
  if (!tx || tx.type !== 'expense') return false;
  const descTx = (tx.description || '').toLowerCase().trim();
  if (!descTx) return false;

  for (const rec of recurring) {
    const descRec = (rec.description || '').toLowerCase().trim();
    if (!descRec) continue;
    if (!(descTx.includes(descRec) || descRec.includes(descTx))) continue;

    const diff = Math.abs((tx.amount_cents || 0) - (rec.amount_cents || 0));
    const AMOUNT_TOLERANCE_PERCENT = 0.08;
    const MIN_TOLERANCE_CENTS = 200;
    const tolerance = Math.max(Math.round(rec.amount_cents * AMOUNT_TOLERANCE_PERCENT), MIN_TOLERANCE_CENTS);
    if (diff > tolerance) continue;

    const txDate = tx.date as string;
    if (rec.start_date && txDate < rec.start_date) continue;
    if (rec.end_date && txDate > rec.end_date) continue;

    return true;
  }

  return false;
}

async function classifyFixedVsVariableInRange(txs: any[]): Promise<{ fixed: number; variable: number }> {
  const recurring = await listRecurringExpenses();
  let exp = 0;
  let fixed = 0;

  for (const tx of txs) {
    if (tx.type !== 'expense') continue;
    const amount = tx.amount_cents || 0;
    exp += amount;
    if (isTxFromRecurring(tx, recurring)) {
      fixed += amount;
    }
  }

  const variable = Math.max(0, exp - fixed);
  return { fixed, variable };
}

export default function RangeScreen() {
  const { theme, mode } = useThemeCtx();
  const { t, formatMoney } = useI18n();
  const { settings } = useSettings();
  const navigation = useNavigation<any>();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [adminCompanyId, setAdminCompanyId] = React.useState<string | null>(null);
  const [start, setStart] = React.useState(todayYMD()); // YYYY-MM-DD
  const [end, setEnd] = React.useState(todayYMD()); // YYYY-MM-DD
  const [showStart, setShowStart] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(false);
  const valid = ymd(start) && ymd(end) && start <= end;

  React.useEffect(() => {
    (async () => {
      try {
        let role: string | null = null;
        if (Platform.OS === 'web') role = (window.localStorage.getItem('auth_role') || '').toLowerCase();
        else try { role = (await require('expo-secure-store').getItemAsync('auth_role')) || ''; } catch { }
        const admin = role === 'admin';
        setIsAdmin(admin);
        if (admin) {
          const cid = await getAdminAppCompanyId();
          setAdminCompanyId(cid);
        } else {
          setAdminCompanyId(null);
        }
      } catch { }
    })();
  }, []);

  const txQ = useQuery({
    queryKey: ['range', start, end],
    queryFn: () => valid ? getTransactionsByRange(start, end) : Promise.resolve([]),
  });

  const recurringQ = useQuery({
    queryKey: ['recurring-expenses-range'],
    queryFn: () => listRecurringExpenses(),
  });

  const debtsQ = useQuery({
    queryKey: ['admin-debts-overdue', adminCompanyId],
    enabled: isAdmin && !!adminCompanyId,
    queryFn: async () => {
      if (!adminCompanyId) return [] as any[];
      return await listAllDebts(adminCompanyId as string);
    },
  });

  let hasOverdueDebts = false;
  if (isAdmin && debtsQ.data && debtsQ.data.length > 0) {
    const today = todayYMD();
    for (const debt of debtsQ.data as any[]) {
      const total = debt.total_cents || 0;
      const paidCount = debt.paid_installments || 0;
      if (!total) continue;
      const baseDate = (debt as any).invoice_due_date || debt.start_date || '';
      const sParts = (baseDate || '').split('-').map((n: string) => parseInt(n, 10) || 0);
      const tParts = (today || '').split('-').map((n: string) => parseInt(n, 10) || 0);
      const monthsStart = sParts[0] * 12 + (sParts[1] - 1);
      const monthsToday = tParts[0] * 12 + (tParts[1] - 1);
      let elapsed = monthsToday - monthsStart;
      if (
        tParts[0] > sParts[0] ||
        (tParts[0] === sParts[0] && tParts[1] > sParts[1]) ||
        (tParts[0] === sParts[0] && tParts[1] === sParts[1] && tParts[2] > sParts[2])
      ) {
        elapsed = Math.max(0, elapsed + (tParts[2] > sParts[2] ? 1 : 0));
      }
      elapsed = Math.max(0, Math.min(debt.installment_count || 0, elapsed));
      if (elapsed > paidCount) {
        hasOverdueDebts = true;
        break;
      }
    }
  }

  const exportPDF = async () => {
    if (!valid) { Alert.alert('Intervalo inválido'); return; }
    const txs = txQ.data || [];
    const appDefaultLogo = 'https://i.im.ge/2025/11/03/nH0whJ.Logo-Black.png';
    let logoSrc = settings.logoUrl || appDefaultLogo;
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
      } catch { }
    }
    const { fixed: fixedExp, variable: variableExp } = await classifyFixedVsVariableInRange(txs as any[]);

    // Aggregate by day for a simple daily bar chart in the PDF
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of txs) {
      const cur = map.get(t.date) || { income: 0, expense: 0 };
      if (t.type === 'income') cur.income += t.amount_cents || 0; else cur.expense += t.amount_cents || 0;
      map.set(t.date, cur);
    }
    const daysSorted = Array.from(map.keys()).sort();
    const maxY = Math.max(1, ...daysSorted.map(d => Math.max((map.get(d)?.income || 0), (map.get(d)?.expense || 0)))) / 100;
    const chartW = 640; const chartH = 220; const margin = 30;
    const n = Math.max(1, daysSorted.length);
    const innerW = chartW - margin * 2; const step = innerW / n; const barW = Math.max(2, step * 0.35);
    const bars = daysSorted.map((d, i) => {
      const inc = (map.get(d)?.income || 0) / 100; const exp = (map.get(d)?.expense || 0) / 100;
      const x = margin + i * step; const incH = maxY ? inc / maxY * (chartH - margin) : 0; const expH = maxY ? exp / maxY * (chartH - margin) : 0;
      return `
        <rect x="${x}" y="${chartH - incH}" width="${barW}" height="${incH}" fill="#16A34A" />
        <rect x="${x + barW + 2}" y="${chartH - expH}" width="${barW}" height="${expH}" fill="#D90429" />`;
    }).join('');
    // Totals for PDF cards
    let incTot = 0, expTot = 0; txs.forEach(tx => tx.type === 'income' ? incTot += (tx.amount_cents || 0) : expTot += (tx.amount_cents || 0));
    const balTot = incTot - expTot;
    const daySpan = Math.max(1, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const avgInc = Math.round(incTot / Math.max(1, daySpan));
    const avgExp = Math.round(expTot / Math.max(1, daySpan));
    const avgBal = Math.round(balTot / Math.max(1, daySpan));

    const rows = txs.map((tx, index) => {
      // Descrição completa: se tiver clientname, adiciona * clientname
      const fullDescription = tx.clientname
        ? `${(tx.description || '').replace(/</g, '&lt;')} * ${(tx.clientname || '').replace(/</g, '&lt;')}`
        : (tx.description || '').replace(/</g, '&lt;');
      return `
      <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
        <td>${tx.date} ${tx.time || ''}</td>
        <td class="${tx.type === 'income' ? 'income' : 'expense'}">${tx.type === 'income' ? t('income') : t('expense')}</td>
        <td>${fullDescription}</td>
        <td>${(tx.category || '').replace(/</g, '&lt;')}</td>
        <td style="text-align:right" class="${tx.type === 'income' ? 'income' : 'expense'}">${formatMoney(tx.amount_cents || 0)}</td>
      </tr>`;
    }).join('');
    const html = `
      <html><head><meta charset='utf-8'/>
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 16px; color: #1f2937; }
        h1 { font-size: 18px; margin: 0 0 12px 0; display: flex; align-items: center; gap: 10px; color: #16A34A; }
        .dashboard-ref { text-align: center; color: #9ca3af; font-size: 11px; margin-bottom: 16px; padding: 8px; background: #f9fafb; border-radius: 6px; }
        .cards { display: flex; gap: 12px; margin: 10px 0; flex-wrap: wrap; }
        .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; flex: 1; min-width: 140px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .card b { color: #374151; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
        thead { position: sticky; top: 0; }
        th { background: linear-gradient(180deg, #1f2937 0%, #374151 100%); color: #fff; text-align: left; font-weight: 600; padding: 10px 8px; border: none; }
        th:first-child { border-radius: 8px 0 0 0; }
        th:last-child { border-radius: 0 8px 0 0; }
        td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
        tr.even { background: #ffffff; }
        tr.odd { background: #f9fafb; }
        tr:hover { background: #f0fdf4; }
        .income { color: #16A34A; font-weight: 600; }
        .expense { color: #DC2626; font-weight: 600; }
        .footer { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
      </style></head>
      <body>
        <h1>${logoSrc ? `<img src='${logoSrc}' style='height:56px'/> ` : ''}📊 Relatório ${toDDMMYYYY(start)} a ${toDDMMYYYY(end)}</h1>
        <div class="dashboard-ref">📈 Dados do seu dashboard Fast Cash Flow</div>
        <div class='cards'>
          <div class='card'><div><b>💰 ${t('income')}</b></div><div style="color:#16A34A;font-size:18px;font-weight:700">${formatMoney(incTot)}</div><div style='color:#666;font-size:11px'>Média/dia: ${formatMoney(avgInc)}</div></div>
          <div class='card'><div><b>💸 ${t('expense')}</b></div><div style="color:#D90429;font-size:18px;font-weight:700">${formatMoney(expTot)}</div><div style='color:#666;font-size:11px'>Média/dia: ${formatMoney(avgExp)}</div><div style='color:#b91c1c;font-size:11px;margin-top:4px'>Fixas: ${formatMoney(fixedExp)}</div><div style='color:#4b5563;font-size:11px'>Variáveis: ${formatMoney(variableExp)}</div></div>
          <div class='card'><div><b>💎 ${t('balance')}</b></div><div style="color:${balTot >= 0 ? '#16A34A' : '#D90429'};font-size:18px;font-weight:700">${formatMoney(balTot)}</div><div style='color:#666;font-size:11px'>Média/dia: ${formatMoney(avgBal)}</div></div>
        </div>
        <div style='margin:12px 0'>
          <svg width='${chartW}' height='${chartH}'>
            <rect x='0' y='0' width='${chartW}' height='${chartH}' fill='#ffffff' />
            ${bars}
          </svg>
        </div>
        <table>
          <thead><tr><th>📅 ${t('date_time')}</th><th>📊 Tipo</th><th>📝 ${t('table_description')}</th><th>🏷️ ${t('table_category')}</th><th style="text-align:right">💵 Valor</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">✅ Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} via Fast Cash Flow</div>
      </body></html>`;
    if (Platform.OS === 'web') {
      const win = window.open('', '_blank');
      if (win) { win.document.open(); win.document.write(html); win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 300); }
      return;
    }
    const file = await Print.printToFileAsync({ html });
    if (!file || !file.uri) { Alert.alert('Erro ao gerar PDF'); return; }
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
    else Alert.alert('PDF gerado', file.uri);
  };

  const sendWhatsApp = async () => {
    if (!valid) { Alert.alert('Intervalo inválido'); return; }
    // Reutiliza o MESMO HTML do exportPDF para garantir mesmo PDF
    await exportPDFToWhatsApp();
  };

  // helper para compartilhar o mesmo PDF no WhatsApp
  const exportPDFToWhatsApp = async () => {
    const txs = txQ.data || [];
    const appDefaultLogo = 'https://i.im.ge/2025/11/03/nH0whJ.Logo-Black.png';
    let logoSrc = settings.logoUrl || appDefaultLogo;
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
      } catch { }
    }
    const { fixed: fixedExp, variable: variableExp } = await classifyFixedVsVariableInRange(txs as any[]);

    // replicar cards e gráfico
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of txs) {
      const cur = map.get(t.date) || { income: 0, expense: 0 };
      if (t.type === 'income') cur.income += t.amount_cents || 0; else cur.expense += t.amount_cents || 0;
      map.set(t.date, cur);
    }
    const daysSorted = Array.from(map.keys()).sort();
    const maxY = Math.max(1, ...daysSorted.map(d => Math.max((map.get(d)?.income || 0), (map.get(d)?.expense || 0)))) / 100;
    const chartW = 640; const chartH = 220; const margin = 30;
    const n = Math.max(1, daysSorted.length);
    const innerW = chartW - margin * 2; const step = innerW / n; const barW = Math.max(2, step * 0.35);
    const bars = daysSorted.map((d, i) => {
      const inc = (map.get(d)?.income || 0) / 100; const exp = (map.get(d)?.expense || 0) / 100;
      const x = margin + i * step; const incH = maxY ? inc / maxY * (chartH - margin) : 0; const expH = maxY ? exp / maxY * (chartH - margin) : 0;
      return `
        <rect x="${x}" y="${chartH - incH}" width="${barW}" height="${incH}" fill="#16A34A" />
        <rect x="${x + barW + 2}" y="${chartH - expH}" width="${barW}" height="${expH}" fill="#D90429" />`;
    }).join('');
    let incTot = 0, expTot = 0; txs.forEach(tx => tx.type === 'income' ? incTot += (tx.amount_cents || 0) : expTot += (tx.amount_cents || 0));
    const balTot = incTot - expTot;
    const daySpan = Math.max(1, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const avgInc = Math.round(incTot / Math.max(1, daySpan));
    const avgExp = Math.round(expTot / Math.max(1, daySpan));
    const avgBal = Math.round(balTot / Math.max(1, daySpan));
    const rows = txs.map((tx, index) => {
      // Descrição completa: se tiver clientname, adiciona * clientname
      const fullDescription = tx.clientname
        ? `${(tx.description || '').replace(/</g, '&lt;')} * ${(tx.clientname || '').replace(/</g, '&lt;')}`
        : (tx.description || '').replace(/</g, '&lt;');
      return `
      <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
        <td>${tx.date} ${tx.time || ''}</td>
        <td class="${tx.type === 'income' ? 'income' : 'expense'}">${tx.type === 'income' ? t('income') : t('expense')}</td>
        <td>${fullDescription}</td>
        <td>${(tx.category || '').replace(/</g, '&lt;')}</td>
        <td style="text-align:right" class="${tx.type === 'income' ? 'income' : 'expense'}">${formatMoney(tx.amount_cents || 0)}</td>
      </tr>`;
    }).join('');
    const html = `
      <html><head><meta charset='utf-8'/>
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 16px; color: #1f2937; }
        h1 { font-size: 18px; margin: 0 0 12px 0; display: flex; align-items: center; gap: 10px; color: #16A34A; }
        .dashboard-ref { text-align: center; color: #9ca3af; font-size: 11px; margin-bottom: 16px; padding: 8px; background: #f9fafb; border-radius: 6px; }
        .cards { display: flex; gap: 12px; margin: 10px 0; flex-wrap: wrap; }
        .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; flex: 1; min-width: 140px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .card b { color: #374151; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
        thead { position: sticky; top: 0; }
        th { background: linear-gradient(180deg, #1f2937 0%, #374151 100%); color: #fff; text-align: left; font-weight: 600; padding: 10px 8px; border: none; }
        th:first-child { border-radius: 8px 0 0 0; }
        th:last-child { border-radius: 0 8px 0 0; }
        td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
        tr.even { background: #ffffff; }
        tr.odd { background: #f9fafb; }
        tr:hover { background: #f0fdf4; }
        .income { color: #16A34A; font-weight: 600; }
        .expense { color: #DC2626; font-weight: 600; }
        .footer { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
      </style></head>
      <body>
        <h1>${logoSrc ? `<img src='${logoSrc}' style='height:56px'/> ` : ''}📊 Relatório ${toDDMMYYYY(start)} a ${toDDMMYYYY(end)}</h1>
        <div class="dashboard-ref">📈 Dados do seu dashboard Fast Cash Flow</div>
        <div class='cards'>
          <div class='card'><div><b>💰 ${t('income')}</b></div><div style="color:#16A34A;font-size:18px;font-weight:700">${formatMoney(incTot)}</div><div style='color:#666;font-size:11px'>Média/dia: ${formatMoney(avgInc)}</div></div>
          <div class='card'><div><b>💸 ${t('expense')}</b></div><div style="color:#D90429;font-size:18px;font-weight:700">${formatMoney(expTot)}</div><div style='color:#666;font-size:11px'>Média/dia: ${formatMoney(avgExp)}</div></div>
          <div class='card'><div><b>💎 ${t('balance')}</b></div><div style="color:${balTot >= 0 ? '#16A34A' : '#D90429'};font-size:18px;font-weight:700">${formatMoney(balTot)}</div><div style='color:#666;font-size:11px'>Média/dia: ${formatMoney(avgBal)}</div></div>
        </div>
        <div style='margin:12px 0'>
          <svg width='${chartW}' height='${chartH}'>
            <rect x='0' y='0' width='${chartW}' height='${chartH}' fill='#ffffff' />
            ${bars}
          </svg>
        </div>
        <table>
          <thead><tr><th>📅 ${t('date_time')}</th><th>📊 Tipo</th><th>📝 ${t('table_description')}</th><th>🏷️ ${t('table_category')}</th><th style="text-align:right">💵 Valor</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">✅ Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} via Fast Cash Flow</div>
      </body></html>`;
    const file = await Print.printToFileAsync({ html });
    if (Platform.OS === 'web') {
      try {
        const resp = await fetch(file.uri);
        const blob = await resp.blob();
        const webFile = new File([blob], `relatorio-${start}-a-${end}.pdf`, { type: 'application/pdf' });
        // @ts-ignore
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [webFile] })) {
          // @ts-ignore
          await navigator.share({ files: [webFile], title: 'Relatório PDF', text: `Relatório ${toDDMMYYYY(start)} a ${toDDMMYYYY(end)}` });
          return;
        }
      } catch { }
      // Fallback: download o PDF (usuário anexa manualmente no WhatsApp Web)
      const a = document.createElement('a');
      a.href = file.uri; a.download = `relatorio-${start}-a-${end}.pdf`; a.click();
      return;
    }
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
    else Alert.alert('PDF gerado', file.uri);
  };

  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isMobileWeb = isWeb && typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '');
  const isWideWeb = isWeb && !isMobileWeb && width >= 1024;
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 140, padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <ScreenTitle
          title="Relatórios"
          subtitle="Visualize dados de períodos específicos"
        />
        {isAdmin && hasOverdueDebts && (
          <View style={{
            marginTop: 8,
            marginBottom: 4,
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#f97316',
            backgroundColor: '#fffbeb',
            gap: 8,
          }}>
            <Text style={{ color: '#b45309', fontWeight: '700', fontSize: 13 }}>
              ⚠️ Existem parcelas em atraso nas dívidas.
            </Text>
            <Text style={{ color: '#92400e', fontSize: 12 }}>
              Confirme os pagamentos das parcelas em atraso na aba Débitos para atualizar os valores de dívidas.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Débitos')}
              style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f97316' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Ir para a aba Débitos</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ width: '100%', gap: 16 }}>
          {/* SEÇÃO 1: Inputs de Data */}
          {Platform.OS === 'web' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ gap: 4, flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '600' }}>Início: {toDDMMYYYY(start)}</Text>
                {/* @ts-ignore */}
                <input type="date" value={start} onChange={(e: any) => setStart(normalizeYMD(e.target.value))} style={{ width: '100%', height: 44, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: (theme as any).card, color: theme.text, colorScheme: mode === 'dark' ? 'dark' : 'light', boxSizing: 'border-box', fontSize: 14 } as any} />
              </View>
              <Text style={{ color: theme.text, marginHorizontal: 8 }}>até</Text>
              <View style={{ gap: 4, flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '600' }}>Fim: {toDDMMYYYY(end)}</Text>
                {/* @ts-ignore */}
                <input type="date" value={end} onChange={(e: any) => setEnd(normalizeYMD(e.target.value))} style={{ width: '100%', height: 44, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: (theme as any).card, color: theme.text, colorScheme: mode === 'dark' ? 'dark' : 'light', boxSizing: 'border-box', fontSize: 14 } as any} />
              </View>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>Início: {toDDMMYYYY(start)}</Text>
                  {/* @ts-ignore */}
                  <input type="date" value={start} onChange={(e: any) => setStart(normalizeYMD(e.target.value))} style={{ width: '100%', height: 52, padding: 14, borderRadius: 10, border: '2px solid #ddd', background: (theme as any).card, color: theme.text, colorScheme: mode === 'dark' ? 'dark' : 'light', boxSizing: 'border-box', fontSize: 15 } as any} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>Fim: {toDDMMYYYY(end)}</Text>
                  {/* @ts-ignore */}
                  <input type="date" value={end} onChange={(e: any) => setEnd(normalizeYMD(e.target.value))} style={{ width: '100%', height: 52, padding: 14, borderRadius: 10, border: '2px solid #ddd', background: (theme as any).card, color: theme.text, colorScheme: mode === 'dark' ? 'dark' : 'light', boxSizing: 'border-box', fontSize: 15 } as any} />
                </View>
              </View>
            </View>
          )}

          {/* SEÇÃO 2: Botões PDF e WhatsApp */}
          {Platform.OS === 'web' ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={exportPDF} style={{ backgroundColor: valid ? '#0ea5e9' : '#999', paddingVertical: 14, borderRadius: 8, flex: 1, alignItems: 'center', minHeight: 48 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Baixar PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!valid} onPress={sendWhatsApp} style={{ backgroundColor: valid ? '#16A34A' : '#999', paddingVertical: 14, borderRadius: 8, flex: 1, alignItems: 'center', minHeight: 48 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Enviar WhatsApp</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={exportPDF} style={{ backgroundColor: valid ? '#0ea5e9' : '#999', paddingVertical: 16, borderRadius: 10, flex: 1, alignItems: 'center', minHeight: 54 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>📥 Baixar PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!valid} onPress={sendWhatsApp} style={{ backgroundColor: valid ? '#16A34A' : '#999', paddingVertical: 16, borderRadius: 10, flex: 1, alignItems: 'center', minHeight: 54 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>📤 WhatsApp</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Cards de Resumo */}
          {(() => {
            const txs = (txQ.data || []);
            let inc = 0, exp = 0;
            for (const tItem of txs) { if (tItem.type === 'income') inc += (tItem.amount_cents || 0); else exp += (tItem.amount_cents || 0); }
            const bal = inc - exp;
            const days = valid ? (Math.floor((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 1;
            const avgInc = Math.round(inc / Math.max(1, days));
            const avgExp = Math.round(exp / Math.max(1, days));
            const avgBal = Math.round(bal / Math.max(1, days));

            // Classificação fixa vs variável reaproveitando os recorrentes já carregados
            const recurring = (recurringQ.data || []) as RecurringExpense[];
            let fixedExp = 0;
            for (const tItem of txs) {
              if (tItem.type !== 'expense') continue;
              if (isTxFromRecurring(tItem, recurring)) {
                fixedExp += (tItem.amount_cents || 0);
              }
            }
            const variableExp = Math.max(0, exp - fixedExp);

            return Platform.OS === 'web' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' }}>
                <View style={{ borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 10, flex: 1, minWidth: 120 }}>
                  <Text style={{ color: theme.text, fontWeight: '700' }}>{t('income')}</Text>
                  <Text style={{ color: '#1D4ED8', fontSize: 18, fontWeight: '800' }}>{formatCentsBRL(inc)}</Text>
                  <Text style={{ color: '#888', fontSize: 12 }}>Média/dia: {formatCentsBRL(avgInc)}</Text>
                </View>
                <View style={{ borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 10, flex: 1, minWidth: 120 }}>
                  <Text style={{ color: theme.text, fontWeight: '700' }}>{t('expense')}</Text>
                  <Text style={{ color: '#D90429', fontSize: 18, fontWeight: '800' }}>{formatCentsBRL(exp)}</Text>
                  <Text style={{ color: '#888', fontSize: 12 }}>Média/dia: {formatCentsBRL(avgExp)}</Text>
                  <Text style={{ color: '#b91c1c', fontSize: 11, marginTop: 4 }}>Fixas: {formatCentsBRL(fixedExp)}</Text>
                  <Text style={{ color: '#4b5563', fontSize: 11 }}>Variáveis: {formatCentsBRL(variableExp)}</Text>
                </View>
                <View style={{ borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 10, flex: 1, minWidth: 120 }}>
                  <Text style={{ color: theme.text, fontWeight: '700' }}>{t('balance')}</Text>
                  <Text style={{ color: bal >= 0 ? '#16A34A' : '#D90429', fontSize: 18, fontWeight: '800' }}>{formatCentsBRL(bal)}</Text>
                  <Text style={{ color: '#888', fontSize: 12 }}>Média/dia: {formatCentsBRL(avgBal)}</Text>
                </View>
              </View>
            ) : (
              <View style={{ gap: 12, width: '100%' }}>
                {/* CARD ENTRADAS - LARGURA TOTAL */}
                <View style={{ width: '100%', borderWidth: 1, borderColor: '#1D4ED8', borderRadius: 12, padding: 16, backgroundColor: '#DBEAFE' }}>
                  <Text style={{ color: '#1D4ED8', fontWeight: '700', fontSize: 14 }}>📈 {t('income')}</Text>
                  <Text style={{ color: '#1D4ED8', fontSize: 26, fontWeight: '800', marginTop: 8 }}>{formatCentsBRL(inc)}</Text>
                  <Text style={{ color: '#1e40af', fontSize: 13, marginTop: 4 }}>Média/dia: {formatCentsBRL(avgInc)}</Text>
                </View>

                {/* CARD SAÍDAS - LARGURA TOTAL */}
                <View style={{ width: '100%', borderWidth: 1, borderColor: '#D90429', borderRadius: 12, padding: 16, backgroundColor: '#fee2e2' }}>
                  <Text style={{ color: '#991b1b', fontWeight: '700', fontSize: 14 }}>📉 {t('expense')}</Text>
                  <Text style={{ color: '#D90429', fontSize: 26, fontWeight: '800', marginTop: 8 }}>{formatCentsBRL(exp)}</Text>
                  <Text style={{ color: '#991b1b', fontSize: 13, marginTop: 4 }}>Média/dia: {formatCentsBRL(avgExp)}</Text>
                  <Text style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>Fixas: {formatCentsBRL(fixedExp)}</Text>
                  <Text style={{ color: '#4b5563', fontSize: 12 }}>Variáveis: {formatCentsBRL(variableExp)}</Text>
                </View>

                {/* CARD SALDO - LARGURA TOTAL */}
                <View style={{
                  width: '100%',
                  borderWidth: 1,
                  borderColor: bal >= 0 ? '#16A34A' : '#D90429',
                  borderRadius: 12,
                  padding: 16,
                  backgroundColor: bal >= 0 ? '#dcfce7' : '#fee2e2'
                }}>
                  <Text style={{ color: bal >= 0 ? '#166534' : '#991b1b', fontWeight: '700', fontSize: 14 }}>💰 {t('balance')}</Text>
                  <Text style={{ color: bal >= 0 ? '#16A34A' : '#D90429', fontSize: 26, fontWeight: '800', marginTop: 8 }}>{formatCentsBRL(bal)}</Text>
                  <Text style={{ color: bal >= 0 ? '#166534' : '#991b1b', fontSize: 13, marginTop: 4 }}>Média/dia: {formatCentsBRL(avgBal)}</Text>
                </View>
              </View>
            );
          })()}

          {(() => {
            const txs = (txQ.data || []);
            const map = new Map<string, { income: number; expense: number }>();
            for (const tItem of txs) {
              const v = map.get(tItem.date) || { income: 0, expense: 0 };
              if (tItem.type === 'income') v.income += tItem.amount_cents || 0; else v.expense += tItem.amount_cents || 0;
              map.set(tItem.date, v);
            }
            const daysA = Array.from(map.keys()).sort();
            const dataInc = daysA.map(d => (map.get(d)?.income || 0) / 100);
            const dataExp = daysA.map(d => (map.get(d)?.expense || 0) / 100);
            const screenWidth = width;
            const n = Math.max(1, daysA.length);

            // Largura dinâmica: cada barra tem no mínimo 40px, garantindo scroll horizontal
            const minBarWidth = 40;
            const barSpacing = 8;
            const barGroupWidth = minBarWidth + barSpacing;
            const h = Platform.OS === 'web' ? 220 : 280;
            const pad = 28;

            // Largura total do gráfico baseada no número de dias
            const dynamicWidth = Math.max(screenWidth - 32, n * barGroupWidth + pad * 2);
            const w = dynamicWidth;
            const iw = w - pad * 2, ih = h - pad * 2;

            const group = iw / n;
            const barW = Math.max(12, Math.min(group * 0.4, 32));
            const maxY = Math.max(1, ...dataInc, ...dataExp);
            const sx = (i: number) => pad + i * group;
            const sy = (v: number) => pad + ih - (v / maxY) * ih;

            return (
              <View style={{ borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: Platform.OS === 'web' ? 6 : 12, width: '100%' }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: Platform.OS === 'web' ? 14 : 16, marginBottom: 12 }}>
                  📊 Fluxo diário (Entradas x Saídas)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
                  <Svg width={w} height={h}>
                    <SvgLine x1={pad} y1={pad} x2={pad} y2={pad + ih} stroke={theme.text} strokeWidth={1} />
                    <SvgLine x1={pad} y1={pad + ih} x2={pad + iw} y2={pad + ih} stroke={theme.text} strokeWidth={1} />
                    {dataInc.map((v, i) => (
                      <Rect key={`inc-${i}`} x={sx(i) - barW} y={sy(v)} width={barW} height={Math.max(1, pad + ih - sy(v))} fill="#16A34A" />
                    ))}
                    {dataExp.map((v, i) => (
                      <Rect key={`exp-${i}`} x={sx(i) + 2} y={sy(v)} width={barW} height={Math.max(1, pad + ih - sy(v))} fill="#D90429" />
                    ))}
                    {/* Labels dos dias */}
                    {daysA.map((day, i) => {
                      const dayLabel = day.substring(8, 10); // Apenas o dia (DD)
                      return (
                        <SvgText
                          key={`day-${i}`}
                          x={sx(i)}
                          y={pad + ih + 16}
                          fill={theme.text}
                          fontSize="9"
                          textAnchor="middle"
                        >
                          {dayLabel}
                        </SvgText>
                      );
                    })}
                    <SvgText x={pad} y={16} fill={theme.text} fontSize="10">{t('income')}</SvgText>
                    <SvgText x={pad + 70} y={16} fill={theme.text} fontSize="10">{t('expense')}</SvgText>
                  </Svg>
                </ScrollView>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: '#16A34A', fontSize: Platform.OS === 'web' ? 14 : 16 }}>●</Text>
                    <Text style={{ color: theme.text, fontSize: Platform.OS === 'web' ? 12 : 14 }}>Entradas</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: '#D90429', fontSize: Platform.OS === 'web' ? 14 : 16 }}>●</Text>
                    <Text style={{ color: theme.text, fontSize: Platform.OS === 'web' ? 12 : 14 }}>Saídas</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* SEÇÃO 5: Lista de Transações */}
          <View style={{ width: '100%' }}>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: Platform.OS === 'web' ? 14 : 16, marginBottom: 12 }}>
              📋 Transações do período
            </Text>
            {isWideWeb ? (
              <FlatList
                style={{}}
                data={txQ.data || []}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                scrollEnabled
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#374151', borderRadius: 8, padding: 12, backgroundColor: theme.card }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{item.date} • {item.time || ''}</Text>
                      <Text style={{ color: theme.text, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{item.description || ''}</Text>
                      <Text style={{ color: '#888', fontSize: 11, marginTop: 2 }} numberOfLines={1}>{item.category || '—'}</Text>
                    </View>
                    <Text style={{ fontWeight: '800', fontSize: 16, color: item.type === 'income' ? '#16A34A' : '#D90429' }}>{formatCentsBRL(item.amount_cents || 0)}</Text>
                  </View>
                )}
              />
            ) : (
              <View style={{ gap: 10 }}>
                {(txQ.data || []).map((item) => (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#374151', borderRadius: 10, padding: 14, backgroundColor: theme.card }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{item.date} • {item.time || ''}</Text>
                      <Text style={{ color: theme.text, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{item.description || ''}</Text>
                      <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }} numberOfLines={1}>{item.category || '—'}</Text>
                    </View>
                    <Text style={{ fontWeight: '800', fontSize: 18, color: item.type === 'income' ? '#16A34A' : '#D90429' }}>{formatCentsBRL(item.amount_cents || 0)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
