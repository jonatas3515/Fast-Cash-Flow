import { INotificationProvider, NotificationMessage, NotificationResult, NotificationProviderType } from '../types';

export interface CustomApiConfig {
    url: string;
    authToken?: string;
    authHeaderName?: string; // Default: 'Authorization'
}

export class CustomApiProvider implements INotificationProvider {
    name = 'Custom API Webhook';
    type: NotificationProviderType = 'custom_api';

    private config: CustomApiConfig;

    constructor(config: CustomApiConfig) {
        this.config = config;
    }

    async send(message: NotificationMessage): Promise<NotificationResult> {
        try {
            if (!this.config.url) {
                return { success: false, error: 'URL da API não configurada' };
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (this.config.authToken) {
                const headerName = this.config.authHeaderName || 'Authorization';
                headers[headerName] = this.config.authToken;
            }

            console.log(`[CustomApiProvider] Enviando POST para ${this.config.url}`);

            const response = await fetch(this.config.url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    phone: message.to, // Formato padrão sugerido
                    message: message.content,
                    ...message // Envia tudo extra também
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                return {
                    success: false,
                    error: `Erro HTTP ${response.status}: ${JSON.stringify(data)}`
                };
            }

            return {
                success: true,
                messageId: data.id || data.messageId || 'unknown',
                providerResponse: data
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async validateConfig(): Promise<boolean> {
        return !!this.config.url && this.config.url.startsWith('http');
    }
}
