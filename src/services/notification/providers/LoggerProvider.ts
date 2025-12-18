import { INotificationProvider, NotificationMessage, NotificationResult, NotificationProviderType } from '../types';

export class LoggerProvider implements INotificationProvider {
    name = 'Console Logger (Dev)';
    type: NotificationProviderType = 'logger';

    async send(message: NotificationMessage): Promise<NotificationResult> {
        console.group('📱 [Notification Mock] Enviando Mensagem');
        console.log('Para:', message.to);
        console.log('Conteúdo:', message.content);
        if (message.templateId) console.log('Template:', message.templateId);
        if (message.mediaUrl) console.log('Mídia:', message.mediaUrl);
        console.groupEnd();

        // Simula delay de rede
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            success: true,
            messageId: `mock_${Date.now()}`,
            providerResponse: { status: 'logged' }
        };
    }

    async validateConfig(): Promise<boolean> {
        return true;
    }
}
