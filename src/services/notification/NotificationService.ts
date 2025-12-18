import { INotificationProvider, NotificationMessage, NotificationResult, NotificationProviderType } from './types';
import { LoggerProvider } from './providers/LoggerProvider';

class NotificationService {
    private activeProvider: INotificationProvider;
    private providers: Map<NotificationProviderType, INotificationProvider>;

    constructor() {
        this.providers = new Map();

        // Registrar providers disponíveis
        const logger = new LoggerProvider();
        this.providers.set('logger', logger);

        // Por padrão usa logger até que seja configurado outro via banco
        this.activeProvider = logger;
    }

    /**
     * Registra um novo provider dinamicamente
     */
    registerProvider(provider: INotificationProvider) {
        this.providers.set(provider.type, provider);
    }

    /**
     * Configura qual provider usar
     */
    setProvider(type: NotificationProviderType) {
        const provider = this.providers.get(type);
        if (provider) {
            this.activeProvider = provider;
            console.log(`[NotificationService] Provider alterado para: ${provider.name}`);
        } else {
            console.warn(`[NotificationService] Provider ${type} não encontrado. Mantendo atual.`);
        }
    }

    /**
     * Envia notificação usando o provider ativo
     */
    async send(message: NotificationMessage): Promise<NotificationResult> {
        try {
            // Validações básicas
            if (!message.to) {
                return { success: false, error: 'Número de destino inválido' };
            }

            console.log(`[NotificationService] Enviando via ${this.activeProvider.name}...`);
            const result = await this.activeProvider.send(message);

            // Aqui poderíamos salvar log de envio no banco de dados futuramente

            return result;
        } catch (error: any) {
            console.error('[NotificationService] Erro no envio:', error);
            return {
                success: false,
                error: error.message || 'Erro desconhecido'
            };
        }
    }

    getProviderName(): string {
        return this.activeProvider.name;
    }
}

export const notificationService = new NotificationService();
