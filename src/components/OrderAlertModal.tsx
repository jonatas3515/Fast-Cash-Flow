import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { useThemeCtx } from '../theme/ThemeProvider';

interface Order {
    id: string;
    client_name: string;
    delivery_date: string;
    delivery_time: string;
    status: string;
}

// Storage helper para funcionar em web e mobile
const storage = {
    getItem: (key: string): string | null => {
        try {
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                return localStorage.getItem(key);
            }
            return null;
        } catch {
            return null;
        }
    },
    setItem: (key: string, value: string): void => {
        try {
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                localStorage.setItem(key, value);
            }
        } catch {
            // Ignore errors
        }
    },
    removeItem: (key: string): void => {
        try {
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                localStorage.removeItem(key);
            }
        } catch {
            // Ignore errors
        }
    }
};

// Helper para obter data no fuso horário de Brasília
function getBrasiliaDate(date: Date = new Date()): string {
    return date.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

// Helper para obter hora atual no fuso horário de Brasília
function getBrasiliaHour(date: Date = new Date()): number {
    const timeStr = date.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        hour12: false
    });
    return parseInt(timeStr, 10);
}

// Helper para obter hora/minuto atual no fuso horário de Brasília (HH:MM)
function getBrasiliaTimeHHMM(date: Date = new Date()): string {
    return date.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

// Função para verificar encomendas que precisam de alerta
function getAlertOrders(orders: Order[]): { type: 'today' | 'tomorrow'; orders: Order[] } | null {
    const now = new Date();
    const currentHour = getBrasiliaHour(now);
    const todayStr = getBrasiliaDate(now);

    // Calcular amanhã
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getBrasiliaDate(tomorrow);

    // Filtrar apenas encomendas pendentes e em andamento
    const activeOrders = orders.filter(o =>
        o.status !== 'cancelled' && o.status !== 'completed'
    );

    // Primeiro, verificar encomendas de HOJE (prioridade máxima)
    const todayOrders = activeOrders
        .filter(o => o.delivery_date === todayStr)
        .sort((a, b) => (a.delivery_time || '23:59').localeCompare(b.delivery_time || '23:59'));

    if (todayOrders.length > 0) {
        return { type: 'today', orders: todayOrders };
    }

    // Se for após 12h (meio-dia), verificar encomendas de AMANHÃ
    if (currentHour >= 12) {
        const tomorrowOrders = activeOrders
            .filter(o => o.delivery_date === tomorrowStr)
            .sort((a, b) => (a.delivery_time || '23:59').localeCompare(b.delivery_time || '23:59'));

        if (tomorrowOrders.length > 0) {
            return { type: 'tomorrow', orders: tomorrowOrders };
        }
    }

    return null;
}

export default function OrderAlertModal() {
    const [visible, setVisible] = React.useState(false);
    const [dismissed, setDismissed] = React.useState(false);
    const { theme } = useThemeCtx();
    const { companyId } = useCompany();
    const navigation = useNavigation<any>();

    // Query para buscar encomendas
    const ordersQuery = useQuery({
        queryKey: ['orders-alert', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('orders')
                .select('id, client_name, delivery_date, delivery_time, status')
                .eq('company_id', companyId)
                .in('status', ['pending', 'in_progress']);

            if (error) {
                console.log('[OrderAlert] Query error:', error.message);
                return [];
            }
            return data || [];
        },
        enabled: !!companyId,
        staleTime: 60000, // 1 minuto
        refetchInterval: 60000, // Refetch a cada 1 minuto
    });

    const alertData = React.useMemo(() => {
        if (!ordersQuery.data || ordersQuery.data.length === 0) return null;
        return getAlertOrders(ordersQuery.data);
    }, [ordersQuery.data]);

    // Mostrar modal quando há alertas e não foi dismissado
    React.useEffect(() => {
        if (alertData && !dismissed) {
            // Pequeno delay para evitar flash durante carregamento
            const timer = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, [alertData, dismissed]);

    // Reset dismissed quando o dia mudar
    React.useEffect(() => {
        const checkDate = () => {
            const storedDate = storage.getItem('orderAlertDismissedDate');
            const today = getBrasiliaDate();
            if (storedDate !== today) {
                setDismissed(false);
                storage.removeItem('orderAlertDismissedDate');
            }
        };
        checkDate();
        const interval = setInterval(checkDate, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    const handleDismiss = () => {
        setVisible(false);
        setDismissed(true);
        storage.setItem('orderAlertDismissedDate', getBrasiliaDate());
    };

    const handleGoToOrders = () => {
        setVisible(false);
        setDismissed(true);
        storage.setItem('orderAlertDismissedDate', getBrasiliaDate());
        try {
            navigation.navigate('Encomendas');
        } catch (e) {
            console.warn('[OrderAlert] Navigation error:', e);
        }
    };

    if (!alertData || !visible) return null;

    const { type, orders } = alertData;
    const firstOrder = orders[0];
    const orderCount = orders.length;

    const now = new Date();
    const currentTime = getBrasiliaTimeHHMM(now);
    const isLateToday = type === 'today' && (firstOrder.delivery_time || '23:59') < currentTime;

    // Montar mensagem
    let title = '';
    let message = '';
    const timeStr = firstOrder.delivery_time || 'horário não definido';

    if (type === 'today') {
        title = isLateToday ? '🚨 Entrega Atrasada!' : '📦 Entrega para Hoje!';
        if (orderCount === 1) {
            message = isLateToday
                ? `Você tem uma encomenda com entrega ATRASADA! Era para HOJE às ${timeStr} para ${firstOrder.client_name}.`
                : `Você tem uma encomenda para ser entregue HOJE às ${timeStr} para ${firstOrder.client_name}.`;
        } else {
            message = isLateToday
                ? `Você tem ${orderCount} encomendas com entrega ATRASADA! A primeira era HOJE às ${timeStr} para ${firstOrder.client_name}.`
                : `Você tem ${orderCount} encomendas para entregar HOJE! A primeira é às ${timeStr} para ${firstOrder.client_name}.`;
        }
    } else {
        title = '📦 Entrega para Amanhã!';
        if (orderCount === 1) {
            message = `Você tem uma encomenda para entregar AMANHÃ às ${timeStr} para ${firstOrder.client_name}.`;
        } else {
            message = `Você tem ${orderCount} encomendas para entregar AMANHÃ! A primeira é às ${timeStr} para ${firstOrder.client_name}.`;
        }
    }

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: type === 'today' ? (isLateToday ? '#fee2e2' : '#fef3c7') : '#dbeafe' }]}>
                        <Text style={styles.icon}>{type === 'today' ? '⚠️' : '📅'}</Text>
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: theme.text }]}>
                        {title}
                    </Text>

                    {/* Message */}
                    <Text style={[styles.message, { color: theme.textSecondary }]}>
                        {message}
                    </Text>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            onPress={handleDismiss}
                            style={[styles.button, styles.secondaryButton, { borderColor: theme.border }]}
                        >
                            <Text style={[styles.buttonText, { color: theme.text }]}>OK</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleGoToOrders}
                            style={[styles.button, styles.primaryButton, { backgroundColor: type === 'today' ? (isLateToday ? '#dc2626' : '#f59e0b') : '#3b82f6' }]}
                        >
                            <Text style={[styles.buttonText, { color: '#fff' }]}>Ir para Encomendas</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    icon: {
        fontSize: 32,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    primaryButton: {},
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
