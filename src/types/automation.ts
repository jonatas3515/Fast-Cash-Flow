export type TriggerType = 'payment_due' | 'payment_overdue' | 'daily_sales' | 'goal_reached';
export type ActionType = 'whatsapp_message' | 'push_notification';

export interface AutomationRule {
    id: string;
    company_id: string;
    name: string;
    description?: string;
    trigger_type: TriggerType;
    trigger_config: {
        days_before?: number; // Para payment_due
        days_after?: number; // Para payment_overdue
        time_of_day?: string; // Para daily_sales (HH:MM)
        threshold?: number; // Para goal_reached
    };
    action_type: ActionType;
    action_config: {
        template_text?: string;
        phone_field?: string; // Qual campo usar (customer_phone, etc)
    };
    is_active: boolean;
    created_at: string;
}

export const TRIGGER_LABELS: Record<TriggerType, string> = {
    payment_due: 'Conta Vencendo',
    payment_overdue: 'Conta Atrasada',
    daily_sales: 'Resumo Diário de Vendas',
    goal_reached: 'Meta Atingida',
};

export const ACTION_LABELS: Record<ActionType, string> = {
    whatsapp_message: 'Enviar WhatsApp',
    push_notification: 'Notificação Push',
};
