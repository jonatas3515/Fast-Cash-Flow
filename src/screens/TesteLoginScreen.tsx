import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Platform } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';

export default function TesteLoginScreen() {
  const { theme } = useThemeCtx();
  const [username, setUsername] = React.useState('fastsavorys');
  const [password, setPassword] = React.useState('jerosafast');
  const [resultado, setResultado] = React.useState<string>('Clique em "Fazer Login" para testar');
  const [loading, setLoading] = React.useState(false);

  const fazerLogin = async () => {
    setLoading(true);
    let resultado = '🧪 TESTE LOGIN\n\n';

    try {
      resultado += `📱 Platform: web\n`;
      resultado += `👤 Username: ${username}\n\n`;

      // 1. Buscar empresa no Supabase
      resultado += '🔍 Buscando empresa no Supabase...\n';
      const { data: empresa, error: empresaError } = await supabase
        .from('companies')
        .select('id, name, username, email, status, trial_end')
        .ilike('username', username)
        .maybeSingle();

      if (empresaError) {
        resultado += `❌ Erro ao buscar empresa: ${empresaError.message}\n`;
        setResultado(resultado);
        setLoading(false);
        return;
      }

      if (!empresa) {
        resultado += '❌ Empresa não encontrada!\n';
        setResultado(resultado);
        setLoading(false);
        return;
      }

      resultado += `✅ Empresa encontrada: ${empresa.name}\n`;
      resultado += `   ID: ${empresa.id}\n`;
      resultado += `   Status: ${empresa.status}\n`;
      resultado += `   Email: ${empresa.email}\n\n`;

      // 2. Salvar no localStorage
      resultado += '💾 Salvando no localStorage...\n';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('auth_company_id', empresa.id);
        window.localStorage.setItem('auth_name', empresa.name);
        window.localStorage.setItem('auth_ok', '1');
        window.localStorage.setItem('auth_role', 'user');
        resultado += '✅ Salvo no localStorage!\n\n';
      }

      // 3. Verificar getCurrentCompanyId()
      resultado += '🔍 Testando getCurrentCompanyId()...\n';
      const companyId = await getCurrentCompanyId();
      
      if (companyId) {
        resultado += `✅ Company ID recuperado: ${companyId}\n`;
        resultado += `✅ Company ID bate: ${companyId === empresa.id ? 'SIM' : 'NÃO'}\n\n`;
      } else {
        resultado += '❌ getCurrentCompanyId() retornou null!\n';
        setResultado(resultado);
        setLoading(false);
        return;
      }

      // 4. Verificar localStorage
      if (typeof window !== 'undefined') {
        resultado += '📋 Verificando localStorage:\n';
        resultado += `   auth_company_id: ${window.localStorage.getItem('auth_company_id') || 'NÃO'}\n`;
        resultado += `   auth_name: ${window.localStorage.getItem('auth_name') || 'N/A'}\n`;
        resultado += `   auth_ok: ${window.localStorage.getItem('auth_ok') || 'N/A'}\n\n`;
      }

      // 5. Testar sync
      resultado += '🔄 Testando sync...\n';
      const { data: transacoesWeb } = await supabase
        .from('transactions')
        .select('id, type, amount_cents, description')
        .eq('company_id', companyId)
        .limit(5);

      resultado += `☁️ Transações no Supabase: ${transacoesWeb?.length || 0}\n`;
      
      if (transacoesWeb && transacoesWeb.length > 0) {
        resultado += '\nÚltimas transações:\n';
        transacoesWeb.forEach((tx, i) => {
          resultado += `   ${i + 1}. ${tx.type} - R$ ${(tx.amount_cents / 100).toFixed(2)}\n`;
        });
      }

      resultado += '\n🎉 Login testado com sucesso!';
      resultado += '\n\n💡 Agora você pode usar o app normalmente!';

    } catch (error: any) {
      resultado += `\n❌ ERRO: ${error.message}\n`;
      resultado += `Stack: ${error.stack}\n`;
    }

    setResultado(resultado);
    setLoading(false);
  };

  const limparStorage = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
      window.localStorage.clear();
      setResultado('🧹 Storage limpo! Faça login novamente.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerText}>🧪 Teste Login FastSavorys</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.form, { backgroundColor: theme.card }]}>
          <Text style={[styles.label, { color: theme.text }]}>Username:</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            value={username}
            onChangeText={setUsername}
            placeholder="fastsavorys"
            placeholderTextColor={theme.text + '80'}
          />

          <Text style={[styles.label, { color: theme.text }]}>Password:</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            value={password}
            onChangeText={setPassword}
            placeholder="jerosafast"
            placeholderTextColor={theme.text + '80'}
            secureTextEntry
          />
        </View>

        <Text style={[styles.resultado, { color: theme.text, backgroundColor: theme.card }]}>
          {resultado}
        </Text>
      </ScrollView>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={fazerLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '⏳ Testando...' : '🧪 Fazer Login'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#D90429' }]}
          onPress={limparStorage}
        >
          <Text style={styles.buttonText}>🧹 Limpar Storage</Text>
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
  form: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
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
