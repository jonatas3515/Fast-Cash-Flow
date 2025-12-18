import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  useWindowDimensions,
  StyleSheet,
  TextInput,
  FlatList,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Conversation {
  company_id: string;
  company_name: string;
  company_status: string;
  total_messages: number;
  unread_by_admin: number;
  last_message_at: string;
  last_message_preview: string;
  last_message_direction: string;
}

interface Message {
  id: string;
  direction: 'admin_to_company' | 'company_to_admin';
  message: string;
  sender_name?: string;
  read_at?: string;
  created_at: string;
}

export default function AdminSupportScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const { width } = useWindowDimensions();
  const isDark = mode === 'dark';
  const isWeb = Platform.OS === 'web';
  const isWideScreen = width >= 768;
  const queryClient = useQueryClient();

  const [selectedCompany, setSelectedCompany] = useState<Conversation | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const flatListRef = useRef<FlatList>(null);

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
  };

  // Query para buscar conversas
  const { data: conversations, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-support-conversations'],
    queryFn: async () => {
      // Buscar empresas com suas conversas
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name, status')
        .is('deleted_at', null)
        .order('name');

      if (!companies) return [];

      // Buscar conversas
      const { data: convs } = await supabase
        .from('support_conversations')
        .select('*');

      // Combinar dados
      const result: Conversation[] = companies.map(company => {
        const conv = convs?.find(c => c.company_id === company.id);
        return {
          company_id: company.id,
          company_name: company.name,
          company_status: company.status,
          total_messages: conv?.total_messages || 0,
          unread_by_admin: conv?.unread_by_admin || 0,
          last_message_at: conv?.last_message_at || '',
          last_message_preview: conv?.last_message_preview || '',
          last_message_direction: conv?.last_message_direction || '',
        };
      });

      // Ordenar: não lidas primeiro, depois por última mensagem
      return result.sort((a, b) => {
        if (a.unread_by_admin !== b.unread_by_admin) {
          return b.unread_by_admin - a.unread_by_admin;
        }
        if (a.last_message_at && b.last_message_at) {
          return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
        }
        return a.company_name.localeCompare(b.company_name);
      });
    },
    refetchInterval: 30000,
  });

  // Query para buscar mensagens da conversa selecionada
  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['admin-support-messages', selectedCompany?.company_id],
    queryFn: async () => {
      if (!selectedCompany) return [];

      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('company_id', selectedCompany.company_id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        return [];
      }

      // Marcar como lidas
      try {
        await supabase.rpc('mark_messages_read', {
          p_company_id: selectedCompany.company_id,
          p_reader: 'admin'
        });
        queryClient.invalidateQueries({ queryKey: ['admin-support-conversations'] });
      } catch {
        // Função pode não existir
      }

      return data as Message[];
    },
    enabled: !!selectedCompany,
    refetchInterval: showChat ? 5000 : false,
  });

  // Mutation para enviar mensagem
  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedCompany) throw new Error('Nenhuma empresa selecionada');

      // Tentar usar a função RPC
      const { error } = await supabase.rpc('send_support_message', {
        p_company_id: selectedCompany.company_id,
        p_direction: 'admin_to_company',
        p_message: message,
        p_sender_name: 'Suporte Fast Cash Flow'
      });

      if (error) {
        // Fallback: inserir diretamente
        const { error: insertError } = await supabase
          .from('support_messages')
          .insert({
            company_id: selectedCompany.company_id,
            direction: 'admin_to_company',
            message,
            sender_name: 'Suporte Fast Cash Flow',
          });

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      setNewMessage('');
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['admin-support-conversations'] });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
  });

  // Templates de mensagem rápida
  const quickMessages = [
    { label: '👋 Boas-vindas', text: 'Olá! Bem-vindo ao Fast Cash Flow! Como posso ajudá-lo hoje?' },
    { label: '🎯 Metas', text: 'Vi que você ainda não configurou suas metas financeiras. Posso ajudar a configurar?' },
    { label: '📊 Relatórios', text: 'Você sabia que pode gerar relatórios em PDF? Acesse a aba Relatórios para experimentar!' },
    { label: '⏰ Trial', text: 'Notei que seu período de teste está acabando. Gostaria de conversar sobre os planos disponíveis?' },
    { label: '🎉 Parabéns', text: 'Parabéns pelo progresso! Você está usando muito bem o sistema. Continue assim!' },
  ];

  // Filtrar conversas
  const filteredConversations = conversations?.filter(conv =>
    conv.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Formatar data
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return `${days}d atrás`;
    }
    return date.toLocaleDateString('pt-BR');
  };

  // Abrir chat
  const openChat = (conv: Conversation) => {
    setSelectedCompany(conv);
    setShowChat(true);
  };

  // Renderizar conversa
  const renderConversation = (conv: Conversation) => {
    const hasUnread = conv.unread_by_admin > 0;
    const statusColor = conv.company_status === 'active' ? colors.success : 
                       conv.company_status === 'trial' ? colors.primary : colors.warning;

    return (
      <TouchableOpacity
        key={conv.company_id}
        style={[
          styles.conversationCard,
          { 
            backgroundColor: hasUnread ? colors.primary + '10' : colors.cardBg,
            borderColor: hasUnread ? colors.primary : colors.border,
          }
        ]}
        onPress={() => openChat(conv)}
      >
        <View style={styles.convAvatar}>
          <Text style={styles.convAvatarText}>
            {conv.company_name.charAt(0).toUpperCase()}
          </Text>
          {hasUnread && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.convContent}>
          <View style={styles.convHeader}>
            <Text style={[styles.convName, { color: colors.text }]} numberOfLines={1}>
              {conv.company_name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {conv.company_status}
              </Text>
            </View>
          </View>
          {conv.last_message_preview ? (
            <Text style={[styles.convPreview, { color: colors.textSecondary }]} numberOfLines={1}>
              {conv.last_message_direction === 'company_to_admin' ? '' : '✓ '}
              {conv.last_message_preview}
            </Text>
          ) : (
            <Text style={[styles.convPreview, { color: colors.textSecondary, fontStyle: 'italic' }]}>
              Nenhuma mensagem ainda
            </Text>
          )}
        </View>
        <View style={styles.convMeta}>
          {conv.last_message_at && (
            <Text style={[styles.convTime, { color: colors.textSecondary }]}>
              {formatTime(conv.last_message_at)}
            </Text>
          )}
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{conv.unread_by_admin}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar mensagem no chat
  const renderMessage = ({ item }: { item: Message }) => {
    const isAdmin = item.direction === 'admin_to_company';

    return (
      <View style={[
        styles.messageContainer,
        isAdmin ? styles.adminMessage : styles.companyMessage,
      ]}>
        <View style={[
          styles.messageBubble,
          isAdmin 
            ? [styles.adminBubble, { backgroundColor: colors.primary }]
            : [styles.companyBubble, { backgroundColor: colors.cardBg }],
        ]}>
          <Text style={[
            styles.messageText,
            { color: isAdmin ? '#FFFFFF' : colors.text }
          ]}>
            {item.message}
          </Text>
          <Text style={[
            styles.messageTime,
            { color: isAdmin ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
          ]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  // Contar não lidas
  const totalUnread = conversations?.reduce((sum, c) => sum + c.unread_by_admin, 0) || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          💬 Suporte às Empresas
        </Text>
        {totalUnread > 0 && (
          <View style={styles.totalUnreadBadge}>
            <Text style={styles.totalUnreadText}>{totalUnread} não lida{totalUnread !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {/* Busca */}
      <View style={[styles.searchContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar empresa..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Lista de Conversas */}
      <ScrollView
        style={styles.conversationsList}
        contentContainerStyle={styles.conversationsContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando conversas...
          </Text>
        ) : filteredConversations && filteredConversations.length > 0 ? (
          filteredConversations.map(renderConversation)
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.cardBg }]}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'Nenhuma empresa encontrada' : 'Nenhuma conversa ainda'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal de Chat */}
      <Modal
        visible={showChat}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChat(false)}
      >
        <KeyboardAvoidingView
          style={[styles.chatContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Chat Header */}
          <View style={[styles.chatHeader, { backgroundColor: colors.primary }]}>
            <TouchableOpacity onPress={() => setShowChat(false)} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.chatHeaderContent}>
              <Text style={styles.chatHeaderTitle}>{selectedCompany?.company_name}</Text>
              <Text style={styles.chatHeaderSubtitle}>
                {selectedCompany?.company_status === 'active' ? '✅ Assinante' : 
                 selectedCompany?.company_status === 'trial' ? '⏳ Trial' : '⚠️ Expirado'}
              </Text>
            </View>
          </View>

          {/* Mensagens Rápidas */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickMessagesScroll}>
            <View style={styles.quickMessagesRow}>
              {quickMessages.map((qm, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.quickMessageChip, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                  onPress={() => setNewMessage(qm.text)}
                >
                  <Text style={[styles.quickMessageText, { color: colors.text }]}>{qm.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Lista de Mensagens */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          {/* Input */}
          <View style={[styles.inputContainer, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Digite sua mensagem..."
              placeholderTextColor={colors.textSecondary}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: newMessage.trim() ? colors.primary : colors.border }
              ]}
              onPress={() => newMessage.trim() && sendMutation.mutate(newMessage.trim())}
              disabled={!newMessage.trim() || sendMutation.isPending}
            >
              <Text style={styles.sendIcon}>
                {sendMutation.isPending ? '...' : '➤'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  totalUnreadBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalUnreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  conversationsList: {
    flex: 1,
  },
  conversationsContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  convAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  convAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  convContent: {
    flex: 1,
  },
  convHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  convName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  convPreview: {
    fontSize: 13,
  },
  convMeta: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  convTime: {
    fontSize: 11,
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingText: {
    textAlign: 'center',
    padding: 40,
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  chatHeaderContent: {
    flex: 1,
    marginLeft: 8,
  },
  chatHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  chatHeaderSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  quickMessagesScroll: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  quickMessagesRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  quickMessageChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickMessageText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 8,
  },
  adminMessage: {
    alignItems: 'flex-end',
  },
  companyMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  adminBubble: {
    borderBottomRightRadius: 4,
  },
  companyBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 18,
  },
});
