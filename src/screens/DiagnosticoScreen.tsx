import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { getDb } from '../lib/db';
import { getCurrentCompanyId } from '../lib/company';
import * as SecureStore from 'expo-secure-store';

export default function DiagnosticoScreen() {
  const { theme } = useThemeCtx();
  const [diagnostico, setDiagnostico] = React.useState<string>('Clique em "Executar Diagnóstico"');
  const [loading, setLoading] = React.useState(false);

  const executarDiagnostico = async () => {
    setLoading(true);
    let resultado = '🔍 DIAGNÓSTICO ANDROID - FASTSAVORYS\n\n';
    let dirtyRows: any[] = [];
    let insertError: any = null;

    try {
      // 1. Platform
      resultado += `📱 Platform: ${Platform.OS}\n\n`;

      // 2. Company ID do Storage
      let companyIdStorage = null;
      if (typeof window !== 'undefined') {
        companyIdStorage = window.localStorage.getItem('auth_company_id');
      } else {
        try {
          companyIdStorage = await SecureStore.getItemAsync('auth_company_id');
        } catch {}
      }
      resultado += `💾 Company ID (Storage): ${companyIdStorage || 'NÃO ENCONTRADO'}\n\n`;

      // 3. Company ID via getCurrentCompanyId
      const companyId = await getCurrentCompanyId();
      resultado += `🏢 Company ID (getCurrentCompanyId): ${companyId || 'NÃO ENCONTRADO'}\n\n`;

      // 4. Buscar dados da empresa no Supabase
      if (companyId) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id, name, username, email, status')
          .eq('id', companyId)
          .maybeSingle();

        if (companyError) {
          resultado += `❌ Erro ao buscar empresa: ${companyError.message}\n\n`;
        } else if (company) {
          resultado += `✅ Empresa encontrada:\n`;
          resultado += `   - Nome: ${company.name}\n`;
          resultado += `   - Username: ${company.username}\n`;
          resultado += `   - Email: ${company.email}\n`;
          resultado += `   - Status: ${company.status}\n\n`;
        } else {
          resultado += `❌ Empresa não encontrada no Supabase!\n\n`;
        }
      }

      // 5. Verificar transações locais (dirty)
      const db = getDb();
      try {
        dirtyRows = await db.getAllAsync<any>(
          `SELECT id, type, date, amount_cents, dirty, company_id FROM transactions_local WHERE dirty = 1 LIMIT 5`
        );
        resultado += `📝 Transações DIRTY locais: ${dirtyRows.length}\n`;
        if (dirtyRows.length > 0) {
          dirtyRows.forEach((row, i) => {
            resultado += `   ${i + 1}. ${row.type} - R$ ${(row.amount_cents / 100).toFixed(2)} (${row.date})\n`;
            resultado += `      ID: ${row.id}\n`;
            resultado += `      Company: ${row.company_id}\n`;
          });
        }
        resultado += '\n';
      } catch (e: any) {
        resultado += `❌ Erro ao buscar transações locais: ${e.message}\n\n`;
      }

      // 6. Verificar transações no Supabase
      if (companyId) {
        const { data: supabaseTransactions, error: txError } = await supabase
          .from('transactions')
          .select('id, type, date, amount_cents')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (txError) {
          resultado += `❌ Erro ao buscar transações no Supabase: ${txError.message}\n\n`;
        } else {
          resultado += `☁️ Transações no Supabase: ${supabaseTransactions?.length || 0}\n`;
          if (supabaseTransactions && supabaseTransactions.length > 0) {
            supabaseTransactions.forEach((tx, i) => {
              resultado += `   ${i + 1}. ${tx.type} - R$ ${(tx.amount_cents / 100).toFixed(2)} (${tx.date})\n`;
            });
          }
          resultado += '\n';
        }
      }

      // 7. Testar INSERT manual
      if (companyId) {
        resultado += `🧪 Testando INSERT manual...\n`;
        const testId = `test-${Date.now()}`;
        const { error } = await supabase
          .from('transactions')
          .insert({
            id: testId,
            company_id: companyId,
            type: 'income',
            date: new Date().toISOString().split('T')[0],
            datetime: new Date().toISOString(),
            amount_cents: 100,
            description: 'Teste diagnóstico',
            version: 1,
            updated_at: new Date().toISOString(),
          });

        insertError = error;

        if (insertError) {
          resultado += `❌ INSERT falhou: ${insertError.message}\n`;
          resultado += `   Código: ${insertError.code}\n`;
          resultado += `   Detalhes: ${insertError.details}\n`;
          resultado += `   Hint: ${insertError.hint}\n\n`;
        } else {
          resultado += `✅ INSERT funcionou! Deletando teste...\n`;
          await supabase.from('transactions').delete().eq('id', testId);
          resultado += `✅ Teste deletado\n\n`;
        }
      }

      // 8. Verificar usuário autenticado
      const { data: userData } = await supabase.auth.getUser();
      resultado += `👤 Usuário autenticado:\n`;
      resultado += `   - Email: ${userData?.user?.email || 'N/A'}\n`;
      resultado += `   - ID: ${userData?.user?.id || 'N/A'}\n\n`;

      // 9. Resumo
      resultado += `📊 RESUMO:\n`;
      resultado += `   - Platform: ${Platform.OS}\n`;
      resultado += `   - Company ID válido: ${companyId ? '✅' : '❌'}\n`;
      resultado += `   - Transações locais dirty: ${dirtyRows?.length || 0}\n`;
      resultado += `   - INSERT manual: ${insertError ? '❌' : '✅'}\n\n`;

      if (insertError) {
        resultado += `⚠️ PROBLEMA IDENTIFICADO:\n`;
        resultado += `O INSERT manual falhou, indicando problema de permissão RLS no Supabase!\n\n`;
        resultado += `SOLUÇÃO: Ajustar políticas RLS para esta empresa.\n`;
      } else if (dirtyRows && dirtyRows.length > 0) {
        resultado += `⚠️ PROBLEMA IDENTIFICADO:\n`;
        resultado += `Há transações locais não sincronizadas!\n\n`;
        resultado += `SOLUÇÃO: Verificar logs de sync para ver por que não estão sendo enviadas.\n`;
      } else {
        resultado += `✅ Tudo parece estar funcionando!\n`;
      }

    } catch (error: any) {
      resultado += `\n❌ ERRO GERAL: ${error.message}\n`;
      resultado += `Stack: ${error.stack}\n`;
    }

    setDiagnostico(resultado);
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerText}>🔍 Diagnóstico Android</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.resultado, { color: theme.text, backgroundColor: theme.card }]}>
          {diagnostico}
        </Text>
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={executarDiagnostico}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? '⏳ Executando...' : '▶️ Executar Diagnóstico'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  resultado: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  button: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
