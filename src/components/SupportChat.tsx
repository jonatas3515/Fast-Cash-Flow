import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentCompanyId } from '../lib/company';

interface Message {
  id: string;
  direction: 'admin_to_company' | 'company_to_admin';
  message: string;
  sender_name?: string;
  read_at?: string;
  created_at: string;
}

interface SupportChatProps {
  visible: boolean;
  onClose: () => void;
}

export default function SupportChat({ visible, onClose }: SupportChatProps) {
  const { theme, mode } = useThemeCtx();
  const isDark = mode === 'dark';
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [newMessage, setNewMessage] = useState('');

  // Usar cores do tema diretamente
  const colors = {
    background: theme.background,
    cardBg: theme.card,
    text: theme.text,
    textSecondary: theme.textSecondary,
    border: theme.border,
    primary: theme.primary,
    myMessage: theme.primary,
    theirMessage: theme.card,
  };

  // Query para buscar mensagens
  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ['support-messages'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        return [];
      }

      // Marcar mensagens do admin como lidas
      try {
        await supabase.rpc('mark_messages_read', {
          p_company_id: companyId,
          p_reader: 'company'
        });
      } catch {
        // Função pode não existir ainda
      }

      return data as Message[];
    },
    enabled: visible,
    refetchInterval: visible ? 5000 : false, // Atualiza a cada 5s quando visível
  });

  // Query para contar mensagens não lidas
  const { data: unreadCount } = useQuery({
    queryKey: ['support-unread-count'],
    queryFn: async () => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) return 0;

      const { count } = await supabase
        .from('support_messages')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('direction', 'admin_to_company')
        .is('read_at', null);

      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  // Mutation para enviar mensagem
  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error('Empresa não identificada');

      // Tentar usar a função RPC
      const { data, error } = await supabase.rpc('send_support_message', {
        p_company_id: companyId,
        p_direction: 'company_to_admin',
        p_message: message,
        p_sender_name: null
      });

      if (error) {
        // Fallback: inserir diretamente
        const { error: insertError } = await supabase
          .from('support_messages')
          .insert({
            company_id: companyId,
            direction: 'company_to_admin',
            message,
          });

        if (insertError) throw insertError;
      }

      return data;
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['support-messages'] });
      // Scroll para o final
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
  });

  // Scroll para o final quando mensagens carregam
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages]);

  // Formatar data
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }
    return date.toLocaleDateString('pt-BR');
  };

  // Renderizar mensagem
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMyMessage = item.direction === 'company_to_admin';
    const showDate = index === 0 || 
      formatDate(item.created_at) !== formatDate(messages![index - 1].created_at);

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer,
        ]}>
          <View style={[
            styles.messageBubble,
            isMyMessage 
              ? [styles.myMessageBubble, { backgroundColor: colors.myMessage }]
              : [styles.theirMessageBubble, { backgroundColor: colors.theirMessage }],
          ]}>
            {!isMyMessage && item.sender_name && (
              <Text style={[styles.senderName, { color: colors.primary }]}>
                {item.sender_name}
              </Text>
            )}
            <Text style={[
              styles.messageText,
              { color: isMyMessage ? '#FFFFFF' : colors.text }
            ]}>
              {item.message}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                { color: isMyMessage ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
              ]}>
                {formatTime(item.created_at)}
              </Text>
              {isMyMessage && (
                <Text style={styles.readStatus}>
                  {item.read_at ? '✓✓' : '✓'}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Enviar mensagem
  const handleSend = () => {
    if (newMessage.trim()) {
      sendMutation.mutate(newMessage.trim());
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>💬 Suporte</Text>
            <Text style={styles.headerSubtitle}>Fale com nossa equipe</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Lista de Mensagens */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Carregando mensagens...
            </Text>
          </View>
        ) : messages && messages.length > 0 ? (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nenhuma mensagem ainda
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Envie uma mensagem para iniciar a conversa com nossa equipe de suporte.
            </Text>
          </View>
        )}

        {/* Input de Mensagem */}
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
            onPress={handleSend}
            disabled={!newMessage.trim() || sendMutation.isPending}
          >
            <Text style={styles.sendIcon}>
              {sendMutation.isPending ? '...' : '➤'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Componente de botão flutuante para abrir o chat
export function SupportChatButton({ onPress, unreadCount = 0 }: { onPress: () => void; unreadCount?: number }) {
  const { theme } = useThemeCtx();
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={[styles.fabContainer, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.secondary }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>💬</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageContainer: {
    marginBottom: 8,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  theirMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  myMessageBubble: {
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
  },
  readStatus: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginLeft: 4,
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
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    right: 16,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
