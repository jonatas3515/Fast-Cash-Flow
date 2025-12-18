export interface NotificationMessage {
    to: string;
    content: string;
    templateId?: string;
    variables?: Record<string, string>;
    mediaUrl?: string;
}

export interface NotificationResult {
    success: boolean;
    messageId?: string;
    error?: string;
    providerResponse?: any;
}

export type NotificationProviderType = 'logger' | 'custom_api' | 'evolution_api';

export interface INotificationProvider {
    name: string;
    type: NotificationProviderType;
    /**
     * Envia uma mensagem via provider
     */
    send(message: NotificationMessage): Promise<NotificationResult>;
    /**
     * Valida se a configuração do provider está correta (api keys, urls, etc)
     */
    validateConfig(): Promise<boolean>;
}
