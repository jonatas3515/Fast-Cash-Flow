import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useToast } from '../ui/ToastProvider';
import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';
import { formatCentsBRL, parseBRLToCents, maskBRLInput } from '../utils/money';
import ScreenTitle from '../components/ScreenTitle';
import FilterHeader, { normalizeText } from '../components/FilterHeader';

interface ReceiptItem {
  id: string;
  product_id?: string;
  code: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  subtotal_cents: number;
}

interface Client {
  id: string;
  name: string;
  cpf_cnpj: string | null;
  phone: string | null;
  email?: string | null;
}

interface Product {
  id: string;
  code: string | null;
  name: string;
  price_cents: number;
  unit: string;
  stock_quantity: number;
}

const PAYMENT_METHODS = [
  { key: 'cash', label: '💵 Dinheiro', color: '#10b981' },
  { key: 'debit', label: '💳 Débito', color: '#3b82f6' },
  { key: 'credit', label: '💳 Crédito', color: '#8b5cf6' },
  { key: 'pix', label: '📱 PIX', color: '#06b6d4' },
  { key: 'other', label: '📋 Outro', color: '#6b7280' },
];

const PRINTER_TYPES = [
  { key: 'thermal58', label: 'Térmica 58mm', width: 32 },
  { key: 'thermal80', label: 'Térmica 80mm', width: 48 },
  { key: 'a4', label: 'A4 Comum', width: 80 },
];

const STATUS_OPTIONS = [
  { key: 'all', label: 'Todos', color: '#6b7280' },
  { key: 'issued', label: 'Emitidos', color: '#10b981' },
  { key: 'cancelled', label: 'Cancelados', color: '#ef4444' },
];

export default function ReceiptScreen({ navigation }: any) {
  const { theme } = useThemeCtx();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = React.useState<any>(null);

  // Abas
  const [activeTab, setActiveTab] = React.useState<'new' | 'history'>('new');

  // Estado do cupom
  const [items, setItems] = React.useState<ReceiptItem[]>([]);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [discountText, setDiscountText] = React.useState('');
  const [discountCents, setDiscountCents] = React.useState(0);

  // Múltiplas formas de pagamento
  const [payments, setPayments] = React.useState<{ method: string, amountCents: number, amountText: string }[]>([
    { method: 'cash', amountCents: 0, amountText: '' }
  ]);
  const [amountReceivedText, setAmountReceivedText] = React.useState(''); // Valor recebido em dinheiro
  const [amountReceivedCents, setAmountReceivedCents] = React.useState(0);
  const [notes, setNotes] = React.useState('');

  // Modais
  const [showAddItemModal, setShowAddItemModal] = React.useState(false);
  const [showClientModal, setShowClientModal] = React.useState(false);
  const [showPreviewModal, setShowPreviewModal] = React.useState(false);
  const [showPrintModal, setShowPrintModal] = React.useState(false);

  // Modal de confirmação inline (para web)
  const [confirmAction, setConfirmAction] = React.useState<{ type: 'cancel' | 'delete', receiptId: string } | null>(null);

  // Impressão
  const [selectedPrinterType, setSelectedPrinterType] = React.useState('thermal80');
  const [lastEmittedReceipt, setLastEmittedReceipt] = React.useState<any>(null);

  // Histórico
  const [historySearch, setHistorySearch] = React.useState('');
  const [historyFilter, setHistoryFilter] = React.useState('all');

  // Item sendo adicionado
  const [newItem, setNewItem] = React.useState({
    description: '',
    quantity: '1',
    unit_price: '',
    unit: 'UN',
  });
  const [searchProduct, setSearchProduct] = React.useState('');
  const [searchClient, setSearchClient] = React.useState('');

  React.useEffect(() => {
    (async () => {
      const id = await getCurrentCompanyId();
      if (id) {
        setCompanyId(id);
        const { data } = await supabase
          .from('companies')
          .select('name, phone, email, address, cnpj, owner_name')
          .eq('id', id)
          .single();
        if (data) setCompanyInfo(data);
      }
    })();
  }, []);

  // Query clientes
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients-receipt', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, cpf_cnpj, phone, email')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Query produtos
  const { data: products = [] } = useQuery({
    queryKey: ['products-receipt', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, code, name, price_cents, unit, stock_quantity')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Query histórico
  const { data: receipts = [], isLoading: loadingReceipts } = useQuery({
    queryKey: ['receipts-history', companyId],
    enabled: !!companyId && activeTab === 'history',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*, receipt_items(*)')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Filtrar histórico
  const filteredReceipts = React.useMemo(() => {
    let filtered = [...receipts];
    if (historyFilter !== 'all') {
      filtered = filtered.filter(r => r.status === historyFilter);
    }
    if (historySearch.trim()) {
      const search = normalizeText(historySearch);
      filtered = filtered.filter(r =>
        normalizeText(r.client_name || '').includes(search) ||
        String(r.receipt_number).includes(search)
      );
    }
    return filtered;
  }, [receipts, historyFilter, historySearch]);

  // Cálculos
  const subtotal = items.reduce((sum, item) => sum + item.subtotal_cents, 0);
  const total = subtotal - discountCents;

  // Calcular totais por forma de pagamento
  const totalPaid = payments.reduce((sum, p) => sum + p.amountCents, 0);
  const remaining = Math.max(0, total - totalPaid);

  // Variáveis de compatibilidade com código existente
  const paymentMethod = payments[0]?.method || 'cash';
  const hasCashPayment = payments.some(p => p.method === 'cash');
  const cashPayment = payments.find(p => p.method === 'cash');
  const change = hasCashPayment && amountReceivedCents > 0
    ? Math.max(0, amountReceivedCents - (cashPayment?.amountCents || total))
    : 0;

  // Helper para manter compatibilidade
  const setPaymentMethod = (method: string) => {
    setPayments([{ method, amountCents: total, amountText: formatCentsBRL(total).replace('R$ ', '') }]);
  };

  // Funções para gerenciar múltiplos pagamentos
  const addPayment = (method: string) => {
    if (!payments.find(p => p.method === method)) {
      setPayments([...payments, { method, amountCents: 0, amountText: '' }]);
    }
  };

  const removePayment = (method: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter(p => p.method !== method));
    }
  };

  const updatePaymentAmount = (method: string, amountText: string) => {
    const masked = maskBRLInput(amountText);
    const amountCents = parseBRLToCents(masked);
    setPayments(payments.map(p =>
      p.method === method ? { ...p, amountCents, amountText: masked } : p
    ));
  };

  const togglePaymentMethod = (method: string) => {
    const exists = payments.find(p => p.method === method);
    if (exists) {
      if (payments.length > 1) {
        setPayments(payments.filter(p => p.method !== method));
      }
    } else {
      setPayments([...payments, { method, amountCents: 0, amountText: '' }]);
    }
  };

  // Filtrar produtos e clientes
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(searchProduct.toLowerCase()))
  );

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchClient.toLowerCase()) ||
    (c.cpf_cnpj && c.cpf_cnpj.includes(searchClient))
  );

  // Adicionar item do produto
  const addProductItem = (product: Product) => {
    const newReceiptItem: ReceiptItem = {
      id: Date.now().toString(),
      product_id: product.id,
      code: product.code || '',
      description: product.name,
      quantity: 1,
      unit: product.unit,
      unit_price_cents: product.price_cents,
      subtotal_cents: product.price_cents,
    };
    setItems([...items, newReceiptItem]);
    setShowAddItemModal(false);
    setSearchProduct('');
    toast.show('Item adicionado!', 'success');
  };

  // Adicionar item manual
  const addManualItem = () => {
    if (!newItem.description.trim()) {
      toast.show('Informe a descrição do item', 'error');
      return;
    }
    const priceCents = parseBRLToCents(newItem.unit_price);
    const qty = parseFloat(newItem.quantity) || 1;

    const newReceiptItem: ReceiptItem = {
      id: Date.now().toString(),
      code: '',
      description: newItem.description,
      quantity: qty,
      unit: newItem.unit,
      unit_price_cents: priceCents,
      subtotal_cents: Math.round(priceCents * qty),
    };
    setItems([...items, newReceiptItem]);
    setNewItem({ description: '', quantity: '1', unit_price: '', unit: 'UN' });
    setShowAddItemModal(false);
    toast.show('Item adicionado!', 'success');
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, newQty: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity: newQty,
          subtotal_cents: Math.round(item.unit_price_cents * newQty),
        };
      }
      return item;
    }));
  };

  // Mutation emitir cupom (SEM criar transação automática)
  const emitMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID não encontrado');
      if (items.length === 0) throw new Error('Adicione pelo menos um item');

      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          company_id: companyId,
          client_id: selectedClient?.id || null,
          client_name: selectedClient?.name || 'Consumidor Final',
          client_cpf_cnpj: selectedClient?.cpf_cnpj || null,
          subtotal_cents: subtotal,
          discount_cents: discountCents,
          total_cents: total,
          payment_method: payments.length > 0 ? payments[0].method : 'cash',
          amount_received_cents: payments.reduce((sum, p) => sum + (p.amountCents || 0), 0),
          change_cents: Math.max(0, payments.reduce((sum, p) => sum + (p.amountCents || 0), 0) - total),
          notes: notes || null,
          status: 'issued',
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      const receiptItems = items.map((item, index) => ({
        receipt_id: receipt.id,
        product_id: item.product_id || null,
        item_number: index + 1,
        code: item.code || null,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price_cents: item.unit_price_cents,
        subtotal_cents: item.subtotal_cents,
      }));

      const { error: itemsError } = await supabase
        .from('receipt_items')
        .insert(receiptItems);

      if (itemsError) throw itemsError;

      // Atualizar estoque
      for (const item of items) {
        if (item.product_id) {
          const product = products.find(p => p.id === item.product_id);
          if (product) {
            await supabase
              .from('products')
              .update({
                stock_quantity: Math.max(0, product.stock_quantity - item.quantity),
              })
              .eq('id', item.product_id);
          }
        }
      }

      return { ...receipt, receipt_items: receiptItems };
    },
    onSuccess: (receipt) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['receipts-history'] });
      toast.show(`Cupom #${receipt.receipt_number} emitido!`, 'success');

      setLastEmittedReceipt(receipt);
      setShowPreviewModal(false);
      setShowPrintModal(true);

      setItems([]);
      setSelectedClient(null);
      setDiscountText('');
      setDiscountCents(0);
      setPaymentMethod('cash');
      setAmountReceivedText('');
      setAmountReceivedCents(0);
      setNotes('');
    },
    onError: (err: any) => {
      toast.show('Erro: ' + err.message, 'error');
    },
  });

  // Mutation cancelar cupom
  const cancelReceiptMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      const { error } = await supabase
        .from('receipts')
        .update({ status: 'cancelled' })
        .eq('id', receiptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts-history'] });
      toast.show('Cupom cancelado!', 'success');
    },
  });

  // Mutation excluir cupom definitivamente
  const deleteReceiptMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      // Primeiro excluir os itens do cupom
      const { error: itemsError } = await supabase
        .from('receipt_items')
        .delete()
        .eq('receipt_id', receiptId);
      if (itemsError) throw itemsError;

      // Depois excluir o cupom
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts-history'] });
      toast.show('Cupom excluído definitivamente!', 'success');
    },
    onError: (err: any) => {
      toast.show('Erro ao excluir: ' + err.message, 'error');
    },
  });

  // Estado para loading do WhatsApp
  const [whatsappLoading, setWhatsappLoading] = React.useState(false);

  // Enviar WhatsApp com imagem
  const sendToWhatsApp = async (receipt: any, phone?: string) => {
    if (Platform.OS === 'web') {
      setWhatsappLoading(true);
      try {
        // Gerar imagem do cupom usando Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas não suportado');

        const printerConfig = PRINTER_TYPES.find(p => p.key === selectedPrinterType);
        const lineWidth = printerConfig?.width || 48;
        const fontSize = 14;
        const lineHeight = fontSize * 1.4;
        const padding = 20;
        const charWidth = fontSize * 0.6;

        // Gerar linhas do cupom
        const lines = generateReceiptLines(receipt);

        // Calcular dimensões
        const canvasWidth = Math.max(lineWidth * charWidth + padding * 2, 400);
        const canvasHeight = lines.length * lineHeight + padding * 2 + 40;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Fundo branco
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Configurar fonte
        ctx.font = `${fontSize}px 'Courier New', monospace`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';

        // Desenhar linhas
        lines.forEach((line, index) => {
          const y = padding + (index + 1) * lineHeight;
          ctx.fillText(line, padding, y);
        });

        // Converter para blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Falha ao gerar imagem'));
          }, 'image/png', 1.0);
        });

        // Criar arquivo para compartilhar
        const file = new File([blob], `cupom_${receipt.receipt_number}.png`, { type: 'image/png' });

        // Verificar se Web Share API está disponível
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Cupom #${receipt.receipt_number}`,
            text: `Cupom Fiscal - ${companyInfo?.name || 'Fast Cash Flow'}`,
          });
          toast.show('Imagem compartilhada!', 'success');
        } else {
          // Fallback: baixar imagem e abrir WhatsApp com texto
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `cupom_${receipt.receipt_number}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          toast.show('Imagem baixada! Envie pelo WhatsApp.', 'success');

          // Abrir WhatsApp com texto
          const text = `🧾 *Cupom #${receipt.receipt_number}*\n${companyInfo?.name || ''}\n\nTotal: ${formatCentsBRL(receipt.total_cents)}\n\n_Imagem do cupom em anexo_`;
          const encodedText = encodeURIComponent(text);
          const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
          const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;

          setTimeout(() => {
            window.open(waUrl, '_blank');
          }, 500);
        }
      } catch (error: any) {
        console.error('Erro ao gerar imagem:', error);
        // Fallback para texto simples
        const text = generateReceiptText(receipt);
        const encodedText = encodeURIComponent(text);
        const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
        const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
        Linking.openURL(url);
        toast.show('Enviando como texto...', 'info');
      } finally {
        setWhatsappLoading(false);
      }
    } else {
      // Mobile: usar Share API
      const text = generateReceiptText(receipt);
      const encodedText = encodeURIComponent(text);
      const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
      const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
      Linking.openURL(url);
      toast.show('Abrindo WhatsApp...', 'success');
    }
  };

  // Gerar linhas do cupom para canvas - FORMATO COMPLETO
  const generateReceiptLines = (receipt?: any): string[] => {
    const printerConfig = PRINTER_TYPES.find(p => p.key === selectedPrinterType);
    const lineWidth = printerConfig?.width || 48;
    const separator = '='.repeat(lineWidth);
    const thinSeparator = '-'.repeat(lineWidth);

    const now = receipt ? new Date(receipt.created_at) : new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const centerText = (text: string) => {
      const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2));
      return ' '.repeat(padding) + text;
    };

    const rightAlign = (label: string, value: string, width: number = lineWidth) => {
      const spaces = Math.max(1, width - label.length - value.length);
      return label + ' '.repeat(spaces) + value;
    };

    // Para receipt histórico, usa os itens salvos; para novo cupom, usa items atuais
    const currentItems = receipt?.receipt_items || items;
    const currentTotal = receipt?.total_cents || total;
    const currentSubtotal = receipt?.subtotal_cents || subtotal;
    const currentDiscount = receipt?.discount_cents || discountCents;

    // Para novo cupom, soma todos os pagamentos
    const totalPayments = payments.reduce((sum, p) => sum + (p.amountCents || 0), 0);
    const currentReceivedCents = receipt?.amount_received_cents || totalPayments;
    const currentChange = receipt?.change_cents || (currentReceivedCents > currentTotal ? currentReceivedCents - currentTotal : 0);
    const currentPaymentMethod = receipt?.payment_method || (payments.length > 0 ? payments[0].method : 'cash');
    const currentHasCash = receipt?.payment_method === 'cash' || payments.some(p => p.method === 'cash');


    const lines: string[] = [];

    // CABEÇALHO
    lines.push(centerText(companyInfo?.name || 'EMPRESA'));

    // Nome do proprietário (se tiver)
    if (companyInfo?.owner_name) {
      lines.push(centerText(companyInfo.owner_name));
    }

    // Tipo de empresa
    lines.push(centerText('Microempreendedor Individual'));

    // Endereço
    if (companyInfo?.address) {
      lines.push(centerText(companyInfo.address));
    }

    // Telefone
    if (companyInfo?.phone) {
      lines.push(centerText(companyInfo.phone));
    }

    lines.push(separator);
    lines.push(centerText('Documento Auxiliar de Venda'));
    lines.push(centerText('CUPOM NÃO FISCAL'));
    lines.push(separator);

    // CABEÇALHO DA TABELA
    lines.push('Cod.    Descrição              Quant.   Total');

    // ITENS
    currentItems.forEach((item, index) => {
      const code = String(index + 1).padStart(3, '0');
      const desc = item.description.slice(0, 18).padEnd(18);
      const qty = String(item.quantity).padStart(5);
      const itemTotal = formatCentsBRL(item.subtotal_cents).replace('R$ ', '').padStart(8);
      lines.push(`${code}   ${desc}  ${qty}  ${itemTotal}`);
    });

    lines.push(thinSeparator);

    // RESUMO
    const totalQty = currentItems.reduce((sum, item) => sum + item.quantity, 0);
    lines.push(rightAlign('Quant. Total de Itens:', String(totalQty).padStart(3, '0')));
    lines.push(rightAlign('Valor Total R$:', formatCentsBRL(currentTotal).replace('R$ ', '')));

    // VALOR RECEBIDO E TROCO (para pagamento em dinheiro)
    if (currentHasCash) {
      // Se não preencheu valor recebido, usa o total (pagou exato)
      const effectiveReceived = currentReceivedCents > 0 ? currentReceivedCents : currentTotal;
      const effectiveChange = currentReceivedCents > currentTotal ? currentReceivedCents - currentTotal : 0;

      lines.push(rightAlign('Valor Recebido R$:', formatCentsBRL(effectiveReceived).replace('R$ ', '')));
      lines.push(thinSeparator);
      lines.push(rightAlign('Valor do Troco R$:', formatCentsBRL(effectiveChange).replace('R$ ', '')));
    }

    lines.push(thinSeparator);

    // FORMA DE PAGAMENTO (suporta múltiplos métodos)
    lines.push('Forma de Pagamento                 Valor Pago');

    // Se é um receipt histórico, usa o método salvo
    if (receipt?.payment_method) {
      const paymentLabel = PAYMENT_METHODS.find(p => p.key === receipt.payment_method)?.label || 'Dinheiro';
      lines.push(rightAlign(paymentLabel, formatCentsBRL(currentTotal)));
    } else {
      // Para novo cupom, lista todos os métodos selecionados com seus valores
      payments.forEach(p => {
        const paymentLabel = PAYMENT_METHODS.find(m => m.key === p.method)?.label || p.method;
        // Usa o valor digitado pelo usuário (amountCents) - sem fallback para total
        lines.push(rightAlign(paymentLabel, formatCentsBRL(p.amountCents)));
      });
    }

    lines.push(thinSeparator);

    // NOME DO CLIENTE
    const clientName = receipt?.client_name || selectedClient?.name || 'Consumidor Final';
    lines.push(centerText(`Cliente: ${clientName}`));

    lines.push(thinSeparator);

    // AGRADECIMENTO
    lines.push(centerText('OBRIGADO PELA PREFERÊNCIA!'));

    lines.push(thinSeparator);

    // DATA E HORA
    lines.push(centerText(`emitido em ${dateStr} - ${timeStr}`));

    return lines;
  };


  // Imprimir
  const printReceipt = (receipt: any) => {
    if (Platform.OS === 'web') {
      const text = generateReceiptText(receipt);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const printerConfig = PRINTER_TYPES.find(p => p.key === selectedPrinterType);
        const fontSize = printerConfig?.key === 'a4' ? '12px' : '10px';
        const width = printerConfig?.key === 'a4' ? '210mm' : printerConfig?.key === 'thermal80' ? '80mm' : '58mm';

        printWindow.document.write(`
          <html>
            <head><title>Cupom #${receipt.receipt_number}</title>
              <style>
                @page { size: ${width} auto; margin: 0; }
                body { font-family: 'Courier New', monospace; font-size: ${fontSize}; width: ${width}; margin: 0 auto; padding: 10px; white-space: pre-wrap; }
              </style>
            </head>
            <body>${text.replace(/\n/g, '<br>')}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } else {
      toast.show('Impressão disponível apenas na versão web', 'info');
    }
  };

  // Gerar texto do cupom - FORMATO COMPLETO
  const generateReceiptText = (receipt?: any) => {
    const printerConfig = PRINTER_TYPES.find(p => p.key === selectedPrinterType);
    const lineWidth = printerConfig?.width || 48;
    const separator = '='.repeat(lineWidth);
    const thinSeparator = '-'.repeat(lineWidth);

    const now = receipt ? new Date(receipt.created_at) : new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const centerText = (text: string) => {
      const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2));
      return ' '.repeat(padding) + text;
    };

    const rightAlign = (label: string, value: string, width: number = lineWidth) => {
      const spaces = Math.max(1, width - label.length - value.length);
      return label + ' '.repeat(spaces) + value;
    };

    // Para receipt histórico, usa os itens salvos; para novo cupom, usa items atuais
    const currentItems = receipt?.receipt_items || items;
    const currentTotal = receipt?.total_cents || total;

    // Para novo cupom, soma todos os pagamentos
    const totalPayments = payments.reduce((sum, p) => sum + (p.amountCents || 0), 0);
    const currentReceivedCents = receipt?.amount_received_cents || totalPayments;
    const currentChange = receipt?.change_cents || (currentReceivedCents > currentTotal ? currentReceivedCents - currentTotal : 0);
    const currentPaymentMethod = receipt?.payment_method || (payments.length > 0 ? payments[0].method : 'cash');
    const currentHasCash = receipt?.payment_method === 'cash' || payments.some(p => p.method === 'cash');


    // CABEÇALHO
    let text = centerText(companyInfo?.name || 'EMPRESA') + '\n';
    if (companyInfo?.owner_name) text += centerText(companyInfo.owner_name) + '\n';
    text += centerText('Microempreendedor Individual') + '\n';
    if (companyInfo?.address) text += centerText(companyInfo.address) + '\n';
    if (companyInfo?.phone) text += centerText(companyInfo.phone) + '\n';
    text += separator + '\n';
    text += centerText('Documento Auxiliar de Venda') + '\n';
    text += centerText('CUPOM NÃO FISCAL') + '\n';
    text += separator + '\n';

    // CABEÇALHO DA TABELA
    text += 'Cod.    Descrição              Quant.   Total\n';

    // ITENS
    currentItems.forEach((item, index) => {
      const code = String(index + 1).padStart(3, '0');
      const desc = item.description.slice(0, 18).padEnd(18);
      const qty = String(item.quantity).padStart(5);
      const itemTotal = formatCentsBRL(item.subtotal_cents).replace('R$ ', '').padStart(8);
      text += `${code}   ${desc}  ${qty}  ${itemTotal}\n`;
    });

    text += thinSeparator + '\n';

    // RESUMO
    const totalQty = currentItems.reduce((sum, item) => sum + item.quantity, 0);
    text += rightAlign('Quant. Total de Itens:', String(totalQty).padStart(3, '0')) + '\n';
    text += rightAlign('Valor Total R$:', formatCentsBRL(currentTotal).replace('R$ ', '')) + '\n';

    // VALOR RECEBIDO E TROCO (para pagamento em dinheiro)
    if (currentHasCash) {
      const effectiveReceived = currentReceivedCents > 0 ? currentReceivedCents : currentTotal;
      const effectiveChange = currentReceivedCents > currentTotal ? currentReceivedCents - currentTotal : 0;

      text += rightAlign('Valor Recebido R$:', formatCentsBRL(effectiveReceived).replace('R$ ', '')) + '\n';
      text += thinSeparator + '\n';
      text += rightAlign('Valor do Troco R$:', formatCentsBRL(effectiveChange).replace('R$ ', '')) + '\n';
    }

    text += thinSeparator + '\n';

    // FORMA DE PAGAMENTO (suporta múltiplos métodos)
    text += 'Forma de Pagamento                 Valor Pago\n';

    // Se é um receipt histórico, usa o método salvo
    if (receipt?.payment_method) {
      const paymentLabel = PAYMENT_METHODS.find(p => p.key === receipt.payment_method)?.label || 'Dinheiro';
      text += rightAlign(paymentLabel, formatCentsBRL(currentTotal)) + '\n';
    } else {
      // Para novo cupom, lista todos os métodos selecionados com seus valores
      payments.forEach(p => {
        const paymentLabel = PAYMENT_METHODS.find(m => m.key === p.method)?.label || p.method;
        // Usa o valor digitado pelo usuário (amountCents) - sem fallback para total
        text += rightAlign(paymentLabel, formatCentsBRL(p.amountCents)) + '\n';
      });
    }

    text += thinSeparator + '\n';

    // NOME DO CLIENTE
    const clientName = receipt?.client_name || selectedClient?.name || 'Consumidor Final';
    text += centerText(`Cliente: ${clientName}`) + '\n';

    text += thinSeparator + '\n';

    // AGRADECIMENTO
    text += centerText('OBRIGADO PELA PREFERÊNCIA!') + '\n';

    text += thinSeparator + '\n';

    // DATA E HORA
    text += centerText(`emitido em ${dateStr} - ${timeStr}`) + '\n';

    return text;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenTitle title="Cupom Fiscal" />

      {/* Abas */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('new')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'new' ? theme.primary : theme.textSecondary }]}>
            🧾 Novo Cupom
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'history' ? theme.primary : theme.textSecondary }]}>
            📋 Histórico ({receipts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'history' ? (
        <View style={styles.historyContainer}>
          <FilterHeader
            searchValue={historySearch}
            onSearchChange={setHistorySearch}
            searchPlaceholder="Buscar por cliente ou nº cupom..."
            filterOptions={STATUS_OPTIONS}
            activeFilter={historyFilter}
            onFilterChange={setHistoryFilter}
          />

          <Text style={[styles.counterText, { color: theme.textSecondary }]}>
            {filteredReceipts.length} cupom(ns) encontrado(s)
          </Text>

          {loadingReceipts ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
          ) : filteredReceipts.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryIcon}>🧾</Text>
              <Text style={[styles.emptyHistoryText, { color: theme.textSecondary }]}>
                Nenhum cupom encontrado
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredReceipts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isIssued = item.status === 'issued';
                return (
                  <View style={[styles.receiptCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.receiptCardHeader}>
                      <View>
                        <Text style={[styles.receiptNumber, { color: theme.text }]}>
                          Cupom #{String(item.receipt_number).padStart(6, '0')}
                        </Text>
                        <Text style={[styles.receiptDate, { color: theme.textSecondary }]}>
                          {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: isIssued ? '#10b98120' : '#ef444420' }]}>
                        <Text style={[styles.statusBadgeText, { color: isIssued ? '#10b981' : '#ef4444' }]}>
                          {isIssued ? 'Emitido' : 'Cancelado'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.receiptCardBody}>
                      <Text style={[styles.receiptClient, { color: theme.text }]}>👤 {item.client_name}</Text>
                      <Text style={[styles.receiptTotal, { color: theme.primary }]}>{formatCentsBRL(item.total_cents)}</Text>
                    </View>

                    <View style={[styles.receiptCardActions, { borderTopColor: theme.border }]}>
                      <TouchableOpacity
                        style={[styles.receiptActionBtn, { backgroundColor: theme.primary + '20' }]}
                        onPress={() => { setLastEmittedReceipt(item); setShowPrintModal(true); }}
                      >
                        <Text style={[styles.receiptActionText, { color: theme.primary }]}>🖨️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.receiptActionBtn, { backgroundColor: '#25D36620' }]}
                        onPress={() => sendToWhatsApp(item)}
                      >
                        <Text style={[styles.receiptActionText, { color: '#25D366' }]}>📱</Text>
                      </TouchableOpacity>
                      {isIssued && (
                        <TouchableOpacity
                          style={[styles.receiptActionBtn, { backgroundColor: '#ef444420' }]}
                          onPress={() => setConfirmAction({ type: 'cancel', receiptId: item.id })}
                        >
                          <Text style={[styles.receiptActionText, { color: '#ef4444' }]}>❌</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.receiptActionBtn, { backgroundColor: '#6b728020' }]}
                        onPress={() => setConfirmAction({ type: 'delete', receiptId: item.id })}
                      >
                        <Text style={[styles.receiptActionText, { color: '#6b7280' }]}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              contentContainerStyle={{ paddingBottom: 100 }}
            />
          )}
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Cliente */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Cliente</Text>
            <TouchableOpacity
              style={[styles.clientSelector, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => setShowClientModal(true)}
            >
              {selectedClient ? (
                <View style={styles.selectedClient}>
                  <Text style={[styles.clientName, { color: theme.text }]}>{selectedClient.name}</Text>
                  {selectedClient.cpf_cnpj && (
                    <Text style={[styles.clientDoc, { color: theme.textSecondary }]}>{selectedClient.cpf_cnpj}</Text>
                  )}
                </View>
              ) : (
                <Text style={[styles.clientPlaceholder, { color: theme.textSecondary }]}>
                  👤 Consumidor Final (toque para selecionar)
                </Text>
              )}
              <Text style={[styles.changeBtn, { color: theme.primary }]}>Alterar</Text>
            </TouchableOpacity>
          </View>

          {/* Itens */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Itens ({items.length})</Text>
              <TouchableOpacity
                style={[styles.addItemBtn, { backgroundColor: theme.primary }]}
                onPress={() => setShowAddItemModal(true)}
              >
                <Text style={styles.addItemBtnText}>➕ Adicionar</Text>
              </TouchableOpacity>
            </View>

            {items.length === 0 ? (
              <View style={[styles.emptyItems, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.emptyItemsText, { color: theme.textSecondary }]}>Nenhum item adicionado</Text>
              </View>
            ) : (
              <View style={[styles.itemsList, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {items.map((item, index) => (
                  <View key={item.id} style={[styles.itemRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemDesc, { color: theme.text }]} numberOfLines={1}>{item.description}</Text>
                      <Text style={[styles.itemPrice, { color: theme.textSecondary }]}>
                        {formatCentsBRL(item.unit_price_cents)} × {item.quantity} {item.unit}
                      </Text>
                    </View>
                    <View style={styles.itemActions}>
                      <Text style={[styles.itemTotal, { color: theme.primary }]}>{formatCentsBRL(item.subtotal_cents)}</Text>
                      <View style={styles.qtyControls}>
                        <TouchableOpacity
                          style={[styles.qtyBtn, { backgroundColor: theme.border }]}
                          onPress={() => item.quantity > 1 && updateItemQuantity(item.id, item.quantity - 1)}
                        >
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={[styles.qtyText, { color: theme.text }]}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={[styles.qtyBtn, { backgroundColor: theme.border }]}
                          onPress={() => updateItemQuantity(item.id, item.quantity + 1)}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => removeItem(item.id)}>
                        <Text style={styles.removeBtn}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Card de Totais e Pagamentos Integrado */}
          <View style={[styles.totalsBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Subtotal */}
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Subtotal:</Text>
              <Text style={[styles.totalValue, { color: theme.text }]}>{formatCentsBRL(subtotal)}</Text>
            </View>

            {/* Desconto */}
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Desconto:</Text>
              <TextInput
                style={[styles.discountInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                value={discountText}
                onChangeText={(v) => { const m = maskBRLInput(v); setDiscountText(m); setDiscountCents(parseBRLToCents(m)); }}
                placeholder="0,00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>

            {/* Separador visual antes dos métodos de pagamento */}
            <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 8 }} />

            {/* Botões de seleção de forma de pagamento */}
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 6 }}>Forma de pagamento:</Text>
            <View style={[styles.paymentMethods, { marginBottom: 8 }]}>
              {PAYMENT_METHODS.map((method) => {
                const isSelected = payments.some(p => p.method === method.key);
                return (
                  <TouchableOpacity
                    key={method.key}
                    style={[
                      styles.paymentBtn,
                      { borderColor: isSelected ? method.color : theme.border, paddingVertical: 6, paddingHorizontal: 10 },
                      isSelected && { backgroundColor: method.color + '20' }
                    ]}
                    onPress={() => togglePaymentMethod(method.key)}
                  >
                    <Text style={[styles.paymentBtnText, { color: isSelected ? method.color : theme.text, fontSize: 12 }]}>
                      {isSelected ? '✓ ' : ''}{method.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Campos de valor para cada método selecionado */}
            {payments.map((payment) => {
              const methodInfo = PAYMENT_METHODS.find(m => m.key === payment.method);
              return (
                <View key={payment.method} style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: methodInfo?.color || theme.textSecondary }]}>
                    {methodInfo?.label || payment.method}:
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TextInput
                      style={[styles.discountInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                      value={payment.amountText}
                      onChangeText={(v) => updatePaymentAmount(payment.method, v)}
                      placeholder="0,00"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="numeric"
                    />
                    {payments.length > 1 && (
                      <TouchableOpacity onPress={() => removePayment(payment.method)}>
                        <Text style={{ color: '#ef4444', fontSize: 16 }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {/* TOTAL */}
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={[styles.grandTotalLabel, { color: theme.text }]}>TOTAL:</Text>
              <Text style={[styles.grandTotalValue, { color: theme.primary }]}>{formatCentsBRL(total)}</Text>
            </View>

            {/* Troco - SEMPRE visível quando Dinheiro selecionado */}
            {hasCashPayment && (
              <View style={[styles.changeBox, { backgroundColor: (cashPayment?.amountCents || 0) > total ? '#10b98120' : theme.background, borderWidth: 1, borderColor: theme.border }]}>
                <Text style={[styles.changeLabel, { color: (cashPayment?.amountCents || 0) > total ? '#10b981' : theme.textSecondary }]}>Troco:</Text>
                <Text style={[styles.changeValue, { color: (cashPayment?.amountCents || 0) > total ? '#10b981' : theme.text }]}>
                  {formatCentsBRL(Math.max(0, (cashPayment?.amountCents || 0) - total))}
                </Text>
              </View>
            )}
          </View>

          {/* Botões */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.previewBtn, { borderColor: theme.primary }]}
              onPress={() => items.length > 0 && setShowPreviewModal(true)}
              disabled={items.length === 0}
            >
              <Text style={[styles.previewBtnText, { color: theme.primary }]}>👁️ Visualizar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emitBtn, { backgroundColor: items.length > 0 ? theme.primary : theme.border }]}
              onPress={() => items.length > 0 && setShowPreviewModal(true)}
              disabled={items.length === 0}
            >
              <Text style={[styles.emitBtnText, { color: items.length > 0 ? '#fff' : theme.textSecondary }]}>
                🧾 Emitir Cupom
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      )}

      {/* Modal Adicionar Item */}
      <Modal visible={showAddItemModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Adicionar Item</Text>
              <TouchableOpacity onPress={() => setShowAddItemModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Buscar Produto:</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={searchProduct}
              onChangeText={setSearchProduct}
              placeholder="Nome ou código..."
              placeholderTextColor={theme.textSecondary}
            />

            {searchProduct && filteredProducts.length > 0 && (
              <View style={[styles.productList, { borderColor: theme.border }]}>
                {filteredProducts.slice(0, 5).map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productItem, { borderBottomColor: theme.border }]}
                    onPress={() => addProductItem(product)}
                  >
                    <Text style={[styles.productName, { color: theme.text }]}>{product.name}</Text>
                    <Text style={[styles.productPrice, { color: theme.primary }]}>{formatCentsBRL(product.price_cents)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Ou adicione manualmente:</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={newItem.description}
              onChangeText={(v) => setNewItem({ ...newItem, description: v })}
              placeholder="Descrição do item"
              placeholderTextColor={theme.textSecondary}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Qtd:</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={newItem.quantity}
                  onChangeText={(v) => setNewItem({ ...newItem, quantity: v })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Preço:</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  value={newItem.unit_price}
                  onChangeText={(v) => setNewItem({ ...newItem, unit_price: maskBRLInput(v) })}
                  placeholder="0,00"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity style={[styles.addManualBtn, { backgroundColor: theme.primary }]} onPress={addManualItem}>
              <Text style={styles.addManualBtnText}>➕ Adicionar Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Selecionar Cliente */}
      <Modal visible={showClientModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Selecionar Cliente</Text>
              <TouchableOpacity onPress={() => setShowClientModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={searchClient}
              onChangeText={setSearchClient}
              placeholder="🔍 Buscar por nome ou CPF/CNPJ..."
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.newClientBtn, { backgroundColor: theme.primary }]}
              onPress={() => { setShowClientModal(false); navigation.navigate('CadastroCliente'); }}
            >
              <Text style={styles.newClientBtnText}>➕ Cadastrar Novo Cliente</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.clientOption, { borderColor: theme.primary, backgroundColor: theme.primary + '10' }]}
              onPress={() => { setSelectedClient(null); setShowClientModal(false); }}
            >
              <Text style={[styles.clientOptionText, { color: theme.primary }]}>👤 Consumidor Final</Text>
            </TouchableOpacity>

            {loadingClients ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={filteredClients}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.clientOption, { borderColor: theme.border }]}
                    onPress={() => { setSelectedClient(item); setShowClientModal(false); setSearchClient(''); }}
                  >
                    <Text style={[styles.clientOptionText, { color: theme.text }]}>{item.name}</Text>
                    {item.cpf_cnpj && <Text style={[styles.clientOptionDoc, { color: theme.textSecondary }]}>{item.cpf_cnpj}</Text>}
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 250 }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Preview */}
      <Modal visible={showPreviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.previewModal, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Pré-visualização</Text>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.previewScroll}>
              <View style={[styles.receiptPreview, { backgroundColor: '#fff' }]}>
                <Text style={styles.receiptText}>{generateReceiptText()}</Text>
              </View>
            </ScrollView>

            <View style={styles.previewActions}>
              <TouchableOpacity style={[styles.cancelPreviewBtn, { borderColor: theme.border }]} onPress={() => setShowPreviewModal(false)}>
                <Text style={[styles.cancelPreviewBtnText, { color: theme.text }]}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmEmitBtn, { backgroundColor: theme.primary }]}
                onPress={() => emitMutation.mutate()}
                disabled={emitMutation.isPending}
              >
                {emitMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmEmitBtnText}>✅ Emitir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Impressão */}
      <Modal visible={showPrintModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Cupom Emitido!</Text>
              <TouchableOpacity onPress={() => setShowPrintModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.printSuccessText, { color: '#10b981' }]}>✅ Cupom emitido com sucesso!</Text>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Tipo de Impressora:</Text>
            <View style={styles.printerTypes}>
              {PRINTER_TYPES.map((printer) => (
                <TouchableOpacity
                  key={printer.key}
                  style={[
                    styles.printerTypeBtn,
                    { borderColor: selectedPrinterType === printer.key ? theme.primary : theme.border },
                    selectedPrinterType === printer.key && { backgroundColor: theme.primary + '20' }
                  ]}
                  onPress={() => setSelectedPrinterType(printer.key)}
                >
                  <Text style={[styles.printerTypeText, { color: selectedPrinterType === printer.key ? theme.primary : theme.text }]}>
                    {printer.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.printActions}>
              <TouchableOpacity
                style={[styles.printActionBtn, { backgroundColor: theme.primary }]}
                onPress={() => lastEmittedReceipt && printReceipt(lastEmittedReceipt)}
              >
                <Text style={styles.printActionBtnText}>🖨️ Imprimir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.printActionBtn, { backgroundColor: '#25D366' }]}
                onPress={() => lastEmittedReceipt && sendToWhatsApp(lastEmittedReceipt, selectedClient?.phone || undefined)}
                disabled={whatsappLoading}
              >
                {whatsappLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.printActionBtnText}>📱 WhatsApp (Imagem)</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.closePrintBtn, { borderColor: theme.border }]}
                onPress={() => setShowPrintModal(false)}
              >
                <Text style={[styles.closePrintBtnText, { color: theme.textSecondary }]}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação Inline (funciona no web) */}
      <Modal visible={!!confirmAction} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, maxWidth: 400 }]}>
            <Text style={[styles.modalTitle, { color: theme.text, textAlign: 'center', marginBottom: 16 }]}>
              {confirmAction?.type === 'cancel' ? '❌ Cancelar Cupom' : '🗑️ Excluir Cupom'}
            </Text>
            <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 20, fontSize: 14 }}>
              {confirmAction?.type === 'cancel'
                ? 'Deseja cancelar este cupom? O cupom será marcado como cancelado.'
                : 'Deseja EXCLUIR DEFINITIVAMENTE este cupom? Esta ação não pode ser desfeita.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
              <TouchableOpacity
                style={[styles.prettyBtn, { backgroundColor: theme.border, paddingHorizontal: 24 }]}
                onPress={() => setConfirmAction(null)}
              >
                <Text style={{ color: theme.text, fontWeight: '600' }}>Não</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.prettyBtn, { backgroundColor: confirmAction?.type === 'cancel' ? '#ef4444' : '#6b7280', paddingHorizontal: 24 }]}
                onPress={() => {
                  if (confirmAction) {
                    if (confirmAction.type === 'cancel') {
                      cancelReceiptMutation.mutate(confirmAction.receiptId);
                    } else {
                      deleteReceiptMutation.mutate(confirmAction.receiptId);
                    }
                    setConfirmAction(null);
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  {confirmAction?.type === 'cancel' ? 'Cancelar' : 'Excluir'}
                </Text>
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
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 15, fontWeight: '600' },
  historyContainer: { flex: 1, padding: 16 },
  counterText: { fontSize: 14, marginVertical: 10 },
  emptyHistory: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyHistoryIcon: { fontSize: 56, marginBottom: 16 },
  emptyHistoryText: { fontSize: 16, lineHeight: 24 },
  receiptCard: { borderWidth: 1, borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
  receiptCardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  receiptNumber: { fontSize: 16, fontWeight: '700' },
  receiptDate: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  receiptCardBody: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 14 },
  receiptClient: { fontSize: 14, lineHeight: 20 },
  receiptTotal: { fontSize: 18, fontWeight: '800' },
  receiptCardActions: { flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 },
  receiptActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  receiptActionText: { fontSize: 18 },
  scrollView: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 14, marginBottom: 8, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  clientSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, padding: 16 },
  selectedClient: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600' },
  clientDoc: { fontSize: 13, marginTop: 4 },
  clientPlaceholder: { fontSize: 15 },
  changeBtn: { fontSize: 14, fontWeight: '600' },
  addItemBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addItemBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyItems: { borderWidth: 1, borderRadius: 10, padding: 36, alignItems: 'center', borderStyle: 'dashed' },
  emptyItemsText: { fontSize: 15, lineHeight: 22 },
  itemsList: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  itemInfo: { flex: 1 },
  itemDesc: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  itemPrice: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemTotal: { fontSize: 15, fontWeight: '600', minWidth: 80, textAlign: 'right' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 20, fontWeight: '600' },
  qtyText: { fontSize: 15, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  removeBtn: { fontSize: 20 },
  totalsBox: { borderWidth: 1, borderRadius: 12, padding: 18, marginBottom: 24 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalLabel: { fontSize: 15, lineHeight: 22 },
  totalValue: { fontSize: 16, fontWeight: '600' },
  discountInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, width: 110, textAlign: 'right' },
  grandTotal: { borderTopWidth: 1, paddingTop: 14, marginTop: 8, marginBottom: 0 },
  grandTotalLabel: { fontSize: 20, fontWeight: '700' },
  grandTotalValue: { fontSize: 26, fontWeight: '800' },
  paymentMethods: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentBtn: { borderWidth: 2, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
  paymentBtnText: { fontSize: 14, fontWeight: '600' },
  cashSection: { marginTop: 14 },
  changeBox: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 10, marginTop: 12 },
  changeLabel: { fontSize: 15, fontWeight: '600' },
  changeValue: { fontSize: 18, fontWeight: '700' },
  buttonsContainer: { flexDirection: 'row', gap: 12 },
  previewBtn: { flex: 1, borderWidth: 2, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  previewBtnText: { fontSize: 16, fontWeight: '600' },
  emitBtn: { flex: 2, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  emitBtnText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  previewModal: { maxHeight: '90%', maxWidth: 420, alignSelf: 'center', width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalClose: { fontSize: 28, color: '#6b7280' },
  productList: { borderWidth: 1, borderRadius: 10, marginTop: 10, maxHeight: 220 },
  productItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  productName: { fontSize: 15, fontWeight: '500' },
  productPrice: { fontSize: 15, fontWeight: '600' },
  divider: { height: 1, marginVertical: 18 },
  addManualBtn: { borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 14 },
  addManualBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  newClientBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginVertical: 12 },
  newClientBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  clientOption: { borderWidth: 1, borderRadius: 10, padding: 16, marginBottom: 10 },
  clientOptionText: { fontSize: 15, fontWeight: '500' },
  clientOptionDoc: { fontSize: 13, marginTop: 4 },
  previewScroll: { maxHeight: 520 },
  receiptPreview: { padding: 20, borderRadius: 10 },
  // IMPROVED LEGIBILITY: Larger font size and better line height for receipt text
  receiptText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13, color: '#000', lineHeight: 20 },
  previewActions: { flexDirection: 'row', gap: 14, marginTop: 18 },
  cancelPreviewBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  cancelPreviewBtnText: { fontSize: 16, fontWeight: '600' },
  confirmEmitBtn: { flex: 2, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  confirmEmitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  printSuccessText: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 18, lineHeight: 26 },
  printerTypes: { flexDirection: 'row', gap: 10, marginTop: 10 },
  printerTypeBtn: { flex: 1, borderWidth: 2, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  printerTypeText: { fontSize: 13, fontWeight: '600' },
  printActions: { marginTop: 24, gap: 12 },
  printActionBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  printActionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  closePrintBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  closePrintBtnText: { fontSize: 16, fontWeight: '600' },
  prettyBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, alignItems: 'center' },
});
