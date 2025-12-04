import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

interface InstructionTopic {
  id: string;
  icon: string;
  title: string;
  content: string;
  color: string;
}

export default function AdminInstructionsScreen() {
  const { theme } = useThemeCtx();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const topics: InstructionTopic[] = [
    {
      id: 'dashboard',
      icon: '',
      title: 'Dashboard Administrativo',
      content: `O Dashboard Admin e sua central de controle do Fast Cash Flow.

CARDS PRINCIPAIS:
- Total de Empresas: Numero total de empresas cadastradas
- Empresas Ativas: Empresas com assinatura ativa (R$ 9,99/mes)
- Em Trial: Empresas usando periodo de teste gratuito
- Inativas/Bloqueadas: Empresas com acesso suspenso

RECEITA E CONVERSAO:
- Receita Mensal Estimada: Empresas Ativas x R$ 9,99
- Taxa de Conversao: (Empresas Ativas / Total) x 100

ALERTAS IMPORTANTES:
- Solicitacoes Pendentes: Novas empresas aguardando aprovacao
- Trial Terminando: Empresas com menos de 3 dias de trial

ACOES RAPIDAS:
- Aprovar Solicitacoes
- Gerenciar Empresas
- Relatorios
- Enviar Comunicado`,
      color: '#F3E8FF',
    },
    {
      id: 'companies',
      icon: '',
      title: 'Gerenciar Empresas',
      content: `A aba Empresas permite gerenciar todas as contas cadastradas.

ABAS DISPONIVEIS:
1. ATIVAS: Empresas operacionais
2. EXCLUIDAS: Empresas marcadas como deletadas (soft delete)

INFORMACOES EXIBIDAS:
- Nome da empresa
- Usuario (username unico)
- Email e telefone
- Status: TRIAL, ACTIVE, EXPIRED, BLOCKED
- Dias restantes de trial

EDITAR EMPRESA:
- Nome de usuario
- Email e telefone
- Preco do plano (R$)
- Desconto percentual (%)
- Senha provisoria
- Liberar periodo gratis

ATIVAR ASSINATURA:
- Muda status para ACTIVE
- Remove data de fim de trial
- Empresa passa a contar como paga

EXCLUIR EMPRESA:
- Soft delete (marcacao)
- Removida permanentemente apos 90 dias`,
      color: '#DBEAFE',
    },
    {
      id: 'requests',
      icon: '',
      title: 'Aprovar Solicitacoes',
      content: `A aba Solicitacoes gerencia pedidos de cadastro de novas empresas.

O QUE SAO SOLICITACOES:
Quando alguem se cadastra pela primeira vez, a solicitacao fica pendente aguardando sua aprovacao manual.

INFORMACOES DA SOLICITACAO:
- Nome da empresa
- Nome do responsavel
- Email e Telefone
- Endereco e CNPJ
- Status: PENDING, APPROVED, REJECTED

APROVAR SOLICITACAO:
1. Clique em "Aprovar"
2. Sistema cria registro em "companies"
3. Define username unico
4. Gera senha provisoria
5. Configura trial de 30 dias

APOS APROVACAO:
- Envie credenciais para o email do solicitante
- Informe sobre troca de senha no primeiro acesso
- Explique o periodo de trial gratuito`,
      color: '#FEF3C7',
    },
    {
      id: 'debits',
      icon: '',
      title: 'Debitos (Inadimplentes)',
      content: `A aba Debitos monitora empresas com problemas de pagamento.

QUANDO UMA EMPRESA FICA INADIMPLENTE:
- Trial terminou e nao ativou assinatura
- Assinatura venceu e nao renovou
- Pagamento recusado/cancelado

ACOES DISPONIVEIS:
1. ENVIAR LEMBRETE: Notifica empresa sobre vencimento
2. BLOQUEAR ACESSO: Empresa nao consegue mais fazer login
3. ESTENDER TRIAL: Da mais dias de teste gratuito
4. ATIVAR MANUALMENTE: Marca como paga

BOA PRATICA:
- 1o lembrete: 3 dias antes do vencimento
- 2o lembrete: No dia do vencimento
- 3o lembrete: 3 dias apos vencimento
- Bloqueio: 7 dias apos vencimento
- Exclusao: 90 dias apos bloqueio`,
      color: '#FEE2E2',
    },
    {
      id: 'reports',
      icon: '',
      title: 'Relatorios Administrativos',
      content: `A aba Relatorios gera analises completas do Fast Cash Flow.

VISAO GERAL:
- Total de Empresas
- Empresas Ativas
- Em Trial
- Trials Expirados

FINANCEIRO:
- Receita Mensal: Ativas x R$ 9,99
- Novos Este Mes
- Taxa de Conversao

EXPORTAR CSV:
1. Clique em "Exportar CSV"
2. Sistema gera arquivo com todas as empresas
3. Mobile: Compartilha via WhatsApp/Email
4. Web: Download direto

METAS SUGERIDAS:
- Conversao ideal: 30-40%
- Crescimento mensal: +10%
- Retencao: 80% renovam apos primeiro mes`,
      color: '#EDE9FE',
    },
    {
      id: 'broadcast',
      icon: '',
      title: 'Comunicados',
      content: `A aba Comunicados permite enviar mensagens para empresas.

TIPOS DE MENSAGEM:
- Broadcast: Envia para TODAS as empresas
- Direcionada: Envia para empresa especifica

TEMPLATES DISPONIVEIS:
- Trial Terminando (3 dias)
- Ultimo Dia de Trial
- Lembrete de Pagamento
- Bem-vindo ao Fast Cash Flow
- Atualizacao do Sistema
- Promocao Especial
- Manutencao Programada

PRIORIDADES:
- Info: Mensagem informativa (azul)
- Warning: Aviso importante (amarelo)
- Urgent: Urgente (vermelho)

COMO ENVIAR:
1. Selecione tipo (Broadcast ou Direcionada)
2. Escolha template ou escreva mensagem
3. Defina prioridade
4. Clique em "Enviar Comunicado"`,
      color: '#D1FAE5',
    },
    {
      id: 'settings',
      icon: '',
      title: 'Configuracoes',
      content: `A aba Configuracoes permite ajustar parametros do sistema.

CONFIGURACOES DE TRIAL:
- Dias de Trial Padrao: Quantos dias de teste gratuito
- Valor padrao: 30 dias

PRECOS:
- Preco Mensal: R$ 9,99 (padrao)
- Preco Anual: R$ 99,99 (padrao)
- Desconto anual automatico

CONTATO:
- Numero WhatsApp para suporte
- Usado no modal de upgrade

ONDE FICAM SALVAS:
- localStorage do navegador/app
- Carregadas automaticamente no login
- Aplicadas em todas as telas`,
      color: '#FEF9C3',
    },
  ];

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>INSTRUCOES DO ADMIN</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Guia completo para gerenciar o Fast Cash Flow
        </Text>
      </View>

      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        {topics.map((topic) => (
          <TouchableOpacity
            key={topic.id}
            style={[
              styles.topicCard,
              { backgroundColor: theme.card },
              expandedId === topic.id && { borderColor: theme.primary, borderWidth: 2 },
            ]}
            onPress={() => toggleExpand(topic.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.topicHeader, { backgroundColor: topic.color }]}>
              <Text style={styles.topicIcon}>{topic.icon}</Text>
              <Text style={[styles.topicTitle, { color: '#1F2937' }]}>{topic.title}</Text>
              <Ionicons
                name={expandedId === topic.id ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#1F2937"
              />
            </View>
            
            {expandedId === topic.id && (
              <View style={styles.topicContent}>
                <Text style={[styles.topicText, { color: theme.text }]}>
                  {topic.content}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          Fast Cash Flow - Painel Administrativo v1.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  contentDesktop: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  topicCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  topicIcon: {
    fontSize: 28,
  },
  topicTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  topicContent: {
    padding: 16,
    paddingTop: 0,
  },
  topicText: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});
