import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView, Modal } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPayables,
  createPayable,
  markAsPaid,
  deletePayable,
  getPayablesSummary,
  Payable,
  PayableStatus,
  PayableType
} from '../repositories/payables';
import { listAllDebts, updateDebt as updateDebtRepo, deleteDebt as deleteDebtRepo, createDebt as createDebtRepo, CreateDebtInput, DebtRow } from '../repositories/debts';
import { getCurrentCompanyId } from '../lib/company';
import { createTransaction } from '../repositories/transactions';
import { formatCentsBRL, parseBRLToCents, maskBRLInput } from '../utils/money';
import { todayYMD } from '../utils/date';
import ScreenTitle from '../components/ScreenTitle';
import { useToast } from '../ui/ToastProvider';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import FeatureBanner, { FEATURE_BANNERS } from '../components/FeatureBanner';
import CollapsibleFilter from '../components/CollapsibleFilter';

const PAYABLE_TYPES: { value: PayableType; label: string }[] = [
  { value: 'bill', label: 'Conta/Boleto' },
  { value: 'supplier', label: 'Fornecedor' },
  { value: 'debt', label: 'Parcela de Dívida' },
  { value: 'recurring', label: 'Cartão de Crédito' },
];

// Filtros ajustados para dívidas parceladas
const STATUS_FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: '🟡 A Pagar' },      // Parcelas do próximo mês (amarelo)
  { key: 'overdue', label: '🔴 Vencidas' },     // Parcelas vencidas (vermelho)
  { key: 'paid', label: '✅ Quitadas' },        // Dívidas 100% pagas
];

export default function PayablesScreen() {
  const { theme } = useThemeCtx();
  const qc = useQueryClient();
  const toast = useToast();

  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayYMD());
  const [payableType, setPayableType] = useState<PayableType>('bill');

  // Estados para Cartão de Crédito
  const [invoiceDueDay, setInvoiceDueDay] = useState('');
  const [invoiceDueMonth, setInvoiceDueMonth] = useState('');
  const [installmentCount, setInstallmentCount] = useState('');

  // Estado para edição de dívida
  const [editingDebt, setEditingDebt] = useState<DebtRow | null>(null);

  // Estado para confirmação de exclusão (mostra mensagem no centro)
  const [deletingDebtId, setDeletingDebtId] = useState<string | null>(null);

  const payablesQuery = useQuery({
    queryKey: ['payables'],
    queryFn: listPayables,
  });

  const summaryQuery = useQuery({
    queryKey: ['payables-summary'],
    queryFn: getPayablesSummary,
  });

  // Query para buscar dívidas
  const debtsQuery = useQuery({
    queryKey: ['debts-for-payables'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return [];
      return await listAllDebts(companyId);
    },
  });

  // Mutation para atualizar parcelas pagas (com lançamento automático de despesa)
  const updateDebtInstallmentsMut = useMutation({
    mutationFn: async ({ id, paid_installments, debt }: { id: string; paid_installments: number; debt?: DebtRow }) => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');

      // Atualizar as parcelas pagas
      const updatedDebt = await updateDebtRepo(companyId, id, { paid_installments });

      // Se a quantidade de parcelas pagas AUMENTOU, criar lançamento de despesa
      if (debt && paid_installments > (debt.paid_installments || 0)) {
        const parcelasPagas = paid_installments - (debt.paid_installments || 0);
        const valorTotal = parcelasPagas * debt.installment_cents;

        // Criar lançamento de saída no fluxo de caixa
        await createTransaction({
          type: 'expense',
          description: `Parcela ${paid_installments}/${debt.installment_count} - ${debt.description}`,
          category: 'Dívidas',
          amount_cents: valorTotal,
          date: todayYMD(),
          time: new Date().toTimeString().slice(0, 5),
          datetime: new Date().toISOString(),
        });
      }

      return updatedDebt;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts-for-payables'] });
      qc.invalidateQueries({ queryKey: ['payables-summary'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['daily-totals'] });
      qc.invalidateQueries({ queryKey: ['month-totals'] });
      toast.show('Parcela paga! Lançamento criado automaticamente.', 'success');
    },
    onError: (e: any) => {
      toast.show(e.message || 'Erro ao atualizar parcela', 'error');
    },
  });

  // Mutation para deletar dívida
  const deleteDebtMut = useMutation({
    mutationFn: async (id: string) => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');
      return await deleteDebtRepo(companyId, id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts-for-payables'] });
      qc.invalidateQueries({ queryKey: ['payables-summary'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      toast.show('Dívida excluída!', 'success');
    },
    onError: (e: any) => {
      toast.show(e.message || 'Erro ao excluir dívida', 'error');
    },
  });

  // Mutation para atualizar dívida (edição)
  const updateDebtMut = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateDebtInput> }) => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');
      return await updateDebtRepo(companyId, id, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts-for-payables'] });
      qc.invalidateQueries({ queryKey: ['payables-summary'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      setEditingDebt(null);
      toast.show('Dívida atualizada!', 'success');
    },
    onError: (e: any) => {
      toast.show(e.message || 'Erro ao atualizar dívida', 'error');
    },
  });

  // Função para gerar relatório de dívidas
  const exportDebtsReport = async () => {
    try {
      const debts = debtsQuery.data || [];
      if (debts.length === 0) {
        toast.show('Nenhuma dívida para gerar relatório', 'error');
        return;
      }

      // Buscar logo da empresa (direto da tabela companies para evitar 406)
      let logoUrl = '';
      try {
        const companyId = await getCurrentCompanyId();
        if (companyId) {
          const { data: company } = await supabase
            .from('companies')
            .select('logo_url')
            .eq('id', companyId)
            .maybeSingle();
          if (company?.logo_url) logoUrl = company.logo_url;
        }
      } catch (e) {
        console.log('Não foi possível carregar logo');
      }

      let total = 0, totalPaid = 0, totalOpen = 0;
      for (const d of debts) {
        total += d.total_cents || 0;
        const paid = (d.paid_installments || 0) * (d.installment_cents || 0);
        totalPaid += paid;
        totalOpen += Math.max(0, d.total_cents - paid);
      }

      const rows = debts.map(d => `
        <tr>
          <td>${(d.description || '').replace(/</g, '&lt;')}</td>
          <td>${d.start_date}</td>
          <td style="text-align:right">${formatCentsBRL(d.total_cents)}</td>
          <td style="text-align:right">${d.installment_count}x</td>
          <td style="text-align:right">${d.paid_installments}/${d.installment_count}</td>
          <td style="text-align:right">${formatCentsBRL(Math.max(0, d.total_cents - (d.paid_installments || 0) * d.installment_cents))}</td>
        </tr>`).join('');

      const logoHtml = logoUrl ? `<img src="${logoUrl}" style="width:80px;height:auto;margin-right:16px" />` : '';

      const html = `
        <html><head><meta charset='utf-8'/>
        <style>body{font-family:Arial,sans-serif;padding:16px}h1{font-size:18px;margin:0 0 12px 0}.header{display:flex;align-items:center;margin-bottom:12px}.cards{display:flex;gap:12px;margin:10px 0}.card{border:1px solid #e5e7eb;border-radius:8px;padding:10px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:6px;font-size:12px}th{background:#f3f4f6;text-align:left}</style></head>
        <body>
          <div class='header'>
            ${logoHtml}
            <h1>📊 Relatório de Dívidas</h1>
          </div>
          <div class='cards'>
            <div class='card'><b>Total</b><br/>${formatCentsBRL(total)}</div>
            <div class='card'><b>Pago</b><br/>${formatCentsBRL(totalPaid)}</div>
            <div class='card' style="color:#DC2626"><b>Em Aberto</b><br/>${formatCentsBRL(totalOpen)}</div>
          </div>
          <table>
            <thead><tr><th>Descrição</th><th>Data</th><th>Total</th><th>Parcelas</th><th>Pagas</th><th>Restante</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body></html>`;

      if (Platform.OS === 'web') {
        const win = window.open('', '_blank');
        if (win) { win.document.open(); win.document.write(html); win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 300); }
        return;
      }
      const file = await Print.printToFileAsync({ html });
      if (file?.uri && await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf' });
    } catch (e: any) {
      toast.show('Erro ao gerar relatório', 'error');
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const cents = parseBRLToCents(amount);
      if (!supplierName.trim()) throw new Error(payableType === 'recurring' ? 'Nome do cartão é obrigatório' : 'Nome do fornecedor é obrigatório');
      if (!description.trim()) throw new Error('Descrição é obrigatória');
      if (cents <= 0) throw new Error('Valor deve ser maior que zero');

      // Se for Cartão de Crédito, cadastrar na tabela debts
      if (payableType === 'recurring') {
        const dueDay = parseInt(invoiceDueDay.replace(/\D/g, ''), 10);
        const dueMonth = parseInt(invoiceDueMonth.replace(/\D/g, ''), 10);
        const installments = parseInt(installmentCount.replace(/\D/g, ''), 10);

        if (!dueDay || dueDay < 1 || dueDay > 31) throw new Error('Dia de vencimento inválido');
        if (!dueMonth || dueMonth < 1 || dueMonth > 12) throw new Error('Mês de vencimento inválido');
        if (!installments || installments < 1) throw new Error('Número de parcelas inválido');

        const companyId = await getCurrentCompanyId();
        if (!companyId) throw new Error('Empresa não identificada');

        const installmentCents = Math.round(cents / installments);

        // Converter data de DD/MM/AAAA para YYYY-MM-DD se necessário
        let startDateFormatted = dueDate;
        if (dueDate.includes('/')) {
          const parts = dueDate.split('/');
          if (parts.length === 3) startDateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        const [y, m] = startDateFormatted.split('-').map(Number);
        const startDateObj = new Date(y, m - 1, 1);
        const endDateObj = new Date(startDateObj);
        endDateObj.setMonth(endDateObj.getMonth() + installments);
        const end_date_str = endDateObj.toISOString().split('T')[0];

        // Data de vencimento da primeira fatura
        let firstYear = y || new Date().getFullYear();
        if (dueMonth < m) firstYear += 1;
        const invoiceDueDateStr = `${firstYear.toString().padStart(4, '0')}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

        const payload: CreateDebtInput = {
          description: `${supplierName.trim()} - ${description.trim()}`,
          total_cents: cents,
          installment_count: installments,
          installment_cents: installmentCents,
          start_date: startDateFormatted,
          end_date: end_date_str,
          paid_installments: 0,
          invoice_due_date: invoiceDueDateStr,
        };

        return await createDebtRepo(companyId, payload);
      }

      // Para outros tipos, continua usando payables
      return createPayable({
        supplier_name: supplierName.trim(),
        category: category.trim() || 'Geral',
        description: description.trim(),
        total_cents: cents,
        paid_cents: 0,
        due_date: dueDate.includes('/') ? dueDate.split('/').reverse().join('-') : dueDate,
        type: payableType,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables'] });
      qc.invalidateQueries({ queryKey: ['payables-summary'] });
      qc.invalidateQueries({ queryKey: ['debts-for-payables'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      setShowForm(false);
      setSupplierName('');
      setCategory('');
      setDescription('');
      setAmount('');
      setDueDate(todayYMD());
      setInvoiceDueDay('');
      setInvoiceDueMonth('');
      setInstallmentCount('');
      toast.show(payableType === 'recurring' ? 'Dívida de cartão cadastrada!' : 'Conta a pagar cadastrada!', 'success');
    },
    onError: (e: any) => {
      toast.show(e.message || 'Erro ao cadastrar', 'error');
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, amountCents, payable }: { id: string; amountCents: number; payable: Payable }) => {
      // Marcar como pago
      await markAsPaid(id, amountCents);

      // Criar lançamento de saída no fluxo de caixa
      await createTransaction({
        type: 'expense',
        description: `Pagamento: ${payable.description}`,
        category: payable.category,
        amount_cents: amountCents,
        date: todayYMD(),
        time: new Date().toTimeString().slice(0, 5),
        datetime: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables'] });
      qc.invalidateQueries({ queryKey: ['payables-summary'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.show('Pagamento registrado!', 'success');
    },
    onError: (e: any) => {
      toast.show(e.message || 'Erro ao registrar', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePayable,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables'] });
      qc.invalidateQueries({ queryKey: ['payables-summary'] });
      toast.show('Conta removida!', 'success');
    },
  });

  const handleMarkPaid = (payable: Payable) => {
    const remaining = payable.total_cents - payable.paid_cents;

    Alert.alert(
      'Registrar Pagamento',
      `Valor pendente: ${formatCentsBRL(remaining)}\n\nDeseja marcar como totalmente pago?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar Total',
          onPress: () => markPaidMutation.mutate({
            id: payable.id,
            amountCents: remaining,
            payable
          })
        },
        {
          text: 'Pagar Parcial',
          onPress: () => {
            const partial = Math.round(remaining / 2);
            markPaidMutation.mutate({
              id: payable.id,
              amountCents: partial,
              payable
            });
          }
        },
      ]
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Excluir',
      'Deseja excluir esta conta a pagar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
      ]
    );
  };

  // Filtrar dados de payables (tabela payables - pouco usada)
  const filteredData = React.useMemo(() => {
    let data = payablesQuery.data || [];
    const today = todayYMD();

    switch (filter) {
      case 'overdue':
        data = data.filter(p => p.status === 'overdue');
        break;
      case 'pending':
        data = data.filter(p => p.status === 'pending' || p.status === 'partial');
        break;
      case 'paid':
        data = data.filter(p => p.status === 'paid');
        break;
    }

    // Agrupar por categoria
    const grouped = new Map<string, Payable[]>();
    for (const p of data) {
      const list = grouped.get(p.category) || [];
      list.push(p);
      grouped.set(p.category, list);
    }

    return Array.from(grouped.entries()).map(([cat, items]) => ({
      category: cat,
      items,
      total: items.reduce((sum, p) => sum + p.total_cents - p.paid_cents, 0),
      overdue: items.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.total_cents - p.paid_cents, 0),
    }));
  }, [payablesQuery.data, filter]);

  // Filtrar dívidas baseado no estado das parcelas
  const filteredDebts = React.useMemo(() => {
    const debts = debtsQuery.data || [];
    const today = todayYMD();

    // Calcular próximo mês para a lógica de cores
    const todayDate = new Date();
    const nextMonthDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);
    const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

    return debts.filter(debt => {
      const paidCount = debt.paid_installments || 0;
      const isFullyPaid = paidCount >= debt.installment_count;

      // Calcular datas de vencimento das parcelas
      const baseDue = debt.invoice_due_date || debt.start_date;
      let hasOverdue = false;
      let hasPending = false; // Parcelas do próximo mês

      if (baseDue && /^\d{4}-\d{2}-\d{2}$/.test(baseDue)) {
        const [y, m, d] = baseDue.split('-').map(Number);
        for (let i = paidCount; i < debt.installment_count; i++) {
          const dt = new Date(y, (m - 1) + i, d);
          const dueDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

          if (dueDate < today) hasOverdue = true;
          if (dueDate.substring(0, 7) === nextMonth) hasPending = true;
        }
      }

      switch (filter) {
        case 'overdue':
          return hasOverdue && !isFullyPaid;
        case 'pending':
          return hasPending && !isFullyPaid;
        case 'paid':
          return isFullyPaid;
        default: // 'all'
          return true;
      }
    });
  }, [debtsQuery.data, filter]);

  const summary = summaryQuery.data;

  const getStatusColor = (status: PayableStatus) => {
    switch (status) {
      case 'paid': return '#10B981';
      case 'partial': return '#F59E0B';
      case 'pending': return '#3B82F6';
      case 'overdue': return '#EF4444';
    }
  };

  const getStatusLabel = (status: PayableStatus) => {
    switch (status) {
      case 'paid': return '✅ Pago';
      case 'partial': return '🟠 Parcial';
      case 'pending': return '🟡 Pendente';
      case 'overdue': return '🔴 Vencido';
    }
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle
          title="A Pagar"
          subtitle="Gerencie suas contas a pagar"
        />

        <FeatureBanner {...FEATURE_BANNERS.payables} />

        {/* Resumo */}
        {summary && (
          <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total</Text>
                <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{formatCentsBRL(summary.total)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Vencido</Text>
                <Text style={[styles.summaryValue, { color: '#991B1B' }]}>{formatCentsBRL(summary.overdue)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>7 dias</Text>
                <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{formatCentsBRL(summary.dueThisWeek)}</Text>
              </View>
            </View>
            <View style={styles.sourceRow}>
              <Text style={[styles.sourceText, { color: theme.textSecondary }]}>
                📋 Contas: {formatCentsBRL(summary.fromBills)} |
                💳 Dívidas: {formatCentsBRL(summary.fromDebts)} |
                🔄 Recorrentes: {formatCentsBRL(summary.fromRecurring)}
              </Text>
            </View>
          </View>
        )}

        {/* Filtros - Collapsible */}
        <CollapsibleFilter
          title="Filtros"
          subtitle="Por status de pagamento"
          icon="🔍"
          defaultExpanded={false}
          activeFiltersCount={filter !== 'all' ? 1 : 0}
        >
          <View style={styles.filters}>
            {STATUS_FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterBtn,
                  { backgroundColor: filter === f.key ? '#EF4444' : theme.card, borderWidth: 1, borderColor: filter === f.key ? '#EF4444' : theme.border }
                ]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[
                  styles.filterText,
                  { color: filter === f.key ? '#fff' : theme.text }
                ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </CollapsibleFilter>

        {/* Botão Adicionar */}
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: '#EF4444' }]}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.addBtnText}>
            {showForm ? '✕ Cancelar' : '+ Nova Conta a Pagar'}
          </Text>
        </TouchableOpacity>

        {/* Formulário */}
        {showForm && (
          <View style={[styles.form, { backgroundColor: theme.card }]}>
            {/* Seletor de Tipo - PRIMEIRO no formulário */}
            <Text style={[styles.label, { color: theme.textSecondary, marginBottom: 8 }]}>Tipo:</Text>
            <View style={[styles.typesRow, { marginBottom: 12 }]}>
              {PAYABLE_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: payableType === t.value ? '#EF4444' : theme.background,
                      borderColor: payableType === t.value ? '#EF4444' : '#ddd',
                    }
                  ]}
                  onPress={() => setPayableType(t.value)}
                >
                  <Text style={[
                    styles.typeText,
                    { color: payableType === t.value ? '#fff' : theme.text }
                  ]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder={payableType === 'recurring' ? "Nome do Cartão" : "Fornecedor/Credor"}
              placeholderTextColor="#999"
              value={supplierName}
              onChangeText={setSupplierName}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />
            <TextInput
              placeholder={payableType === 'recurring' ? "Categoria (ex: Reposição, Abastecimento)" : "Categoria (ex: Aluguel, Fornecedor)"}
              placeholderTextColor="#999"
              value={category}
              onChangeText={setCategory}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />
            <TextInput
              placeholder="Descrição"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />
            <TextInput
              placeholder="Valor (R$)"
              placeholderTextColor="#999"
              value={amount}
              onChangeText={t => setAmount(maskBRLInput(t))}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />

            {/* Data da Compra - formato DD/MM/AAAA */}
            <TextInput
              placeholder="Data da Compra (DD/MM/AAAA)"
              placeholderTextColor="#999"
              value={dueDate}
              onChangeText={t => {
                // Máscara DD/MM/AAAA
                const nums = t.replace(/\D/g, '').slice(0, 8);
                let masked = '';
                if (nums.length > 0) masked = nums.slice(0, 2);
                if (nums.length > 2) masked += '/' + nums.slice(2, 4);
                if (nums.length > 4) masked += '/' + nums.slice(4, 8);
                setDueDate(masked);
              }}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />

            {/* Campos extras para Cartão de Crédito */}
            {payableType === 'recurring' && (
              <View style={{ marginTop: 12, gap: 10 }}>
                <Text style={[styles.label, { color: theme.textSecondary, marginBottom: 4 }]}>
                  Vencimento da Fatura:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 4 }}>Dia</Text>
                    <TextInput
                      placeholder="Ex: 15"
                      placeholderTextColor="#999"
                      value={invoiceDueDay}
                      onChangeText={t => setInvoiceDueDay(t.replace(/\D/g, '').slice(0, 2))}
                      keyboardType="numeric"
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 4 }}>Mês</Text>
                    <TextInput
                      placeholder="Ex: 1"
                      placeholderTextColor="#999"
                      value={invoiceDueMonth}
                      onChangeText={t => setInvoiceDueMonth(t.replace(/\D/g, '').slice(0, 2))}
                      keyboardType="numeric"
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 4 }}>Parcelas</Text>
                    <TextInput
                      placeholder="Ex: 10"
                      placeholderTextColor="#999"
                      value={installmentCount}
                      onChangeText={t => setInstallmentCount(t.replace(/\D/g, ''))}
                      keyboardType="numeric"
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                    />
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#EF4444' }]}
              onPress={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              <Text style={styles.submitBtnText}>
                {createMutation.isPending ? 'Salvando...' : 'Cadastrar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista agrupada por categoria */}
        {filteredData.map(group => (
          <View key={group.category} style={[styles.categoryGroup, { backgroundColor: theme.card }]}>
            <View style={styles.categoryHeader}>
              <View>
                <Text style={[styles.categoryName, { color: theme.text }]}>
                  📁 {group.category}
                </Text>
                <Text style={[styles.categoryTotal, { color: '#EF4444' }]}>
                  Total: {formatCentsBRL(group.total)}
                </Text>
              </View>
              {group.overdue > 0 && (
                <View style={styles.overdueTag}>
                  <Text style={styles.overdueTagText}>
                    {formatCentsBRL(group.overdue)} vencido
                  </Text>
                </View>
              )}
            </View>

            {group.items.map(item => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemDesc, { color: theme.text }]}>
                      {item.description}
                    </Text>
                    <Text style={[styles.itemSupplier, { color: theme.textSecondary }]}>
                      {item.supplier_name}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemDetails}>
                  <Text style={[styles.itemValue, { color: '#EF4444' }]}>
                    {formatCentsBRL(item.total_cents - item.paid_cents)}
                  </Text>
                  <Text style={[styles.itemDate, { color: theme.textSecondary }]}>
                    Vence: {formatDate(item.due_date)}
                  </Text>
                </View>

                {item.status !== 'paid' && (
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => handleMarkPaid(item)}
                    >
                      <Text style={styles.actionBtnText}>✓ Marcar Pago</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                      onPress={() => handleDelete(item.id)}
                    >
                      <Text style={styles.actionBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        {filteredData.length === 0 && filteredDebts.length === 0 && (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nenhuma dívida encontrada
            </Text>
          </View>
        )}

        {/* SEÇÃO DE DÍVIDAS */}
        {filteredDebts.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.categoryName, { color: theme.text }]}>
                💳 Dívidas ({filteredDebts.length})
              </Text>
              <TouchableOpacity
                onPress={exportDebtsReport}
                style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Gerar Relatório</Text>
              </TouchableOpacity>
            </View>

            {filteredDebts.map((debt: DebtRow) => {
              const today = todayYMD();
              const currentMonth = today.substring(0, 7); // YYYY-MM
              const paidCount = debt.paid_installments || 0;
              const remainingCount = Math.max(0, debt.installment_count - paidCount);
              const remainingAmount = remainingCount * debt.installment_cents;
              const isFullyPaid = paidCount >= debt.installment_count;

              // Calcular datas de vencimento das parcelas
              const baseDue = debt.invoice_due_date || debt.start_date;
              const dueDates: string[] = [];
              if (baseDue && /^\d{4}-\d{2}-\d{2}$/.test(baseDue)) {
                const [y, m, d] = baseDue.split('-').map(Number);
                for (let i = 0; i < debt.installment_count; i++) {
                  const dt = new Date(y, (m - 1) + i, d);
                  const yy = dt.getFullYear();
                  const mm = String(dt.getMonth() + 1).padStart(2, '0');
                  const dd = String(dt.getDate()).padStart(2, '0');
                  dueDates.push(`${yy}-${mm}-${dd}`);
                }
              }

              // Calcular próximo mês para lógica de cores
              const todayDate = new Date();
              const nextMonthDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);
              const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

              // Calcular status de cada parcela com cores corretas
              // Amarelo = próximo mês (dívidas do início de janeiro são pagas com dinheiro de dezembro)
              const segments = new Array(debt.installment_count).fill(0).map((_, i) => {
                if (i < paidCount) return 'paid'; // Verde - pago
                const due = dueDates[i] || baseDue;
                if (due && today > due) return 'overdue'; // Vermelho - vencido
                if (due && due.substring(0, 7) === nextMonth) return 'current'; // Amarelo - próximo mês (mês que virá)
                return 'future'; // Branco - futuro
              });

              // Função para alternar parcela
              const handleToggleInstallment = (index: number) => {
                const current = debt.paid_installments || 0;
                let next = current;
                const target = index + 1;

                if (target > current) {
                  next = target;
                } else if (target === current) {
                  next = target - 1;
                }

                if (next < 0) next = 0;
                if (next > debt.installment_count) next = debt.installment_count;
                if (next === current) return;

                updateDebtInstallmentsMut.mutate({ id: debt.id, paid_installments: next, debt });
              };

              // Função para excluir dívida (mostra confirmação inline, não popup)
              const handleDeleteDebt = () => {
                setDeletingDebtId(debt.id);
              };

              return (
                <View
                  key={debt.id}
                  style={[
                    styles.categoryGroup,
                    {
                      backgroundColor: theme.card,
                      borderLeftWidth: 4,
                      borderLeftColor: isFullyPaid ? '#10B981' : segments.some(s => s === 'overdue') ? '#EF4444' : '#F59E0B',
                    }
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.categoryName, { color: theme.text }]} numberOfLines={1}>
                        {debt.description}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
                        Compra: {debt.start_date} • Fim: {debt.end_date}
                      </Text>
                      {debt.invoice_due_date && (
                        <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                          Vencimento da fatura: {debt.invoice_due_date}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#10B981', fontSize: 15, fontWeight: '800' }}>
                        Total: {formatCentsBRL(debt.total_cents)}
                      </Text>
                      {!isFullyPaid && (
                        <Text style={{ color: '#DC2626', fontSize: 11 }}>
                          Restante: {formatCentsBRL(remainingAmount)}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ color: theme.text, fontSize: 12 }}>
                      {debt.installment_count}x {formatCentsBRL(debt.installment_cents)}
                    </Text>
                    <Text style={{ color: isFullyPaid ? '#10B981' : theme.text, fontSize: 12 }}>
                      {paidCount}/{debt.installment_count} parcelas pagas
                    </Text>
                  </View>

                  {/* Barra de progresso com cores corretas */}
                  <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, marginTop: 8, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
                    {segments.map((status, idx) => {
                      let bg = '#ffffff';
                      if (status === 'paid') bg = '#10B981'; // Verde
                      else if (status === 'overdue') bg = '#EF4444'; // Vermelho
                      else if (status === 'current') bg = '#FACC15'; // Amarelo
                      return (
                        <View
                          key={idx}
                          style={{
                            flex: 1,
                            marginRight: idx === segments.length - 1 ? 0 : 1,
                            backgroundColor: bg,
                          }}
                        />
                      );
                    })}
                  </View>

                  {/* Botões de parcelas com cores corretas */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {new Array(debt.installment_count).fill(0).map((_, idx) => {
                      const isPaid = idx < paidCount;
                      const dueDate = dueDates[idx];
                      const isOverdue = dueDate && today > dueDate && !isPaid;
                      const isCurrent = dueDate && dueDate.substring(0, 7) === nextMonth && !isPaid && !isOverdue;

                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => handleToggleInstallment(idx)}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: isPaid ? '#10B981' : isOverdue ? '#EF4444' : isCurrent ? '#FACC15' : '#d1d5db',
                            backgroundColor: isPaid ? '#DCFCE7' : isOverdue ? '#FEE2E2' : isCurrent ? '#FEF9C3' : '#ffffff',
                          }}
                        >
                          <Text style={{
                            color: isPaid ? '#166534' : isOverdue ? '#991B1B' : isCurrent ? '#854D0E' : '#4b5563',
                            fontSize: 10,
                            fontWeight: '600'
                          }}>
                            {isPaid ? '✓' : ''} Parcela {idx + 1} {isPaid ? 'paga' : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Botões Editar e Excluir */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <TouchableOpacity
                      onPress={() => setEditingDebt(debt)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#3B82F6' }}
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDeleteDebt}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#EF4444' }}
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal de Edição de Dívida */}
      <Modal
        visible={!!editingDebt}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingDebt(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: theme.card, borderRadius: 12, padding: 16 }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
              Editar Dívida
            </Text>
            {editingDebt && (
              <>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>Descrição:</Text>
                <TextInput
                  value={editingDebt.description}
                  onChangeText={(t) => setEditingDebt({ ...editingDebt, description: t })}
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, marginBottom: 8 }]}
                />
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>Data de Início:</Text>
                <TextInput
                  value={editingDebt.start_date}
                  onChangeText={(t) => setEditingDebt({ ...editingDebt, start_date: t })}
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, marginBottom: 8 }]}
                />
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>Data de Fim:</Text>
                <TextInput
                  value={editingDebt.end_date}
                  onChangeText={(t) => setEditingDebt({ ...editingDebt, end_date: t })}
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, marginBottom: 8 }]}
                />
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>Data Vencimento Fatura:</Text>
                <TextInput
                  value={editingDebt.invoice_due_date || ''}
                  onChangeText={(t) => setEditingDebt({ ...editingDebt, invoice_due_date: t })}
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, marginBottom: 8 }]}
                />
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>Quantidade de Parcelas:</Text>
                <TextInput
                  value={String(editingDebt.installment_count || '')}
                  onChangeText={(t) => {
                    const num = parseInt(t.replace(/\D/g, ''), 10);
                    if (!isNaN(num) && num > 0) {
                      const newInstallmentCents = Math.round(editingDebt.total_cents / num);
                      setEditingDebt({
                        ...editingDebt,
                        installment_count: num,
                        installment_cents: newInstallmentCents
                      });
                    }
                  }}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, marginBottom: 8 }]}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => setEditingDebt(null)}
                    style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#6b7280', alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (editingDebt) {
                        updateDebtMut.mutate({
                          id: editingDebt.id,
                          updates: {
                            description: editingDebt.description,
                            start_date: editingDebt.start_date,
                            end_date: editingDebt.end_date,
                            invoice_due_date: editingDebt.invoice_due_date || undefined,
                            installment_count: editingDebt.installment_count,
                            installment_cents: editingDebt.installment_cents,
                          },
                        });
                      }
                    }}
                    style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#10B981', alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação de Exclusão (no centro da tela) */}
      <Modal
        visible={!!deletingDebtId}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeletingDebtId(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center' }}>
            <Text style={{ color: '#EF4444', fontSize: 48, marginBottom: 12 }}>🗑️</Text>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
              Excluir Dívida?
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
              Tem certeza que deseja excluir esta dívida permanentemente? Esta ação não pode ser desfeita.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                onPress={() => setDeletingDebtId(null)}
                style={{ flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#6b7280', alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (deletingDebtId) {
                    deleteDebtMut.mutate(deletingDebtId);
                    setDeletingDebtId(null);
                  }
                }}
                style={{ flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  summaryCard: { borderRadius: 12, padding: 14, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 11, marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: '800' },
  sourceRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  sourceText: { fontSize: 10, textAlign: 'center' },
  filtersScroll: { marginBottom: 12 },
  filters: { flexDirection: 'row', gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterText: { fontSize: 12, fontWeight: '600' },
  addBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  form: { padding: 16, borderRadius: 12, marginBottom: 16, gap: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14 },
  label: { fontSize: 12, marginTop: 4 },
  typesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  typeText: { fontSize: 12, fontWeight: '600' },
  submitBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  categoryGroup: { borderRadius: 12, padding: 14, marginBottom: 12 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  categoryName: { fontSize: 15, fontWeight: '700' },
  categoryTotal: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  overdueTag: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  overdueTagText: { color: '#991B1B', fontSize: 11, fontWeight: '600' },
  itemCard: { backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: 12, marginBottom: 8 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  itemDesc: { fontSize: 13, fontWeight: '600' },
  itemSupplier: { fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  itemDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemValue: { fontSize: 16, fontWeight: '800' },
  itemDate: { fontSize: 11 },
  itemActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14 },
});
