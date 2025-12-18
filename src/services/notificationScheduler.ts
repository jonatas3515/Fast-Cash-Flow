import { supabase } from '../lib/supabase';
import { 
  scheduleNotification, 
  cancelScheduledNotification,
  getNotificationSettings,
  DailySummary
} from './whatsappNotifications';
import { todayYMD } from '../utils/date';

// Agendar notificação de entrega de encomenda (3h antes)
export async function scheduleOrderDeliveryNotification(
  companyId: string,
  orderId: string,
  clientName: string,
  orderType: string,
  deliveryDate: string,
  deliveryTime: string,
  orderValueCents: number
): Promise<boolean> {
  try {
    const settings = await getNotificationSettings(companyId);
    if (!settings?.notify_order_delivery) {
      console.log('Notificação de entrega desativada para esta empresa');
      return false;
    }

    // Calcular horário da notificação (3h antes da entrega)
    const hoursBeforeDelivery = settings.order_reminder_hours || 3;
    const [hours, minutes] = deliveryTime.split(':').map(Number);
    
    const deliveryDateTime = new Date(`${deliveryDate}T${deliveryTime}:00`);
    const notificationTime = new Date(deliveryDateTime.getTime() - (hoursBeforeDelivery * 60 * 60 * 1000));
    
    // Se o horário já passou, não agendar
    if (notificationTime <= new Date()) {
      console.log('Horário de notificação já passou, não agendando');
      return false;
    }

    // Cancelar notificação anterior se existir
    await cancelScheduledNotification(orderId, 'order');

    // Agendar nova notificação
    return await scheduleNotification(
      companyId,
      'order_delivery',
      notificationTime,
      orderId,
      'order',
      {
        client_name: clientName,
        order_type: orderType,
        delivery_time: deliveryTime,
        order_value_cents: orderValueCents,
      }
    );
  } catch (error) {
    console.error('Erro ao agendar notificação de entrega:', error);
    return false;
  }
}

// Agendar notificação de resumo diário (às 20h)
export async function scheduleDailySummaryNotification(companyId: string): Promise<boolean> {
  try {
    const settings = await getNotificationSettings(companyId);
    if (!settings?.notify_daily_summary) {
      return false;
    }

    // Calcular horário da notificação (20h de hoje ou amanhã se já passou)
    const [hours, minutes] = (settings.daily_summary_time || '20:00').split(':').map(Number);
    
    const now = new Date();
    let notificationTime = new Date(now);
    notificationTime.setHours(hours, minutes, 0, 0);
    
    // Se já passou o horário de hoje, agendar para amanhã
    if (notificationTime <= now) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }

    const today = todayYMD();
    const referenceId = `daily_${companyId}_${today}`;

    // Cancelar notificação anterior se existir
    await cancelScheduledNotification(referenceId, 'daily_summary');

    // Buscar dados do resumo (usando queries diretas do Supabase)
    const { data: dailyData } = await supabase
      .from('transactions')
      .select('type, amount_cents')
      .eq('company_id', companyId)
      .eq('date', today)
      .is('deleted_at', null);

    const { data: monthlyData } = await supabase
      .from('transactions')
      .select('type, amount_cents')
      .eq('company_id', companyId)
      .gte('date', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
      .lte('date', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`)
      .is('deleted_at', null);

    // Calcular totais diários
    let dailyIncome = 0, dailyExpense = 0;
    (dailyData || []).forEach((tx: any) => {
      if (tx.type === 'income') dailyIncome += tx.amount_cents;
      else dailyExpense += tx.amount_cents;
    });

    // Calcular totais mensais
    let monthlyIncome = 0, monthlyExpense = 0;
    (monthlyData || []).forEach((tx: any) => {
      if (tx.type === 'income') monthlyIncome += tx.amount_cents;
      else monthlyExpense += tx.amount_cents;
    });

    const summary: DailySummary = {
      date: new Date().toLocaleDateString('pt-BR'),
      income_cents: dailyIncome,
      expense_cents: dailyExpense,
      balance_cents: dailyIncome - dailyExpense,
      monthly_income_cents: monthlyIncome,
      monthly_expense_cents: monthlyExpense,
      monthly_balance_cents: monthlyIncome - monthlyExpense,
    };

    return await scheduleNotification(
      companyId,
      'daily_summary',
      notificationTime,
      referenceId,
      'daily_summary',
      summary
    );
  } catch (error) {
    console.error('Erro ao agendar resumo diário:', error);
    return false;
  }
}

// Agendar notificação de lembrete de dívida (dia anterior às 12h)
export async function scheduleDebtReminderNotification(
  companyId: string,
  debtId: string,
  description: string,
  amountCents: number,
  dueDate: string,
  creditor: string
): Promise<boolean> {
  try {
    const settings = await getNotificationSettings(companyId);
    if (!settings?.notify_debt_reminder) {
      return false;
    }

    // Calcular horário da notificação (12h do dia anterior ao vencimento)
    const [hours, minutes] = (settings.debt_reminder_time || '12:00').split(':').map(Number);
    
    const dueDateObj = new Date(`${dueDate}T12:00:00`);
    const notificationTime = new Date(dueDateObj);
    notificationTime.setDate(notificationTime.getDate() - 1); // Dia anterior
    notificationTime.setHours(hours, minutes, 0, 0);
    
    // Se o horário já passou, não agendar
    if (notificationTime <= new Date()) {
      console.log('Horário de notificação de dívida já passou');
      return false;
    }

    // Cancelar notificação anterior se existir
    await cancelScheduledNotification(debtId, 'debt');

    // Formatar data para exibição
    const formattedDueDate = new Date(dueDate).toLocaleDateString('pt-BR');

    return await scheduleNotification(
      companyId,
      'debt_reminder',
      notificationTime,
      debtId,
      'debt',
      {
        description,
        amount_cents: amountCents,
        due_date: formattedDueDate,
        creditor,
      }
    );
  } catch (error) {
    console.error('Erro ao agendar lembrete de dívida:', error);
    return false;
  }
}

// Verificar e agendar todas as notificações pendentes para uma empresa
export async function syncNotificationsForCompany(companyId: string): Promise<void> {
  try {
    const settings = await getNotificationSettings(companyId);
    if (!settings?.whatsapp_enabled) {
      console.log('WhatsApp desativado para empresa:', companyId);
      return;
    }

    // 1. Agendar resumo diário
    if (settings.notify_daily_summary) {
      await scheduleDailySummaryNotification(companyId);
    }

    // 2. Buscar encomendas pendentes e agendar notificações
    if (settings.notify_order_delivery) {
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['pending', 'in_progress'])
        .is('deleted_at', null)
        .gte('delivery_date', todayYMD());

      if (orders) {
        for (const order of orders) {
          await scheduleOrderDeliveryNotification(
            companyId,
            order.id,
            order.client_name,
            order.order_type,
            order.delivery_date,
            order.delivery_time || '14:00',
            order.order_value_cents
          );
        }
      }
    }

    // 3. Buscar dívidas próximas de vencer e agendar lembretes
    if (settings.notify_debt_reminder) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2); // Próximos 2 dias
      
      const { data: debts } = await supabase
        .from('debts')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .is('deleted_at', null)
        .lte('due_date', tomorrow.toISOString().split('T')[0])
        .gte('due_date', todayYMD());

      if (debts) {
        for (const debt of debts) {
          await scheduleDebtReminderNotification(
            companyId,
            debt.id,
            debt.description,
            debt.amount_cents,
            debt.due_date,
            debt.creditor || 'Não informado'
          );
        }
      }
    }

    console.log('Notificações sincronizadas para empresa:', companyId);
  } catch (error) {
    console.error('Erro ao sincronizar notificações:', error);
  }
}

// Função para ser chamada periodicamente (cron job ou background task)
export async function processAllPendingNotifications(): Promise<{ sent: number; failed: number }> {
  try {
    const { getPendingNotifications, processNotification } = await import('./whatsappNotifications');
    
    const notifications = await getPendingNotifications();
    let sent = 0;
    let failed = 0;

    for (const notification of notifications) {
      const success = await processNotification(notification);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    console.log(`Notificações processadas: ${sent} enviadas, ${failed} falharam`);
    return { sent, failed };
  } catch (error) {
    console.error('Erro ao processar notificações:', error);
    return { sent: 0, failed: 0 };
  }
}
