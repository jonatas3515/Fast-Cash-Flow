import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface MessageTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: string;
}

interface Company {
  id: string;
  name: string;
  status: string;
}

export default function AdminBroadcastScreen({ navigation }: any) {
  const { theme } = useThemeCtx();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'urgent' | 'promotion' | 'support'>('info');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [isBroadcast, setIsBroadcast] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadCompanies();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, status')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const useTemplate = (template: MessageTemplate) => {
    setTitle(template.title);
    setMessage(template.message);
    setType(template.type as any);
    setShowTemplates(false);
    Alert.alert('Template Carregado', 'Você pode editar o texto antes de enviar.');
  };

  const sendMessage = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Atenção', 'Preencha o título e a mensagem.');
      return;
    }

    if (!isBroadcast && !selectedCompany) {
      Alert.alert('Atenção', 'Selecione uma empresa para enviar a mensagem.');
      return;
    }

    const confirmMessage = isBroadcast
      ? `Enviar mensagem para TODAS as ${companies.length} empresas?` 
      : `Enviar mensagem para "${selectedCompany?.name}"?`;

    Alert.alert(
      'Confirmar Envio',
      confirmMessage,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setSending(true);
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error('Usuário não autenticado');

              if (isBroadcast) {
                // Enviar para todas as empresas
                const messages = companies.map(company => ({
                  admin_user_id: user.id,
                  company_id: company.id,
                  is_broadcast: true,
                  title: title.trim(),
                  message: message.trim(),
                  type,
                  priority,
                  read: false,
                }));

                const { error } = await supabase
                  .from('admin_messages')
                  .insert(messages);

                if (error) throw error;
                Alert.alert('Sucesso', `Mensagem enviada para ${companies.length} empresas!`);
              } else {
                // Enviar para empresa específica
                const { error } = await supabase
                  .from('admin_messages')
                  .insert({
                    admin_user_id: user.id,
                    company_id: selectedCompany!.id,
                    is_broadcast: false,
                    title: title.trim(),
                    message: message.trim(),
                    type,
                    priority,
                    read: false,
                  });

                if (error) throw error;
                Alert.alert('Sucesso', `Mensagem enviada para "${selectedCompany!.name}"!`);
              }

              // Limpar formulário
              setTitle('');
              setMessage('');
              setType('info');
              setPriority('normal');
              navigation.goBack();
            } catch (error) {
              console.error('Erro ao enviar mensagem:', error);
              Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const TypeButton = ({ label, value, icon }: { label: string; value: typeof type; icon: string }) => (
    <TouchableOpacity
      style={[
        styles.typeButton,
        { backgroundColor: type === value ? theme.primary : theme.background },
      ]}
      onPress={() => setType(value)}
    >
      <Ionicons name={icon as any} size={20} color={type === value ? '#FFF' : theme.text} />
      <Text style={[styles.typeButtonText, { color: type === value ? '#FFF' : theme.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const PriorityButton = ({ label, value, icon }: { label: string; value: typeof priority; icon: string }) => (
    <TouchableOpacity
      style={[
        styles.priorityButton,
        { backgroundColor: priority === value ? theme.primary : theme.background },
      ]}
      onPress={() => setPriority(value)}
    >
      <Ionicons name={icon as any} size={16} color={priority === value ? '#FFF' : theme.text} />
      <Text style={[styles.priorityButtonText, { color: priority === value ? '#FFF' : theme.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="megaphone-outline" size={40} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Enviar Comunicado</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Envie mensagens para empresas cadastradas
          </Text>
        </View>

        {/* Tipo de Envio */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>TIPO DE ENVIO</Text>
          <View style={styles.sendTypeButtons}>
            <TouchableOpacity
              style={[
                styles.sendTypeButton,
                { backgroundColor: isBroadcast ? theme.primary : theme.background },
              ]}
              onPress={() => {
                setIsBroadcast(true);
                setSelectedCompany(null);
              }}
            >
              <Ionicons name="people-outline" size={24} color={isBroadcast ? '#FFF' : theme.text} />
              <Text style={[styles.sendTypeText, { color: isBroadcast ? '#FFF' : theme.text }]}>
                Todas as Empresas
              </Text>
              <Text style={[styles.sendTypeCount, { color: isBroadcast ? '#FFF' : theme.textSecondary }]}>
                ({companies.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendTypeButton,
                { backgroundColor: !isBroadcast ? theme.primary : theme.background },
              ]}
              onPress={() => {
                setIsBroadcast(false);
                setShowCompanyPicker(true);
              }}
            >
              <Ionicons name="person-outline" size={24} color={!isBroadcast ? '#FFF' : theme.text} />
              <Text style={[styles.sendTypeText, { color: !isBroadcast ? '#FFF' : theme.text }]}>
                Empresa Específica
              </Text>
            </TouchableOpacity>
          </View>

          {!isBroadcast && selectedCompany && (
            <View style={[styles.selectedCompany, { backgroundColor: theme.background }]}>
              <Ionicons name="business" size={20} color={theme.primary} />
              <Text style={[styles.selectedCompanyText, { color: theme.text }]}>
                {selectedCompany.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedCompany(null)}>
                <Ionicons name="close-circle" size={20} color={theme.negative} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Templates */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>TEMPLATES</Text>
            <TouchableOpacity
              style={[styles.templateButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowTemplates(true)}
            >
              <Ionicons name="document-text-outline" size={16} color="#FFF" />
              <Text style={[styles.templateButtonText, { color: '#FFF' }]}>Usar Template</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Título e Mensagem */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>CONTEÚDO</Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.inputBorder }]}
            placeholder="Título da mensagem"
            placeholderTextColor={theme.inputPlaceholder}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />

          <TextInput
            style={[styles.messageInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.inputBorder }]}
            placeholder="Digite sua mensagem aqui..."
            placeholderTextColor={theme.inputPlaceholder}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            maxLength={1000}
          />

          <Text style={[styles.charCount, { color: theme.textSecondary }]}>
            {message.length}/1000 caracteres
          </Text>
        </View>

        {/* Tipo de Mensagem */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>TIPO DE MENSAGEM</Text>
          <View style={styles.typeButtons}>
            <TypeButton label="Informativa" value="info" icon="information-circle-outline" />
            <TypeButton label="Aviso" value="warning" icon="warning-outline" />
            <TypeButton label="Urgente" value="urgent" icon="alert-circle-outline" />
          </View>
          <View style={styles.typeButtons}>
            <TypeButton label="Promoção" value="promotion" icon="pricetag-outline" />
            <TypeButton label="Suporte" value="support" icon="headset-outline" />
          </View>
        </View>

        {/* Prioridade */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>PRIORIDADE</Text>
          <View style={styles.priorityButtons}>
            <PriorityButton label="Baixa" value="low" icon="arrow-down-outline" />
            <PriorityButton label="Normal" value="normal" icon="remove-outline" />
            <PriorityButton label="Alta" value="high" icon="arrow-up-outline" />
          </View>
        </View>

        {/* Botão de Enviar */}
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: sending ? theme.textSecondary : theme.primary }]}
          onPress={sendMessage}
          disabled={sending}
        >
          {sending ? (
            <>
              <Ionicons name="time-outline" size={20} color="#FFF" />
              <Text style={[styles.sendButtonText, { color: '#FFF' }]}>Enviando...</Text>
            </>
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color="#FFF" />
              <Text style={[styles.sendButtonText, { color: '#FFF' }]}>
                {isBroadcast ? 'Enviar para Todas' : 'Enviar Mensagem'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Templates */}
      <Modal
        visible={showTemplates}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Templates de Mensagem</Text>
            <TouchableOpacity onPress={() => setShowTemplates(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={templates}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.templateItem, { backgroundColor: theme.card }]}
                onPress={() => useTemplate(item)}
              >
                <View style={styles.templateHeader}>
                  <Text style={[styles.templateName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.templateType, { color: theme.textSecondary }]}>{item.type}</Text>
                </View>
                <Text style={[styles.templateTitle, { color: theme.primary }]}>{item.title}</Text>
                <Text style={[styles.templateMessage, { color: theme.textSecondary }]} numberOfLines={3}>
                  {item.message}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Nenhum template encontrado
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Modal de Seleção de Empresa */}
      <Modal
        visible={showCompanyPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Selecionar Empresa</Text>
            <TouchableOpacity onPress={() => setShowCompanyPicker(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={companies}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.companyItem, { backgroundColor: theme.card }]}
                onPress={() => {
                  setSelectedCompany(item);
                  setShowCompanyPicker(false);
                }}
              >
                <View style={styles.companyInfo}>
                  <Text style={[styles.companyName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.companyStatus, { color: theme.textSecondary }]}>
                    Status: {item.status}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Nenhuma empresa encontrada
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sendTypeButtons: {
    gap: 12,
  },
  sendTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sendTypeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  sendTypeCount: {
    fontSize: 12,
  },
  selectedCompany: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  selectedCompanyText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  templateButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  priorityButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  templateItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
  },
  templateType: {
    fontSize: 12,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  templateMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  companyStatus: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
});
