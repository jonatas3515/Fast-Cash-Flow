import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useToast } from '../ui/ToastProvider';
import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';
import ScreenTitle from '../components/ScreenTitle';

interface ClientFormData {
  name: string;
  type: 'pf' | 'pj';
  cpf_cnpj: string;
  rg_ie: string;
  phone: string;
  email: string;
  whatsapp: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  credit_limit_cents: number;
  notes: string;
  status: 'active' | 'inactive';
}

const INITIAL_FORM: ClientFormData = {
  name: '',
  type: 'pf',
  cpf_cnpj: '',
  rg_ie: '',
  phone: '',
  email: '',
  whatsapp: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  credit_limit_cents: 0,
  notes: '',
  status: 'active',
};

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Máscaras
const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const maskCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

// Form Progress Indicator
function FormProgress({
  sections,
  colors
}: {
  sections: { label: string; filled: boolean }[];
  colors: { filled: string; empty: string; text: string; textSecondary: string };
}) {
  const filledCount = sections.filter(s => s.filled).length;
  const progress = (filledCount / sections.length) * 100;

  return (
    <View style={formProgressStyles.container}>
      <View style={formProgressStyles.header}>
        <Text style={[formProgressStyles.title, { color: colors.text }]}>
          Progresso do Cadastro
        </Text>
        <Text style={[formProgressStyles.percent, { color: colors.filled }]}>
          {filledCount}/{sections.length}
        </Text>
      </View>
      <View style={[formProgressStyles.bar, { backgroundColor: colors.empty }]}>
        <View
          style={[
            formProgressStyles.fill,
            { width: `${progress}%`, backgroundColor: colors.filled }
          ]}
        />
      </View>
      <View style={formProgressStyles.sections}>
        {sections.map((section, i) => (
          <View key={i} style={formProgressStyles.sectionItem}>
            <Text style={[
              formProgressStyles.sectionDot,
              { color: section.filled ? colors.filled : colors.textSecondary }
            ]}>
              {section.filled ? '✓' : '○'}
            </Text>
            <Text style={[
              formProgressStyles.sectionLabel,
              { color: section.filled ? colors.text : colors.textSecondary }
            ]}>
              {section.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const formProgressStyles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  percent: {
    fontSize: 14,
    fontWeight: '700',
  },
  bar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  sections: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionDot: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 11,
  },
});

export default function ClientFormScreen({ navigation, route }: any) {
  const { theme } = useThemeCtx();
  const toast = useToast();
  const queryClient = useQueryClient();

  const clientId = route?.params?.clientId;
  const isEditing = !!clientId;

  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<ClientFormData>(INITIAL_FORM);
  const [sameWhatsapp, setSameWhatsapp] = React.useState(true);
  const [loadingCep, setLoadingCep] = React.useState(false);

  // Calculate form progress
  const formSections = React.useMemo(() => [
    { label: 'Tipo', filled: true }, // Always filled (default pf)
    { label: 'Dados', filled: !!formData.name.trim() },
    { label: 'Contato', filled: !!formData.phone || !!formData.email },
    { label: 'Endereço', filled: !!formData.city || !!formData.cep },
    { label: 'Comercial', filled: !!formData.notes || formData.status !== 'active' },
  ], [formData]);

  React.useEffect(() => {
    (async () => {
      const id = await getCurrentCompanyId();
      if (id) setCompanyId(id);
    })();
  }, []);

  // Query para carregar cliente existente
  const { isLoading: loadingClient } = useQuery({
    queryKey: ['client', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      if (error) throw error;
      if (data) {
        setFormData({
          name: data.name || '',
          type: data.type || 'pf',
          cpf_cnpj: data.cpf_cnpj || '',
          rg_ie: data.rg_ie || '',
          phone: data.phone || '',
          email: data.email || '',
          whatsapp: data.whatsapp || '',
          cep: data.cep || '',
          street: data.street || '',
          number: data.number || '',
          complement: data.complement || '',
          neighborhood: data.neighborhood || '',
          city: data.city || '',
          state: data.state || '',
          credit_limit_cents: data.credit_limit_cents || 0,
          notes: data.notes || '',
          status: data.status || 'active',
        });
        setSameWhatsapp(data.phone === data.whatsapp || !data.whatsapp);
      }
      return data;
    },
  });

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID não encontrado');
      if (!formData.name.trim()) throw new Error('Nome é obrigatório');

      const clientData = {
        company_id: companyId,
        name: formData.name.trim(),
        type: formData.type,
        cpf_cnpj: formData.cpf_cnpj || null,
        rg_ie: formData.rg_ie || null,
        phone: formData.phone || null,
        email: formData.email || null,
        whatsapp: sameWhatsapp ? formData.phone : formData.whatsapp || null,
        cep: formData.cep || null,
        street: formData.street || null,
        number: formData.number || null,
        complement: formData.complement || null,
        neighborhood: formData.neighborhood || null,
        city: formData.city || null,
        state: formData.state || null,
        credit_limit_cents: formData.credit_limit_cents,
        notes: formData.notes || null,
        status: formData.status,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.show(isEditing ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success');
      navigation.goBack();
    },
    onError: (err: any) => {
      toast.show('Erro: ' + err.message, 'error');
    },
  });

  // Buscar CEP
  const searchCEP = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast.show('CEP inválido', 'error');
      return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.show('CEP não encontrado', 'error');
      } else {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }));
        toast.show('Endereço encontrado!', 'success');
      }
    } catch (error) {
      toast.show('Erro ao buscar CEP', 'error');
    } finally {
      setLoadingCep(false);
    }
  };

  const updateField = (field: keyof ClientFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loadingClient) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenTitle title={isEditing ? 'Editar Cliente' : 'Novo Cliente'} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Form Progress Indicator */}
        <FormProgress
          sections={formSections}
          colors={{
            filled: theme.primary,
            empty: theme.border,
            text: theme.text,
            textSecondary: theme.textSecondary,
          }}
        />

        {/* Tipo de Pessoa */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Tipo de Pessoa</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                { borderColor: formData.type === 'pf' ? theme.primary : theme.border },
                formData.type === 'pf' && { backgroundColor: theme.primary + '20' }
              ]}
              onPress={() => updateField('type', 'pf')}
            >
              <Text style={[styles.typeButtonText, { color: formData.type === 'pf' ? theme.primary : theme.text }]}>
                👤 Pessoa Física
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                { borderColor: formData.type === 'pj' ? theme.primary : theme.border },
                formData.type === 'pj' && { backgroundColor: theme.primary + '20' }
              ]}
              onPress={() => updateField('type', 'pj')}
            >
              <Text style={[styles.typeButtonText, { color: formData.type === 'pj' ? theme.primary : theme.text }]}>
                🏢 Pessoa Jurídica
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dados Básicos */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Dados Básicos</Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {formData.type === 'pf' ? 'Nome Completo *' : 'Razão Social *'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={formData.name}
            onChangeText={(v) => updateField('name', v)}
            placeholder={formData.type === 'pf' ? 'Nome completo' : 'Razão social'}
            placeholderTextColor={theme.textSecondary}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {formData.type === 'pf' ? 'CPF' : 'CNPJ'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={formData.cpf_cnpj}
            onChangeText={(v) => updateField('cpf_cnpj', formData.type === 'pf' ? maskCPF(v) : maskCNPJ(v))}
            placeholder={formData.type === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            maxLength={formData.type === 'pf' ? 14 : 18}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {formData.type === 'pf' ? 'RG' : 'Inscrição Estadual'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={formData.rg_ie}
            onChangeText={(v) => updateField('rg_ie', v)}
            placeholder={formData.type === 'pf' ? 'RG (opcional)' : 'IE (opcional)'}
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        {/* Contato */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contato</Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Telefone</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={formData.phone}
            onChangeText={(v) => updateField('phone', maskPhone(v))}
            placeholder="(00) 00000-0000"
            placeholderTextColor={theme.textSecondary}
            keyboardType="phone-pad"
            maxLength={15}
          />

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>WhatsApp é o mesmo número?</Text>
            <Switch
              value={sameWhatsapp}
              onValueChange={setSameWhatsapp}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={sameWhatsapp ? theme.primary : '#f4f3f4'}
            />
          </View>

          {!sameWhatsapp && (
            <>
              <Text style={[styles.label, { color: theme.textSecondary }]}>WhatsApp</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={formData.whatsapp}
                onChangeText={(v) => updateField('whatsapp', maskPhone(v))}
                placeholder="(00) 00000-0000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </>
          )}

          <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={formData.email}
            onChangeText={(v) => updateField('email', v.toLowerCase())}
            placeholder="email@exemplo.com"
            placeholderTextColor={theme.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Endereço */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Endereço</Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>CEP</Text>
          <View style={styles.cepRow}>
            <TextInput
              style={[styles.input, styles.cepInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              value={formData.cep}
              onChangeText={(v) => updateField('cep', maskCEP(v))}
              placeholder="00000-000"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              maxLength={9}
            />
            <TouchableOpacity
              style={[styles.cepButton, { backgroundColor: theme.primary }]}
              onPress={searchCEP}
              disabled={loadingCep}
            >
              {loadingCep ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.cepButtonText}>🔍 Buscar</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Rua/Avenida</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={formData.street}
            onChangeText={(v) => updateField('street', v)}
            placeholder="Nome da rua"
            placeholderTextColor={theme.textSecondary}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Número</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={formData.number}
                onChangeText={(v) => updateField('number', v)}
                placeholder="Nº"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Complemento</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={formData.complement}
                onChangeText={(v) => updateField('complement', v)}
                placeholder="Apto, Bloco..."
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Bairro</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={formData.neighborhood}
            onChangeText={(v) => updateField('neighborhood', v)}
            placeholder="Bairro"
            placeholderTextColor={theme.textSecondary}
          />

          <View style={styles.row}>
            <View style={[styles.halfField, { flex: 2 }]}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Cidade</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={formData.city}
                onChangeText={(v) => updateField('city', v)}
                placeholder="Cidade"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Estado</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={formData.state}
                onChangeText={(v) => updateField('state', v.toUpperCase())}
                placeholder="UF"
                placeholderTextColor={theme.textSecondary}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        {/* Informações Comerciais */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Informações Comerciais</Text>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>Status: {formData.status === 'active' ? 'Ativo' : 'Inativo'}</Text>
            <Switch
              value={formData.status === 'active'}
              onValueChange={(v) => updateField('status', v ? 'active' : 'inactive')}
              trackColor={{ false: '#ef4444', true: '#10b981' }}
              thumbColor="#fff"
            />
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={formData.notes}
            onChangeText={(v) => updateField('notes', v)}
            placeholder="Observações sobre o cliente..."
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Botões */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? '💾 Salvar Alterações' : '✅ Cadastrar Cliente'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  cepRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cepInput: {
    flex: 1,
  },
  cepButton: {
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cepButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
