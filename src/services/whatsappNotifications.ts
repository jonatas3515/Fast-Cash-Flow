import { supabase } from '../lib/supabase';
import { getCurrentCompanyId } from '../lib/company';
import { formatCentsBRL } from '../utils/money';

// Tipos
export interface NotificationSettings {
  id: string;
  company_id: string;
  whatsapp_enabled: boolean;
  whatsapp_number: string | null;
  notify_order_delivery: boolean;
  notify_daily_summary: boolean;
  notify_debt_reminder: boolean;
  daily_summary_time: string;
  debt_reminder_time: string;
  order_reminder_hours: number;
  whatsapp_api_url: string | null;
  whatsapp_api_token: string | null;
  whatsapp_instance_id: string | null;
}

export interface DailySummary {
  date: string;
  income_cents: number;
  expense_cents: number;
  balance_cents: number;
  monthly_income_cents: number;
  monthly_expense_cents: number;
  monthly_balance_cents: number;
}

// Buscar configurações de notificação
export async function getNotificationSettings(companyId?: string): Promise<NotificationSettings | null> {
  try {
    const id = companyId || await getCurrentCompanyId();
    if (!id) return null;

    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('company_id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar configurações de notificação:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return null;
  }
}

// Salvar configurações de notificação
export async function saveNotificationSettings(settings: Partial<NotificationSettings>, companyId?: string): Promise<boolean> {
  try {
    const id = companyId || await getCurrentCompanyId();
    if (!id) return false;

    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        company_id: id,
        ...settings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'company_id'
      });

    if (error) {
      console.error('Erro ao salvar configurações:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    return false;
  }
}

// Formatar número de telefone para WhatsApp
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '');
  
  // Se não começar com 55, adiciona
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

// Enviar mensagem via Z-API
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  settings: NotificationSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!settings.whatsapp_api_url || !settings.whatsapp_api_token) {
      return { success: false, error: 'API WhatsApp não configurada' };
    }

    const formattedPhone = formatPhoneForWhatsApp(phone);
    
    // Formato para Z-API
    const response = await fetch(`${settings.whatsapp_api_url}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': settings.whatsapp_api_token,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.message || 'Erro ao enviar mensagem' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao enviar WhatsApp:', error);
    return { success: false, error: error.message };
  }
}

// Gerar mensagem de lembrete de entrega
export function generateOrderDeliveryMessage(
  companyName: string,
  clientName: string,
  orderType: string,
  deliveryTime: string,
  orderValue: number
): string {
  return `📦 *LEMBRETE DE ENTREGA*

Olá, *${companyName}*!

Você tem uma entrega agendada para daqui a pouco:

👤 *Cliente:* ${clientName}
📋 *Pedido:* ${orderType}
⏰ *Horário:* ${deliveryTime}
💰 *Valor:* ${formatCentsBRL(orderValue)}

Prepare-se para a entrega! 🚀

_Fast Cash Flow_`;
}

// Gerar mensagem de resumo diário
export function generateDailySummaryMessage(
  companyName: string,
  summary: DailySummary
): string {
  const balanceEmoji = summary.balance_cents >= 0 ? '✅' : '⚠️';
  const monthlyBalanceEmoji = summary.monthly_balance_cents >= 0 ? '📈' : '📉';

  return `📊 *RESUMO FINANCEIRO DIÁRIO*

Olá, *${companyName}*!

Aqui está o resumo do dia ${summary.date}:

💰 *HOJE*
➕ Entradas: ${formatCentsBRL(summary.income_cents)}
➖ Saídas: ${formatCentsBRL(summary.expense_cents)}
${balanceEmoji} Saldo: ${formatCentsBRL(summary.balance_cents)}

📅 *ESTE MÊS*
➕ Entradas: ${formatCentsBRL(summary.monthly_income_cents)}
➖ Saídas: ${formatCentsBRL(summary.monthly_expense_cents)}
${monthlyBalanceEmoji} Saldo: ${formatCentsBRL(summary.monthly_balance_cents)}

Continue acompanhando suas finanças! 💪

_Fast Cash Flow_`;
}

// Gerar mensagem de lembrete de dívida
export function generateDebtReminderMessage(
  companyName: string,
  debtDescription: string,
  debtValue: number,
  dueDate: string,
  creditor: string
): string {
  return `⚠️ *LEMBRETE DE DÍVIDA*

Olá, *${companyName}*!

Você tem uma dívida que vence *AMANHÃ*:

📋 *Descrição:* ${debtDescription}
👤 *Credor:* ${creditor}
💰 *Valor:* ${formatCentsBRL(debtValue)}
📅 *Vencimento:* ${dueDate}

Analise suas finanças e organize-se para o pagamento.

💡 *Dica:* Manter as contas em dia evita juros e multas!

_Fast Cash Flow_`;
}

// Registrar log de notificação
export async function logNotification(
  companyId: string,
  type: string,
  recipient: string,
  message: string,
  status: 'pending' | 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from('notification_logs').insert({
      company_id: companyId,
      notification_type: type,
      recipient,
      message,
      status,
      error_message: errorMessage,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error('Erro ao registrar log de notificação:', error);
  }
}

// Agendar notificação
export async function scheduleNotification(
  companyId: string,
  type: string,
  scheduledFor: Date,
  referenceId?: string,
  referenceType?: string,
  payload?: any
): Promise<boolean> {
  try {
    const { error } = await supabase.from('scheduled_notifications').insert({
      company_id: companyId,
      notification_type: type,
      scheduled_for: scheduledFor.toISOString(),
      reference_id: referenceId,
      reference_type: referenceType,
      payload,
      status: 'pending',
    });

    if (error) {
      console.error('Erro ao agendar notificação:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao agendar notificação:', error);
    return false;
  }
}

// Cancelar notificação agendada
export async function cancelScheduledNotification(
  referenceId: string,
  referenceType: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scheduled_notifications')
      .update({ status: 'cancelled' })
      .eq('reference_id', referenceId)
      .eq('reference_type', referenceType)
      .eq('status', 'pending');

    return !error;
  } catch (error) {
    console.error('Erro ao cancelar notificação:', error);
    return false;
  }
}

// Buscar notificações pendentes para processar
export async function getPendingNotifications(): Promise<any[]> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .select(`
        *,
        companies:company_id (name, email),
        notification_settings:company_id (*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Erro ao buscar notificações pendentes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return [];
  }
}

// Processar e enviar notificação
export async function processNotification(notification: any): Promise<boolean> {
  try {
    const settings = notification.notification_settings;
    if (!settings?.whatsapp_enabled || !settings?.whatsapp_number) {
      // Marcar como enviada mesmo sem WhatsApp configurado
      await supabase
        .from('scheduled_notifications')
        .update({ status: 'sent', processed_at: new Date().toISOString() })
        .eq('id', notification.id);
      return true;
    }

    let message = '';
    const companyName = notification.companies?.name || 'Empresa';

    switch (notification.notification_type) {
      case 'order_delivery':
        message = generateOrderDeliveryMessage(
          companyName,
          notification.payload?.client_name || 'Cliente',
          notification.payload?.order_type || 'Pedido',
          notification.payload?.delivery_time || '',
          notification.payload?.order_value_cents || 0
        );
        break;

      case 'daily_summary':
        message = generateDailySummaryMessage(companyName, notification.payload);
        break;

      case 'debt_reminder':
        message = generateDebtReminderMessage(
          companyName,
          notification.payload?.description || 'Dívida',
          notification.payload?.amount_cents || 0,
          notification.payload?.due_date || '',
          notification.payload?.creditor || 'Credor'
        );
        break;

      default:
        console.warn('Tipo de notificação desconhecido:', notification.notification_type);
        return false;
    }

    const result = await sendWhatsAppMessage(settings.whatsapp_number, message, settings);

    // Atualizar status
    await supabase
      .from('scheduled_notifications')
      .update({
        status: result.success ? 'sent' : 'failed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', notification.id);

    // Registrar log
    await logNotification(
      notification.company_id,
      notification.notification_type,
      settings.whatsapp_number,
      message,
      result.success ? 'sent' : 'failed',
      result.error
    );

    return result.success;
  } catch (error) {
    console.error('Erro ao processar notificação:', error);
    return false;
  }
}
