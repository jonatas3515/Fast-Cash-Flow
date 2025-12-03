import React from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ScrollView, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { todayYMD } from '../utils/date';
import { formatCentsBRL, parseBRLToCents, maskBRLInput } from '../utils/money';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useToast } from '../ui/ToastProvider';
import { useI18n } from '../i18n/I18nProvider';
import { listDebtsByDate, listAllDebts, createDebt as createDebtRepo, updateDebt as updateDebtRepo, deleteDebt as deleteDebtRepo, CreateDebtInput } from '../repositories/debts';
import { getOrCreateSettings, DashboardSettings } from '../repositories/dashboard_settings';
import { getCurrentCompanyId, getAdminAppCompanyId } from '../lib/company';
import { supabase } from '../lib/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useSettings } from '../settings/SettingsProvider';
import ScreenTitle from '../components/ScreenTitle';

interface Debt {
  id: string;
  description: string;
  total_cents: number;
  installment_count: number;
  installment_cents: number;
  start_date: string; // YYYY-MM-DD (data da compra)
  end_date: string; // YYYY-MM-DD
  paid_installments: number;
  invoice_due_date?: string | null; // data de vencimento da fatura
  created_at: string;
}

function ymdToParts(ymd: string) {
  const [y, m, d] = (ymd || '').split('-').map(Number);
  return { y: y || 0, m: m || 1, d: d || 1 };
}

function calcElapsedInstallments(startYMD: string, today: string, totalCount: number) {
  if (!startYMD || !/^\d{4}-\d{2}-\d{2}$/.test(startYMD) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return 0;
  const s = ymdToParts(startYMD);
  const t = ymdToParts(today);
  const months = (t.y * 12 + (t.m - 1)) - (s.y * 12 + (s.m - 1));
  let elapsed = months;
  if (t.y > s.y || (t.y === s.y && t.m > s.m) || (t.y === s.y && t.m === s.m && t.d >= s.d)) {
    // Count current month installment if we've reached the same day-of-month or past it
    elapsed = Math.max(0, months + (t.d >= s.d ? 1 : 0));
  }
  // Clamp between 0 and totalCount
  return Math.max(0, Math.min(totalCount, elapsed));
}

export default function DebtsScreen() {
  const qc = useQueryClient();
  const { theme, mode } = useThemeCtx();
  const toast = useToast();
  const { t, formatMoney } = useI18n();
  const { settings } = useSettings();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width >= 1024;
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(null);
  const [adminCompanyId, setAdminCompanyId] = React.useState<string | null>(null);
  const companiesQ = useQuery({
    queryKey: ['all-companies'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id,name,username,deleted_at')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error; return data || [];
    }
  });

  const updatePaidInstallmentsMut = useMutation({
    mutationFn: async ({ id, paid_installments }: { id: string; paid_installments: number }) => {
      const companyId = isAdmin
        ? (selectedCompanyId || adminCompanyId || await getAdminAppCompanyId())
        : await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');
      return await updateDebtRepo(companyId, id, { paid_installments });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
    },
    onError: (e: any) => toast.show(`Erro ao atualizar parcelas: ${e?.message || ''}`.trim(), 'error'),
  });

  React.useEffect(() => {
    (async () => {
      try {
        let role: string | null = null;
        if (Platform.OS === 'web') role = (window.sessionStorage.getItem('auth_role') || '').toLowerCase();
        else try { role = (await require('expo-secure-store').getItemAsync('auth_role')) || ''; } catch {}
        const admin = role === 'admin';
        setIsAdmin(admin);
        let adminId = await getAdminAppCompanyId();
        setAdminCompanyId(adminId);
        if (!admin) {
          const cid = await getCurrentCompanyId();
          setSelectedCompanyId(cid);
        } else {
          // Por padrão, admin inicia na empresa administradora (fastcashflow)
          if (adminId) setSelectedCompanyId(adminId);
        }
      } catch {}
    })();
  }, []);

  const [description, setDescription] = React.useState('');
  const [totalAmount, setTotalAmount] = React.useState('');
  const [installmentCount, setInstallmentCount] = React.useState('');
  const [installmentAmount, setInstallmentAmount] = React.useState('');
  const [startDate, setStartDate] = React.useState(todayYMD());
  const [invoiceDueDay, setInvoiceDueDay] = React.useState('');
  const [invoiceDueMonth, setInvoiceDueMonth] = React.useState('');
  const [editVisible, setEditVisible] = React.useState(false);
  const [editing, setEditing] = React.useState<Debt | null>(null);
  const listCompanyId = isAdmin ? (selectedCompanyId || adminCompanyId) : selectedCompanyId;
  const canEdit = !isAdmin || !!selectedCompanyId || !!adminCompanyId;
  const [blockedMsg, setBlockedMsg] = React.useState<string | null>(null);
  const canToggleInstallments = !isAdmin || (!!selectedCompanyId && !!adminCompanyId && selectedCompanyId === adminCompanyId);
  const canManageDebtActions = canToggleInstallments;

  // Block non-admin users if their company is deleted (soft delete)
  React.useEffect(() => {
    (async () => {
      try {
        if (isAdmin) { setBlockedMsg(null); return; }
        const cid = await getCurrentCompanyId();
        if (!cid) { setBlockedMsg(null); return; }
        const { data } = await supabase
          .from('companies')
          .select('deleted_at')
          .eq('id', cid)
          .maybeSingle();
        if (data?.deleted_at) {
          const del = new Date(data.deleted_at);
          const days = Math.max(0, 90 - Math.floor((Date.now() - del.getTime()) / (1000*60*60*24)));
          setBlockedMsg(`Empresa bloqueada. Entre em contato para regularizar. Restam ${days} dia${days===1?'':'s'} para exclusão definitiva.`);
        } else {
          setBlockedMsg(null);
        }
      } catch { setBlockedMsg(null); }
    })();
  }, [isAdmin]);

  const debtsQuery = useQuery({
    queryKey: ['debts', isAdmin ? (listCompanyId || 'admin-app') : 'self'],
    queryFn: async () => {
      let companyId: string | null = null;
      if (isAdmin) {
        companyId = listCompanyId || await getAdminAppCompanyId();
      } else {
        companyId = await getCurrentCompanyId();
      }
      if (!companyId) return [] as Debt[];
      return await listAllDebts(companyId) as unknown as Debt[];
    },
    enabled: true,
  });

  // Query para buscar configurações do dashboard
  const settingsQuery = useQuery({
    queryKey: ['dashboard-settings'],
    queryFn: async () => {
      try {
        const companyId = isAdmin
          ? (selectedCompanyId || adminCompanyId || await getAdminAppCompanyId())
          : await getCurrentCompanyId();
        if (!companyId) return null;
        return await getOrCreateSettings(companyId);
      } catch (error) {
        console.error('[DebtsScreen] Erro ao carregar configurações:', error);
        return null;
      }
    },
  });

  const createMut = useMutation({
    mutationFn: async (payload: CreateDebtInput) => {
      const companyId = isAdmin
        ? (selectedCompanyId || adminCompanyId || await getAdminAppCompanyId())
        : await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');
      return await createDebtRepo(companyId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      setDescription('');
      setTotalAmount('');
      setInstallmentCount('');
      setInstallmentAmount('');
      setInvoiceDueDay('');
      setInvoiceDueMonth('');
      toast.show('Dívida cadastrada', 'success');
    },
    onError: (e: any) => toast.show(`Erro ao cadastrar dívida: ${e?.message || ''}`.trim(), 'error'),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateDebtInput> }) => {
      const companyId = isAdmin
        ? (selectedCompanyId || adminCompanyId || await getAdminAppCompanyId())
        : await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');
      return await updateDebtRepo(companyId, id, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      setEditVisible(false);
      setEditing(null);
      toast.show('Dívida atualizada', 'success');
    },
    onError: (e: any) => toast.show(`Erro ao atualizar dívida: ${e?.message || ''}`.trim(), 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const companyId = isAdmin
        ? (selectedCompanyId || adminCompanyId || await getAdminAppCompanyId())
        : await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');
      return await deleteDebtRepo(companyId, id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      toast.show('Dívida excluída', 'success');
    },
    onError: (e: any) => toast.show(`Erro ao excluir dívida: ${e?.message || ''}`.trim(), 'error'),
  });

  const handleCreate = () => {
    if (!description || !totalAmount || !installmentCount || !startDate || !invoiceDueDay || !invoiceDueMonth) {
      Alert.alert('Preencha todos os campos');
      return;
    }
    const dueDay = parseInt(invoiceDueDay.replace(/\D/g, ''), 10);
    const dueMonth = parseInt(invoiceDueMonth.replace(/\D/g, ''), 10);
    if (!dueDay || dueDay < 1 || dueDay > 31) {
      Alert.alert('Dia de vencimento inválido', 'Informe um dia de vencimento entre 1 e 31');
      return;
    }
    if (!dueMonth || dueMonth < 1 || dueMonth > 12) {
      Alert.alert('Mês de vencimento inválido', 'Informe um mês de vencimento entre 1 e 12');
      return;
    }
    const totalCents = parseBRLToCents(totalAmount);
    const installments = parseInt(installmentCount, 10);
    const installmentCents = Math.round(totalCents / installments);
    const endTmp = new Date(startDate);
    endTmp.setMonth(endTmp.getMonth() + (installments - 1));
    const endDate = endTmp.toISOString().split('T')[0];

    const { y: startY, m: startM } = ymdToParts(startDate);
    let firstYear = startY || new Date().getFullYear();
    if (dueMonth < startM) firstYear += 1; // se o mês da primeira cobrança é antes do mês da compra, assume próximo ano
    const invoiceDueDateStr = `${firstYear.toString().padStart(4, '0')}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

    createMut.mutate({
      description,
      total_cents: totalCents,
      installment_count: installments,
      installment_cents: installmentCents,
      start_date: startDate,
      end_date: endDate,
      paid_installments: 0,
      invoice_due_date: invoiceDueDateStr,
    } as CreateDebtInput);
  };

  const exportDebtsPDF = async () => {
    try {
      let companyId: string | null = null;
      if (isAdmin) {
        // Se admin tem empresa selecionada no filtro, usa ela; caso contrário, usa a empresa do app
        companyId = selectedCompanyId || adminCompanyId;
      } else {
        companyId = await getCurrentCompanyId();
      }
      if (!companyId) { Alert.alert('Erro', 'Empresa não identificada'); return; }
      const debts = await listAllDebts(companyId);
      let total = 0, totalPaid = 0, totalOpen = 0, paidCount = 0, openCount = 0;
      let lastEnd: string | null = null;
      for (const d of debts) {
        total += d.total_cents || 0;
        const paid = (d.paid_installments || 0) * (d.installment_cents || 0);
        totalPaid += paid;
        const open = Math.max(0, (d.installment_count - (d.paid_installments || 0)) * (d.installment_cents || 0));
        totalOpen += open;
        if ((d.paid_installments || 0) >= d.installment_count) paidCount++; else openCount++;
        if (!lastEnd || d.end_date > lastEnd) lastEnd = d.end_date;
      }
      const appDefaultLogo = 'https://i.im.ge/2025/11/03/nH0whJ.Logo-Black.png';
      const fastSavorysLogo = 'https://i.im.ge/2025/10/26/nV1mA6.fast-logo.png';
      let logoSrc = '';
      if (isAdmin) {
        // Para admin, usar logo da empresa selecionada (coluna logo_url), com fallback na logo correta
        try {
          const { data: comp } = await supabase
            .from('companies')
            .select('logo_url,name,username')
            .eq('id', companyId)
            .maybeSingle();
          const rawName = (comp?.name || comp?.username || '').toLowerCase();
          const isFastSavorys = rawName === 'fastsavorys';
          if (comp?.logo_url) logoSrc = comp.logo_url as any;
          else if (isFastSavorys) logoSrc = fastSavorysLogo;
          else logoSrc = appDefaultLogo;
        } catch {
          logoSrc = appDefaultLogo;
        }
      } else {
        // Usuário de empresa: usa logo configurada na área de Configuração, com fallback na logo principal do app
        logoSrc = settings.logoUrl || appDefaultLogo;
      }
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
      const rows = debts.map(d => `
        <tr>
          <td>${(d.description || '').replace(/</g,'&lt;')}</td>
          <td>${d.start_date}</td>
          <td>${d.end_date}</td>
          <td style="text-align:right">${formatMoney(d.total_cents || 0)}</td>
          <td style="text-align:right">${d.installment_count}</td>
          <td style="text-align:right">${formatMoney(d.installment_cents || 0)}</td>
          <td style="text-align:right">${d.paid_installments}/${d.installment_count}</td>
        </tr>`).join('');
      const html = `
        <html><head><meta charset='utf-8'/>
        <style>body{font-family:Arial,sans-serif;padding:16px}h1{font-size:18px;margin:0 0 12px 0;display:flex;align-items:center;gap:10px}.cards{display:flex;gap:12px;margin:10px 0}.card{border:1px solid #e5e7eb;border-radius:8px;padding:10px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:6px;font-size:12px}th{background:#f3f4f6;text-align:left}</style></head>
        <body>
          <h1>${logoSrc ? `<img src='${logoSrc}' style='height:56px'/> ` : ''}Relatório de Dívidas</h1>
          <div class='cards'>
            <div class='card'><div><b>Total de dívidas</b></div><div>${formatMoney(total)}</div></div>
            <div class='card'><div><b>Pagas</b></div><div>${formatMoney(totalPaid)}</div><div style='color:#666;font-size:11px'>${paidCount} concluídas</div></div>
            <div class='card'><div><b>Em aberto</b></div><div>${formatMoney(totalOpen)}</div><div style='color:#666;font-size:11px'>${openCount} em aberto</div></div>
            <div class='card'><div><b>Data final (última)</b></div><div>${lastEnd || '-'}</div></div>
          </div>
          <table>
            <thead><tr><th>Descrição</th><th>Início</th><th>Fim</th><th>Total</th><th>Parcelas</th><th>Valor/Parcela</th><th>Pagas</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
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
    } catch (e: any) {
      Alert.alert('Erro ao gerar relatório', e?.message || '');
    }
  };

  const openEdit = (debt: Debt) => {
    setEditing(debt);
    setDescription(debt.description);
    setTotalAmount(formatCentsBRL(debt.total_cents));
    setInstallmentCount(debt.installment_count.toString());
    setInstallmentAmount(formatCentsBRL(debt.installment_cents));
    setStartDate(debt.start_date);
    const inv = debt.invoice_due_date || '';
    let invDay = '';
    let invMonth = '';
    if (inv && inv.includes('-')) {
      const parts = inv.split('-');
      invMonth = parts[1] || '';
      invDay = parts[2] || '';
    }
    setInvoiceDueDay(invDay || '');
    setInvoiceDueMonth(invMonth || '');
    setEditVisible(true);
  };

  const handleUpdate = () => {
    if (!editing || !description || !totalAmount || !installmentCount || !startDate || !invoiceDueDay || !invoiceDueMonth) return;
    const dueDay = parseInt(invoiceDueDay.replace(/\D/g, ''), 10);
    const dueMonth = parseInt(invoiceDueMonth.replace(/\D/g, ''), 10);
    if (!dueDay || dueDay < 1 || dueDay > 31) {
      Alert.alert('Dia de vencimento inválido', 'Informe um dia de vencimento entre 1 e 31');
      return;
    }
    if (!dueMonth || dueMonth < 1 || dueMonth > 12) {
      Alert.alert('Mês de vencimento inválido', 'Informe um mês de vencimento entre 1 e 12');
      return;
    }
    const totalCents = parseBRLToCents(totalAmount);
    const installments = parseInt(installmentCount, 10);
    const installmentCents = Math.round(totalCents / installments);
    const endTmp2 = new Date(startDate);
    endTmp2.setMonth(endTmp2.getMonth() + (installments - 1));
    const endDate = endTmp2.toISOString().split('T')[0];

    const { y: startY, m: startM } = ymdToParts(startDate);
    let firstYear = startY || new Date().getFullYear();
    if (dueMonth < startM) firstYear += 1;
    const invoiceDueDateStr = `${firstYear.toString().padStart(4, '0')}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

    updateMut.mutate({
      id: editing.id,
      updates: {
        description,
        total_cents: totalCents,
        installment_count: installments,
        installment_cents: installmentCents,
        start_date: startDate,
        end_date: endDate,
        invoice_due_date: invoiceDueDateStr,
      },
    });
  };

  const handleToggleInstallmentPaid = (debt: Debt, index: number) => {
    if (!canToggleInstallments) return;
    const current = debt.paid_installments || 0;
    let next = current;
    const target = index + 1; // parcela é 1-based

    if (target > current) {
      next = target; // marcar até essa parcela como pagas
    } else if (target === current) {
      next = target - 1; // desmarcar a última
    }

    if (next < 0) next = 0;
    if (next > debt.installment_count) next = debt.installment_count;
    if (next === current) return;

    updatePaidInstallmentsMut.mutate({ id: debt.id, paid_installments: next });
  };

  const renderDebt = ({ item }: { item: Debt }) => {
    const today = todayYMD();
    const paidCount = item.paid_installments || 0;
    const remainingCount = Math.max(0, item.installment_count - paidCount);
    const remainingAmount = remainingCount * item.installment_cents;

    const baseDue = item.invoice_due_date || item.start_date;
    const hasValidBaseDue = !!baseDue && /^\d{4}-\d{2}-\d{2}$/.test(baseDue);
    const segmentsCount = Math.max(0, item.installment_count);

    const dueDates: string[] = [];
    if (hasValidBaseDue) {
      const [y, m, d] = baseDue.split('-').map(Number);
      for (let i = 0; i < segmentsCount; i++) {
        const dt = new Date(y, (m - 1) + i, d);
        const yy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        dueDates.push(`${yy}-${mm}-${dd}`);
      }
    }

    let nextIndex = -1;
    for (let i = 0; i < segmentsCount; i++) {
      if (i < paidCount) continue;
      const due = dueDates[i] || baseDue;
      if (!due) continue;
      if (today <= due) {
        nextIndex = i;
        break;
      }
    }

    const segments = new Array(segmentsCount).fill(0).map((_, i) => {
      if (i < paidCount) return 'paid';
      const due = dueDates[i] || baseDue;
      const isOverdue = !!due && today > due; // atraso só a partir do dia seguinte ao vencimento
      if (isOverdue) return 'overdue';
      if (i === nextIndex) return 'next';
      return 'future';
    });

    return (
      <View style={[styles.debtCard, { backgroundColor: theme.card, borderColor: '#ddd' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.debtTitle, { color: theme.text }]} numberOfLines={1}>{item.description}</Text>
          <Text style={[styles.debtDates, { color: '#888' }]} numberOfLines={1}>Compra: {item.start_date} • Fim: {item.end_date}</Text>
          {item.invoice_due_date && (
            <Text style={[styles.debtDates, { color: '#888' }]} numberOfLines={1}>Vencimento da fatura: {item.invoice_due_date}</Text>
          )}
          <View style={styles.debtDetails}>
            <Text style={{ color: theme.text }}>{item.installment_count}x {formatMoney(item.installment_cents)}</Text>
            <Text style={{ color: theme.text }}>Total: {formatMoney(item.total_cents)}</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={{ color: theme.text, fontSize: 12 }}>{paidCount}/{item.installment_count} parcelas pagas</Text>
            <Text style={{ color: remainingCount > 0 ? '#D90429' : '#16A34A', fontSize: 12 }}>Restante: {formatMoney(remainingAmount)}</Text>
          </View>
          <View style={[styles.segmentBar, { backgroundColor: '#e5e7eb' }]}>
            {segments.map((status, idx) => {
              let bg = '#ffffff';
              if (status === 'paid') bg = '#16A34A'; // parcelas pagas - verde
              else if (status === 'overdue') bg = '#DC2626'; // parcelas vencidas - vermelho
              else if (status === 'next') bg = '#FACC15'; // próxima parcela - amarelo
              // future permanece branca
              return (
                <View
                  key={idx}
                  style={{
                    flex: 1,
                    height: '100%',
                    marginRight: idx === segments.length - 1 ? 0 : 2,
                    backgroundColor: bg,
                  }}
                />
              );
            })}
          </View>
          {canToggleInstallments && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {new Array(Math.max(0, item.installment_count)).fill(0).map((_, idx) => {
                const checked = idx < (item.paid_installments || 0);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleToggleInstallmentPaid(item, idx)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 6,
                      paddingVertical: 6,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: checked ? '#16A34A' : '#d1d5db',
                      backgroundColor: checked ? '#dcfce7' : '#ffffff',
                    }}
                  >
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        marginRight: 4,
                        borderRadius: 2,
                        borderWidth: 1,
                        borderColor: checked ? '#16A34A' : '#d1d5db',
                        backgroundColor: checked ? '#16A34A' : '#ffffff',
                      }}
                    />
                    <Text style={{ color: checked ? '#166534' : '#4b5563', fontSize: 11 }}>Parcela {idx + 1} paga</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
        {canManageDebtActions && (
          <View style={styles.debtActions}>
            <TouchableOpacity onPress={() => openEdit(item)}>
              <Text style={[styles.actionText, { color: '#60A5FA' }]}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteMut.mutate(item.id)}>
              <Text style={[styles.actionText, { color: '#D90429' }]}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Cálculo de alertas de dívida
  const alert = React.useMemo(() => {
    const settings = settingsQuery.data;
    const debts = debtsQuery.data || [];
    
    if (!settings) return null;
    
    // Calcular total de dívidas em aberto
    let totalDebtCents = 0;
    for (const debt of debts) {
      const paidCount = debt.paid_installments || 0;
      const installmentValue = debt.installment_cents || 0;
      const remaining = Math.max(0, (debt.total_cents || 0) - (paidCount * installmentValue));
      totalDebtCents += remaining;
    }
    
    // Alerta de dívida acima do limite
    if (totalDebtCents > settings.alert_debt_threshold_cents) {
      return {
        message: `Alerta: seu total de dívidas em aberto passa de R$ ${(settings.alert_debt_threshold_cents / 100).toFixed(2)} (limite configurado)`,
        color: '#F59E0B'
      };
    }
    
    return null;
  }, [settingsQuery.data, debtsQuery.data, formatMoney]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 16, flexGrow: 1 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
        <ScreenTitle 
          title="Débitos" 
          subtitle="Controle suas dívidas e parcelas" 
        />

        {/* Banner de Alerta */}
        {alert && (
          <View style={{ backgroundColor: '#FEF2F2', borderColor: alert.color, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <Text style={{ color: alert.color, fontWeight: '700', fontSize: 14 }}>⚠️ Alerta de Dívidas</Text>
            <Text style={{ color: alert.color, fontSize: 12, marginTop: 4 }}>{alert.message}</Text>
          </View>
        )}
        {blockedMsg ? (
          <View style={{ borderWidth: 1, borderColor: '#ef4444', backgroundColor: '#fee2e2', padding: 10, borderRadius: 8 }}>
            <Text style={{ color: '#991b1b', fontWeight: '700' }}>{blockedMsg}</Text>
            <Text style={{ color: '#991b1b' }}>Contato: (79) 9 0000-0000</Text>
          </View>
        ) : null}
        {isAdmin && isWeb && (
          <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 4 }}>
            <Text style={{ color: theme.text, marginBottom: 6, fontWeight: '700' }}>Empresa</Text>
            {/* @ts-ignore */}
            <select
              value={selectedCompanyId || ''}
              onChange={(e: any) => setSelectedCompanyId(e.target.value || null)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', background: (theme as any).background, color: theme.text }}
            >
              <option value="">Selecione...</option>
              {(companiesQ.data || [])
                .filter((c: any) => {
                  const rawName = (c?.name || c?.username || '').toLowerCase();
                  const rawUser = (c?.username || '').toLowerCase();
                  const isAdminCompany =
                    rawName === 'fast cash flow' ||
                    rawName === 'fastcashflow' ||
                    rawUser === 'fastcashflow';
                  return !isAdminCompany;
                })
                .map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name || c.username}</option>
                ))}
            </select>
          </View>
        )}
        
        <View style={{ flexDirection: isWideWeb ? 'row' : 'column', gap: 16, paddingBottom: 20 }}>
          {/* LEFT COLUMN */}
          <View style={{ width: isWeb ? 340 : '100%', gap: 12, opacity: canEdit ? 1 : 0.6 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Descrição da dívida</Text>
              <TextInput editable={!!canEdit}
                value={description}
                onChangeText={setDescription}
                placeholder="Ex: Compra de equipamento"
                placeholderTextColor="#999"
                style={[styles.input, { color: theme.text, backgroundColor: theme.card }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Data da compra</Text>
              {isWeb ? (
                <input disabled={!canEdit}
                  type="date"
                  value={startDate}
                  onChange={(e: any) => setStartDate(e.target.value)}
                  style={{ width: '100%', maxWidth: '100%', display: 'block', height: 44, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: (theme as any).card, color: theme.text, colorScheme: mode === 'dark' ? 'dark' : 'light', boxSizing: 'border-box', outline: 'none', outlineOffset: 0, boxShadow: 'none', margin: 0 } as any}
                />
              ) : (
                <TextInput editable={!!canEdit}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#999"
                  style={[styles.input, { color: theme.text, backgroundColor: theme.card }]}
                />
              )}
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Vencimento da Fatura</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: theme.text, fontSize: 12 }}>Dia</Text>
                  {isWeb ? (
                    <input
                      disabled={!canEdit}
                      type="number"
                      min={1}
                      max={31}
                      value={invoiceDueDay}
                      onChange={(e: any) => {
                        const v = String(e.target.value || '').replace(/\D/g, '').slice(0, 2);
                        setInvoiceDueDay(v);
                      }}
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        display: 'block',
                        height: 44,
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid #ddd',
                        background: (theme as any).card,
                        color: theme.text,
                        colorScheme: mode === 'dark' ? 'dark' : 'light',
                        boxSizing: 'border-box',
                        outline: 'none',
                        outlineOffset: 0,
                        boxShadow: 'none',
                        margin: 0,
                      } as any}
                    />
                  ) : (
                    <TextInput
                      editable={!!canEdit}
                      value={invoiceDueDay}
                      onChangeText={(txt) => setInvoiceDueDay(txt.replace(/\D/g, '').slice(0, 2))}
                      placeholder="Ex: 12"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      style={[styles.input, { color: theme.text, backgroundColor: theme.card }]}
                    />
                  )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: theme.text, fontSize: 12 }}>Mês</Text>
                  {isWeb ? (
                    <input
                      disabled={!canEdit}
                      type="number"
                      min={1}
                      max={12}
                      value={invoiceDueMonth}
                      onChange={(e: any) => {
                        const v = String(e.target.value || '').replace(/\D/g, '').slice(0, 2);
                        setInvoiceDueMonth(v);
                      }}
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        display: 'block',
                        height: 44,
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid #ddd',
                        background: (theme as any).card,
                        color: theme.text,
                        colorScheme: mode === 'dark' ? 'dark' : 'light',
                        boxSizing: 'border-box',
                        outline: 'none',
                        outlineOffset: 0,
                        boxShadow: 'none',
                        margin: 0,
                      } as any}
                    />
                  ) : (
                    <TextInput
                      editable={!!canEdit}
                      value={invoiceDueMonth}
                      onChangeText={(txt) => setInvoiceDueMonth(txt.replace(/\D/g, '').slice(0, 2))}
                      placeholder="Ex: 11"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      style={[styles.input, { color: theme.text, backgroundColor: theme.card }]}
                    />
                  )}
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.text }}>Valor total</Text>
                <TextInput editable={!!canEdit}
                  value={totalAmount}
                  onChangeText={(txt) => {
                    setTotalAmount(maskBRLInput(txt));
                    if (txt && installmentCount) {
                      const total = parseBRLToCents(txt);
                      const installments = parseInt(installmentCount, 10);
                      if (installments > 0) {
                        setInstallmentAmount(formatCentsBRL(Math.round(total / installments)));
                      }
                    }
                  }}
                  placeholder="R$ 0,00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  style={[styles.input, { color: theme.text, backgroundColor: theme.card }]}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.text }}>Parcelas</Text>
                <TextInput editable={!!canEdit}
                  value={installmentCount}
                  onChangeText={(txt) => {
                    setInstallmentCount(txt.replace(/\D/g, ''));
                    if (txt && totalAmount) {
                      const total = parseBRLToCents(totalAmount);
                      const installments = parseInt(txt.replace(/\D/g, ''), 10);
                      if (installments > 0) {
                        setInstallmentAmount(formatCentsBRL(Math.round(total / installments)));
                      }
                    }
                  }}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  style={[styles.input, { color: theme.text, backgroundColor: theme.card }]}
                />
              </View>
            </View>

            {installmentAmount ? (
              <View style={[styles.installmentPreview, { backgroundColor: '#f0fdf4', borderColor: '#16A34A' }]}>
                <Text style={{ color: '#16A34A', fontWeight: '700' }}>Valor por parcela</Text>
                <Text style={{ color: '#16A34A', fontSize: 18, fontWeight: '800' }}>{installmentAmount}</Text>
              </View>
            ) : null}

            <TouchableOpacity disabled={!canEdit || !!blockedMsg} onPress={handleCreate} style={[styles.createBtn, { backgroundColor: (!canEdit || !!blockedMsg) ? '#6b7280' : '#16A34A' }]}>
              <Text style={[styles.createBtnText, { color: '#fff' }]}>Cadastrar Dívida</Text>
            </TouchableOpacity>
          </View>

          {/* RIGHT COLUMN: Debts list */}
          <View style={{ flex: isWideWeb ? 1 : undefined, minWidth: isWideWeb ? 280 : undefined }}>
            <Text style={[styles.subtitle, { color: theme.text }]}>Dívidas cadastradas</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TouchableOpacity onPress={exportDebtsPDF} style={{ backgroundColor: '#0ea5e9', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Gerar relatório</Text>
              </TouchableOpacity>
            </View>
            <View>
              {(debtsQuery.data || []).length === 0 ? (
                <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>
                  Nenhuma dívida cadastrada
                </Text>
              ) : (
                (debtsQuery.data || []).map((item, index) => (
                  <View key={item.id}>
                    {renderDebt({ item })}
                    {index < (debtsQuery.data || []).length - 1 && <View style={{ height: 8 }} />}
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      {editVisible && editing && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Editar Dívida</Text>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Descrição</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
              />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Data da compra</Text>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
              />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.text }}>Vencimento da Fatura</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: theme.text, fontSize: 12 }}>Dia</Text>
                  <TextInput
                    value={invoiceDueDay}
                    onChangeText={(txt) => setInvoiceDueDay(txt.replace(/\D/g, '').slice(0, 2))}
                    style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: theme.text, fontSize: 12 }}>Mês</Text>
                  <TextInput
                    value={invoiceDueMonth}
                    onChangeText={(txt) => setInvoiceDueMonth(txt.replace(/\D/g, '').slice(0, 2))}
                    style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.text }}>Valor total</Text>
                <TextInput
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  keyboardType="numeric"
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.text }}>Parcelas</Text>
                <TextInput
                  value={installmentCount}
                  onChangeText={setInstallmentCount}
                  keyboardType="numeric"
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setEditVisible(false); setEditing(null); }} style={[styles.modalBtn, { backgroundColor: '#666' }]}>
                <Text style={{ color: '#fff' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdate} style={[styles.modalBtn, { backgroundColor: '#2563EB' }]}>
                <Text style={{ color: '#fff' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  createBtn: { padding: 14, borderRadius: 8, alignItems: 'center' },
  createBtnText: { fontSize: 16, fontWeight: '700' },
  installmentPreview: { borderWidth: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  debtCard: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  debtTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  debtDates: { fontSize: 12, marginBottom: 8 },
  debtDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressBar: { height: 4, borderRadius: 2, marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 2 },
  debtActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  actionText: { fontSize: 12, fontWeight: '600' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', maxWidth: 400, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  chartCard: { borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 16 },
  chartTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  segmentBar: { height: 6, borderRadius: 3, flexDirection: 'row' },
});
