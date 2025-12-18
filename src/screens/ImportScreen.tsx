import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
// NOTA: Instalar dependências se necessário:
// npx expo install expo-document-picker expo-file-system
let DocumentPicker: any;
let FileSystem: any;
try {
  DocumentPicker = require('expo-document-picker');
  FileSystem = require('expo-file-system');
} catch (e) {
  console.warn('expo-document-picker ou expo-file-system não instalado');
}
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentCompanyId } from '../lib/company';
import { ImportWarning } from '../components/WarningBox';

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount_cents: number;
  type: 'income' | 'expense';
  suggested_category: string | null;
  selected: boolean;
}

interface BankFormat {
  key: string;
  name: string;
  icon: string;
  formats: string[];
  color: string;
}

const SUPPORTED_BANKS: BankFormat[] = [
  { key: 'nubank', name: 'Nubank', icon: '💜', formats: ['CSV'], color: '#8B5CF6' },
  { key: 'inter', name: 'Banco Inter', icon: '🧡', formats: ['CSV', 'OFX'], color: '#F97316' },
  { key: 'caixa', name: 'Caixa', icon: '💙', formats: ['OFX'], color: '#3B82F6' },
  { key: 'bb', name: 'Banco do Brasil', icon: '💛', formats: ['OFX'], color: '#F59E0B' },
  { key: 'itau', name: 'Itaú', icon: '🧡', formats: ['OFX'], color: '#F97316' },
  { key: 'bradesco', name: 'Bradesco', icon: '❤️', formats: ['OFX'], color: '#EF4444' },
  { key: 'santander', name: 'Santander', icon: '❤️', formats: ['OFX'], color: '#EF4444' },
  { key: 'generic', name: 'Outro Banco', icon: '🏦', formats: ['CSV', 'OFX'], color: '#6B7280' },
];

// Palavras-chave para categorização automática
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Alimentação': ['restaurante', 'lanchonete', 'padaria', 'mercado', 'supermercado', 'ifood', 'rappi', 'uber eats', 'mcdonald', 'burger'],
  'Transporte': ['uber', '99', 'combustível', 'gasolina', 'estacionamento', 'pedágio', 'metro', 'onibus'],
  'Moradia': ['aluguel', 'condomínio', 'iptu', 'luz', 'energia', 'água', 'gás', 'internet'],
  'Saúde': ['farmácia', 'drogaria', 'hospital', 'clínica', 'médico', 'dentista', 'plano de saúde'],
  'Educação': ['escola', 'faculdade', 'curso', 'livro', 'material escolar'],
  'Lazer': ['cinema', 'teatro', 'show', 'netflix', 'spotify', 'amazon prime', 'disney'],
  'Compras': ['loja', 'shopping', 'magazine', 'americanas', 'casas bahia', 'mercado livre'],
  'Serviços': ['assinatura', 'mensalidade', 'taxa', 'tarifa'],
  'Salário': ['salário', 'pagamento', 'remuneração', 'pró-labore'],
  'Vendas': ['venda', 'recebimento', 'pix recebido', 'transferência recebida'],
};

export default function ImportScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const queryClient = useQueryClient();

  const [selectedBank, setSelectedBank] = useState<BankFormat | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [importStats, setImportStats] = useState({ total: 0, income: 0, expense: 0 });

  // Cores dinâmicas
  const colors = {
    background: theme.background,
    cardBg: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    border: theme.border,
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  // Função para sugerir categoria baseada na descrição
  const suggestCategory = (description: string): string | null => {
    const lowerDesc = description.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => lowerDesc.includes(keyword))) {
        return category;
      }
    }
    return null;
  };

  // Parser para CSV do Nubank
  const parseNubankCSV = (content: string): ParsedTransaction[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const transactions: ParsedTransaction[] = [];

    // Pular header
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 3) {
        const date = parts[0].trim();
        const description = parts[1].trim().replace(/"/g, '');
        const amountStr = parts[2].trim().replace(/"/g, '').replace('R$', '').replace('.', '').replace(',', '.');
        const amount = parseFloat(amountStr);

        if (!isNaN(amount)) {
          const amountCents = Math.abs(Math.round(amount * 100));
          const type = amount < 0 ? 'expense' : 'income';

          transactions.push({
            id: `import-${i}`,
            date: formatDateForDB(date),
            description,
            amount_cents: amountCents,
            type,
            suggested_category: suggestCategory(description),
            selected: true,
          });
        }
      }
    }

    return transactions;
  };

  // Parser para CSV genérico
  const parseGenericCSV = (content: string): ParsedTransaction[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const transactions: ParsedTransaction[] = [];

    // Tentar detectar formato
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/[,;]/);
      if (parts.length >= 3) {
        // Tentar encontrar data, descrição e valor
        let date = '';
        let description = '';
        let amount = 0;

        for (const part of parts) {
          const trimmed = part.trim().replace(/"/g, '');

          // Detectar data (formato DD/MM/YYYY ou YYYY-MM-DD)
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed) || /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            date = trimmed;
          }
          // Detectar valor
          else if (/^-?R?\$?\s*[\d.,]+$/.test(trimmed)) {
            const numStr = trimmed.replace(/[R$\s]/g, '').replace('.', '').replace(',', '.');
            const num = parseFloat(numStr);
            if (!isNaN(num)) amount = num;
          }
          // Resto é descrição
          else if (trimmed.length > 3 && !description) {
            description = trimmed;
          }
        }

        if (date && description && amount !== 0) {
          const amountCents = Math.abs(Math.round(amount * 100));
          const type = amount < 0 ? 'expense' : 'income';

          transactions.push({
            id: `import-${i}`,
            date: formatDateForDB(date),
            description,
            amount_cents: amountCents,
            type,
            suggested_category: suggestCategory(description),
            selected: true,
          });
        }
      }
    }

    return transactions;
  };

  // Parser para OFX
  const parseOFX = (content: string): ParsedTransaction[] => {
    const transactions: ParsedTransaction[] = [];

    // Regex para encontrar transações OFX
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;
    let index = 0;

    while ((match = stmtTrnRegex.exec(content)) !== null) {
      const trnContent = match[1];

      // Extrair campos
      const typeMatch = trnContent.match(/<TRNTYPE>(\w+)/i);
      const dateMatch = trnContent.match(/<DTPOSTED>(\d{8})/i);
      const amountMatch = trnContent.match(/<TRNAMT>(-?[\d.]+)/i);
      const memoMatch = trnContent.match(/<MEMO>([^<]+)/i);
      const nameMatch = trnContent.match(/<NAME>([^<]+)/i);

      if (dateMatch && amountMatch) {
        const dateStr = dateMatch[1];
        const date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
        const amount = parseFloat(amountMatch[1]);
        const description = memoMatch?.[1] || nameMatch?.[1] || 'Transação importada';

        const amountCents = Math.abs(Math.round(amount * 100));
        const type = amount < 0 ? 'expense' : 'income';

        transactions.push({
          id: `import-${index++}`,
          date,
          description: description.trim(),
          amount_cents: amountCents,
          type,
          suggested_category: suggestCategory(description),
          selected: true,
        });
      }
    }

    return transactions;
  };

  // Formatar data para o banco
  const formatDateForDB = (dateStr: string): string => {
    // Se já está no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Converter DD/MM/YYYY para YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  // Selecionar arquivo
  const pickFile = async () => {
    if (!DocumentPicker || !FileSystem) {
      Alert.alert(
        'Funcionalidade indisponível',
        'A importação de arquivos requer as bibliotecas expo-document-picker e expo-file-system, que parecem não estar instaladas ou não são suportadas neste ambiente.'
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/x-ofx', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      setIsProcessing(true);

      // Ler conteúdo do arquivo
      const content = await FileSystem.readAsStringAsync(file.uri);

      let transactions: ParsedTransaction[] = [];

      // Detectar formato e parsear
      if (file.name?.toLowerCase().endsWith('.ofx') || content.includes('<OFX>')) {
        transactions = parseOFX(content);
      } else if (file.name?.toLowerCase().endsWith('.csv') || content.includes(',')) {
        if (selectedBank?.key === 'nubank') {
          transactions = parseNubankCSV(content);
        } else {
          transactions = parseGenericCSV(content);
        }
      } else {
        transactions = parseGenericCSV(content);
      }

      if (transactions.length === 0) {
        Alert.alert('Erro', 'Não foi possível identificar transações no arquivo. Verifique o formato.');
        setIsProcessing(false);
        return;
      }

      // Calcular estatísticas
      const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount_cents, 0);
      const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount_cents, 0);

      setImportStats({
        total: transactions.length,
        income,
        expense,
      });

      setParsedTransactions(transactions);
      setShowPreviewModal(true);
      setIsProcessing(false);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      Alert.alert('Erro', 'Não foi possível processar o arquivo');
      setIsProcessing(false);
    }
  };

  // Mutation para importar transações
  const importMutation = useMutation({
    mutationFn: async (transactions: ParsedTransaction[]) => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não encontrada');

      const selectedTxs = transactions.filter(t => t.selected);

      // Inserir em lotes de 50
      const batchSize = 50;
      for (let i = 0; i < selectedTxs.length; i += batchSize) {
        const batch = selectedTxs.slice(i, i + batchSize).map(tx => ({
          company_id: companyId,
          description: tx.description,
          amount_cents: tx.amount_cents,
          type: tx.type,
          date: tx.date,
          category_id: null, // TODO: mapear categorias
        }));

        const { error } = await supabase.from('transactions').insert(batch);
        if (error) throw error;
      }

      return { imported: selectedTxs.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowPreviewModal(false);
      setParsedTransactions([]);
      Alert.alert('Sucesso', `${data.imported} transações importadas com sucesso!`);
    },
    onError: (error) => {
      Alert.alert('Erro', 'Não foi possível importar as transações');
      console.error(error);
    },
  });

  // Toggle seleção de transação
  const toggleTransaction = (id: string) => {
    setParsedTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t)
    );
  };

  // Selecionar/desselecionar todas
  const toggleAll = (selected: boolean) => {
    setParsedTransactions(prev => prev.map(t => ({ ...t, selected })));
  };

  // Formatar valor
  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Formatar data para exibição
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const selectedCount = parsedTransactions.filter(t => t.selected).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={[styles.header, { alignItems: 'center' }]}>
          <Text style={[styles.headerTitle, { color: isDark ? theme.primary : theme.negative, textAlign: 'center' }]}>
            📄 Importar Extrato
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
            Importe transações de extratos bancários
          </Text>
        </View>

        {/* Instruções */}
        <View style={[styles.instructionsCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
          <Text style={styles.instructionsIcon}>💡</Text>
          <View style={styles.instructionsContent}>
            <Text style={[styles.instructionsTitle, { color: colors.text }]}>
              Como funciona
            </Text>
            <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
              1. Selecione seu banco abaixo{'\n'}
              2. Faça upload do extrato (CSV ou OFX){'\n'}
              3. Revise as transações detectadas{'\n'}
              4. Importe com 1 clique!
            </Text>
          </View>
        </View>

        {/* Warning Box */}
        <ImportWarning />

        {/* Seleção de Banco */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🏦 Selecione seu Banco
          </Text>
          <View style={styles.banksGrid}>
            {SUPPORTED_BANKS.map((bank) => (
              <TouchableOpacity
                key={bank.key}
                style={[
                  styles.bankCard,
                  {
                    backgroundColor: selectedBank?.key === bank.key ? bank.color + '20' : colors.cardBg,
                    borderColor: selectedBank?.key === bank.key ? bank.color : colors.border,
                  }
                ]}
                onPress={() => setSelectedBank(bank)}
              >
                <Text style={styles.bankIcon}>{bank.icon}</Text>
                <Text style={[styles.bankName, { color: colors.text }]}>{bank.name}</Text>
                <Text style={[styles.bankFormats, { color: colors.textSecondary }]}>
                  {bank.formats.join(', ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Botão de Upload */}
        {selectedBank && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: colors.primary }]}
              onPress={pickFile}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.uploadIcon}>📁</Text>
                  <Text style={styles.uploadText}>Selecionar Arquivo</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={[styles.uploadHint, { color: colors.textSecondary }]}>
              Formatos aceitos: {selectedBank.formats.join(', ')}
            </Text>
          </View>
        )}

        {/* Dicas por Banco */}
        {selectedBank && (
          <View style={[styles.tipsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>
              📌 Dica para {selectedBank.name}
            </Text>
            <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
              {selectedBank.key === 'nubank' && 'No app Nubank, vá em Configurações > Exportar extrato > CSV'}
              {selectedBank.key === 'inter' && 'No app Inter, vá em Extrato > Exportar > OFX ou CSV'}
              {selectedBank.key === 'caixa' && 'No Internet Banking, vá em Conta Corrente > Extrato > Exportar OFX'}
              {selectedBank.key === 'bb' && 'No app BB, vá em Extrato > Menu > Exportar OFX'}
              {selectedBank.key === 'itau' && 'No Internet Banking, vá em Conta > Extrato > Exportar OFX'}
              {selectedBank.key === 'bradesco' && 'No Internet Banking, vá em Conta Corrente > Extrato > Exportar'}
              {selectedBank.key === 'santander' && 'No Internet Banking, vá em Conta > Extrato > Download OFX'}
              {selectedBank.key === 'generic' && 'Exporte seu extrato no formato CSV ou OFX do seu banco'}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Preview */}
      <Modal
        visible={showPreviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.danger }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Revisar Importação
            </Text>
            <TouchableOpacity
              onPress={() => importMutation.mutate(parsedTransactions)}
              disabled={importMutation.isPending || selectedCount === 0}
            >
              <Text style={[styles.modalSave, { color: selectedCount > 0 ? colors.primary : colors.textSecondary }]}>
                {importMutation.isPending ? 'Importando...' : `Importar (${selectedCount})`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Resumo */}
          <View style={[styles.summaryCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{importStats.total}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{formatCurrency(importStats.income)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Entradas</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.danger }]}>{formatCurrency(importStats.expense)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Saídas</Text>
            </View>
          </View>

          {/* Ações em lote */}
          <View style={styles.batchActions}>
            <TouchableOpacity
              style={[styles.batchBtn, { backgroundColor: colors.success + '20' }]}
              onPress={() => toggleAll(true)}
            >
              <Text style={[styles.batchBtnText, { color: colors.success }]}>✓ Selecionar Todas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchBtn, { backgroundColor: colors.danger + '20' }]}
              onPress={() => toggleAll(false)}
            >
              <Text style={[styles.batchBtnText, { color: colors.danger }]}>✗ Desmarcar Todas</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Transações */}
          <ScrollView style={styles.transactionsList}>
            {parsedTransactions.map((tx) => (
              <TouchableOpacity
                key={tx.id}
                style={[
                  styles.transactionCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: tx.selected ? colors.primary : colors.border,
                    opacity: tx.selected ? 1 : 0.5,
                  }
                ]}
                onPress={() => toggleTransaction(tx.id)}
              >
                <View style={[
                  styles.checkbox,
                  {
                    backgroundColor: tx.selected ? colors.primary : 'transparent',
                    borderColor: tx.selected ? colors.primary : colors.border,
                  }
                ]}>
                  {tx.selected && <Text style={styles.checkmark}>✓</Text>}
                </View>

                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionDesc, { color: colors.text }]} numberOfLines={1}>
                    {tx.description}
                  </Text>
                  <View style={styles.transactionMeta}>
                    <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                      {formatDate(tx.date)}
                    </Text>
                    {tx.suggested_category && (
                      <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.categoryText, { color: colors.primary }]}>
                          {tx.suggested_category}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={[
                  styles.transactionAmount,
                  { color: tx.type === 'income' ? colors.success : colors.danger }
                ]}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount_cents)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  instructionsCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  instructionsIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  instructionsContent: {
    flex: 1,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 13,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  banksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bankCard: {
    width: '31%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  bankIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  bankName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  bankFormats: {
    fontSize: 10,
    marginTop: 2,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    gap: 10,
  },
  uploadIcon: {
    fontSize: 24,
  },
  uploadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  uploadHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  tipsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryCard: {
    flexDirection: 'row',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  batchActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  batchBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  batchBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  transactionsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  transactionDate: {
    fontSize: 12,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
