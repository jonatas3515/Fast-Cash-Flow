import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { getDb } from '../lib/db';
import { getCurrentCompanyId } from '../lib/company';
import { pushDirty, syncAll } from '../lib/sync';
import { SyncWarning } from '../components/WarningBox';

export default function ForcarSyncScreen() {
  const { theme } = useThemeCtx();
  const [resultado, setResultado] = React.useState<string>('Clique em "Forçar Sync FastSavorys"');
  const [loading, setLoading] = React.useState(false);

  const forcarSync = async () => {
    setLoading(true);
    let resultado = '🔧 FORÇAR SYNC - FASTSAVORYS ANDROID\n\n';

    try {
      resultado += `📱 Platform: ${Platform.OS}\n\n`;

      // 1. Verificar Company ID
      const companyId = await getCurrentCompanyId();
      resultado += `🏢 Company ID: ${companyId || 'NÃO ENCONTRADO'}\n\n`;

      if (!companyId) {
        resultado += '❌ Nenhum company_id encontrado!\n';
        setResultado(resultado);
        setLoading(false);
        return;
      }

      // 2. Verificar empresa no Supabase
      const { data: empresa } = await supabase
        .from('companies')
        .select('name, username, email, status')
        .eq('id', companyId)
        .maybeSingle();

      resultado += `📋 Empresa: ${empresa?.name || 'NÃO ENCONTRADA'}\n`;
      resultado += `   Username: ${empresa?.username || 'N/A'}\n`;
      resultado += `   Status: ${empresa?.status || 'N/A'}\n\n`;

      if (!empresa?.name?.includes('FastSavory')) {
        resultado += '⚠️ Esta não é a empresa FastSavorys!\n';
        setResultado(resultado);
        setLoading(false);
        return;
      }

      // 3. Buscar transações locais
      const db = getDb();
      const dirtyRows = await db.getAllAsync<any>(
        `SELECT id, type, date, amount_cents, description, company_id FROM transactions_local WHERE dirty = 1 LIMIT 10`
      );
      resultado += `📝 Transações locais dirty: ${dirtyRows.length}\n`;

      if (dirtyRows.length > 0) {
        resultado += '\nTransações pendentes:\n';
        dirtyRows.forEach((row, i) => {
          resultado += `   ${i + 1}. ${row.type} - R$ ${(row.amount_cents / 100).toFixed(2)} (${row.date})\n`;
          resultado += `      Descrição: ${row.description || 'Sem descrição'}\n`;
          resultado += `      Company ID: ${row.company_id}\n`;
          resultado += `      Local: ${row.company_id === companyId ? '✅' : '❌ ERRADO'}\n\n`;
        });

        // 4. Corrigir company_id se necessário
        const wrongCompany = dirtyRows.find(r => r.company_id !== companyId);
        if (wrongCompany) {
          resultado += '🔧 CORRIGINDO company_id nos registros...\n';
          await db.runAsync(
            `UPDATE transactions_local SET company_id = ? WHERE dirty = 1`,
            companyId
          );
          resultado += '✅ Company_id corrigido!\n\n';
        }

        // 5. Forçar pushDirty
        resultado += '🚀 FORÇANDO pushDirty()...\n';
        await pushDirty();
        resultado += '✅ pushDirty() executado!\n\n';

        // 6. Verificar se sincronizou
        const { data: supabaseTransactions } = await supabase
          .from('transactions')
          .select('id, type, amount_cents, description')
          .eq('company_id', companyId)
          .order('updated_at', { ascending: false })
          .limit(5);

        resultado += `☁️ Transações no Supabase: ${supabaseTransactions?.length || 0}\n`;
        if (supabaseTransactions && supabaseTransactions.length > 0) {
          resultado += '\nÚltimas transações no Supabase:\n';
          supabaseTransactions.forEach((tx, i) => {
            resultado += `   ${i + 1}. ${tx.type} - R$ ${(tx.amount_cents / 100).toFixed(2)}\n`;
            resultado += `      Descrição: ${tx.description || 'Sem descrição'}\n\n`;
          });
        }

        // 7. Verificar se ainda há dirty
        const remainingDirty = await db.getAllAsync<any>(
          `SELECT COUNT(*) as count FROM transactions_local WHERE dirty = 1`
        );
        resultado += `📊 Transações dirty restantes: ${remainingDirty[0]?.count || 0}\n\n`;

        if ((remainingDirty[0]?.count || 0) === 0 && (supabaseTransactions?.length || 0) > 0) {
          resultado += '🎉 SUCESSO! Todas as transações foram sincronizadas!\n';
        } else {
          resultado += '⚠️ Ainda há transações não sincronizadas.\n';
        }

      } else {
        resultado += '✅ Nenhuma transação pendente de sincronização.\n';
      }

    } catch (error: any) {
      resultado += `\n❌ ERRO: ${error.message}\n`;
      resultado += `Stack: ${error.stack}\n`;
    }

    setResultado(resultado);
    setLoading(false);
  };

  const limparTudo = async () => {
    Alert.alert(
      'Confirmar',
      'Isso vai limpar TODAS as transações locais. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            const db = getDb();
            await db.runAsync(`DELETE FROM transactions_local`);
            setResultado('🧹 Todas as transações locais foram limpas!');
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerText}>🔧 Forçar Sync FastSavorys</Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <SyncWarning />
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.resultado, { color: theme.text, backgroundColor: theme.card }]}>
          {resultado}
        </Text>
      </ScrollView>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={forcarSync}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '⏳ Forçando...' : '🚀 Forçar Sync FastSavorys'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#D90429' }]}
          onPress={limparTudo}
        >
          <Text style={styles.buttonText}>🧹 Limpar Tudo (Perigoso)</Text>
        </TouchableOpacity>
      </View>
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
  buttons: {
    padding: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
