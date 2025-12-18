import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

interface SyncLog {
  timestamp: string;
  companyId: string;
  event: string;
  table: string;
  success: boolean;
  error?: string;
  latencyMs?: number;
}

interface SyncHealth {
  isHealthy: boolean;
  lastSync: string | null;
  failureCount: number;
  averageLatencyMs: number;
  recentLogs: SyncLog[];
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

// Helper para storage multiplataforma
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

class SyncMonitor {
  private logs: SyncLog[] = [];
  private maxLogs = 50;
  private failureThreshold = 5;
  private connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  private healthListeners: Array<(health: SyncHealth) => void> = [];

  constructor() {
    this.loadLogs();
  }

  async logSyncEvent(
    companyId: string,
    event: string,
    table: string,
    success: boolean,
    startTime: number,
    error?: string
  ) {
    const log: SyncLog = {
      timestamp: new Date().toISOString(),
      companyId,
      event,
      table,
      success,
      error,
      latencyMs: Date.now() - startTime,
    };

    this.logs.push(log);

    // Manter apenas os últimos 50 logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Salvar localmente
    await this.saveLogs();

    // Notificar listeners
    this.notifyHealthChange();

    // Alertar se muitas falhas
    const recentFailures = this.logs
      .slice(-this.failureThreshold)
      .filter((l) => !l.success).length;

    if (recentFailures >= this.failureThreshold) {
      console.error('🚨 ALERTA: Múltiplas falhas de sincronização detectadas!');
      this.notifyHealthIssue();
    }

    // Log no console para debug
    if (success) {
      console.log(`✅ [SYNC] ${event} em ${table} (${log.latencyMs}ms)`);
    } else {
      console.error(`❌ [SYNC] ${event} em ${table} falhou: ${error}`);
    }
  }

  setConnectionStatus(status: 'connected' | 'disconnected' | 'reconnecting') {
    this.connectionStatus = status;
    console.log(`📡 [SYNC] Status da conexão: ${status}`);
    this.notifyHealthChange();
  }

  async getHealth(): Promise<SyncHealth> {
    const recentLogs = this.logs.slice(-10);
    const failureCount = this.logs.filter((l) => !l.success).length;
    const successfulSyncs = this.logs.filter((l) => l.success && l.latencyMs);
    const averageLatency =
      successfulSyncs.length > 0
        ? successfulSyncs.reduce((sum, l) => sum + (l.latencyMs || 0), 0) /
          successfulSyncs.length
        : 0;

    const lastSync = this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null;

    return {
      isHealthy: failureCount < this.failureThreshold && this.connectionStatus === 'connected',
      lastSync,
      failureCount,
      averageLatencyMs: Math.round(averageLatency),
      recentLogs,
      connectionStatus: this.connectionStatus,
    };
  }

  // Adicionar listener para mudanças de saúde
  onHealthChange(callback: (health: SyncHealth) => void) {
    this.healthListeners.push(callback);
    return () => {
      this.healthListeners = this.healthListeners.filter((cb) => cb !== callback);
    };
  }

  private async notifyHealthChange() {
    const health = await this.getHealth();
    this.healthListeners.forEach((cb) => {
      try {
        cb(health);
      } catch (e) {
        console.error('Erro ao notificar listener de saúde:', e);
      }
    });
  }

  private async saveLogs() {
    try {
      await storage.setItem('sync_logs', JSON.stringify(this.logs));
    } catch (error) {
      console.error('Erro ao salvar logs de sync:', error);
    }
  }

  async loadLogs() {
    try {
      const stored = await storage.getItem('sync_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar logs de sync:', error);
    }
  }

  private notifyHealthIssue() {
    // Implementar notificação ao usuário
    console.warn('⚠️ Problemas de sincronização detectados. Verifique sua conexão.');
  }

  clearLogs() {
    this.logs = [];
    storage.removeItem('sync_logs');
    this.notifyHealthChange();
  }

  // Diagnóstico completo
  async runDiagnostics(): Promise<{
    status: 'ok' | 'warning' | 'error';
    issues: string[];
    recommendations: string[];
  }> {
    const health = await this.getHealth();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Verificar conexão
    if (health.connectionStatus !== 'connected') {
      issues.push('Conexão Realtime não está ativa');
      recommendations.push('Verifique sua conexão com a internet');
    }

    // Verificar falhas recentes
    if (health.failureCount > 0) {
      issues.push(`${health.failureCount} falhas de sincronização registradas`);
      if (health.failureCount >= this.failureThreshold) {
        recommendations.push('Considere limpar o cache do aplicativo');
      }
    }

    // Verificar latência
    if (health.averageLatencyMs > 2000) {
      issues.push(`Latência alta: ${health.averageLatencyMs}ms em média`);
      recommendations.push('Sua conexão pode estar lenta');
    }

    // Verificar última sincronização
    if (health.lastSync) {
      const lastSyncDate = new Date(health.lastSync);
      const minutesSinceSync = (Date.now() - lastSyncDate.getTime()) / 1000 / 60;
      if (minutesSinceSync > 5) {
        issues.push(`Última sincronização há ${Math.round(minutesSinceSync)} minutos`);
        recommendations.push('Tente forçar uma sincronização manual');
      }
    } else {
      issues.push('Nenhuma sincronização registrada');
      recommendations.push('Verifique se o Realtime está habilitado no Supabase');
    }

    let status: 'ok' | 'warning' | 'error' = 'ok';
    if (issues.length > 0) status = 'warning';
    if (health.failureCount >= this.failureThreshold || health.connectionStatus === 'disconnected') {
      status = 'error';
    }

    return { status, issues, recommendations };
  }
}

export default new SyncMonitor();
