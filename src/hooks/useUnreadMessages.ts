/**
 * Hook para buscar contagem de mensagens não lidas
 * Usado tanto no Admin quanto na tela da Empresa
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface UnreadCounts {
    supportMessages: number;  // Mensagens de suporte não lidas
    adminMessages: number;    // Comunicados do admin não lidos
}

/**
 * Hook para administradores
 * Conta mensagens de suporte não lidas por empresas
 */
export function useAdminUnreadMessages() {
    return useQuery({
        queryKey: ['admin-unread-messages'],
        queryFn: async (): Promise<number> => {
            try {
                const { data, error } = await supabase
                    .from('support_conversations')
                    .select('unread_by_admin');

                if (error) {
                    console.warn('Erro ao buscar mensagens não lidas (admin):', error.message);
                    return 0;
                }

                const total = data?.reduce((sum, conv) => sum + (conv.unread_by_admin || 0), 0) || 0;
                return total;
            } catch (err) {
                console.error('Erro ao buscar mensagens não lidas (admin):', err);
                return 0;
            }
        },
        refetchInterval: 30000, // Atualiza a cada 30 segundos
        staleTime: 10000,
    });
}

/**
 * Hook para empresas
 * Conta mensagens de suporte e comunicados não lidos
 */
export function useCompanyUnreadMessages(companyId: string | null) {
    return useQuery({
        queryKey: ['company-unread-messages', companyId],
        queryFn: async (): Promise<UnreadCounts> => {
            if (!companyId) {
                return { supportMessages: 0, adminMessages: 0 };
            }

            try {
                // Mensagens de suporte não lidas pela empresa
                const { data: convData } = await supabase
                    .from('support_conversations')
                    .select('unread_by_company')
                    .eq('company_id', companyId)
                    .maybeSingle();

                // Comunicados do admin não lidos
                const { count: adminCount } = await supabase
                    .from('admin_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', companyId)
                    .eq('read', false);

                return {
                    supportMessages: convData?.unread_by_company || 0,
                    adminMessages: adminCount || 0,
                };
            } catch (err) {
                console.error('Erro ao buscar mensagens não lidas (empresa):', err);
                return { supportMessages: 0, adminMessages: 0 };
            }
        },
        enabled: !!companyId,
        refetchInterval: 30000,
        staleTime: 10000,
    });
}

/**
 * Hook genérico que retorna o total de mensagens não lidas
 */
export function useTotalUnreadMessages(isAdmin: boolean, companyId: string | null) {
    const adminQuery = useAdminUnreadMessages();
    const companyQuery = useCompanyUnreadMessages(companyId);

    if (isAdmin) {
        return {
            total: adminQuery.data || 0,
            isLoading: adminQuery.isLoading,
            refetch: adminQuery.refetch,
        };
    }

    const companyData = companyQuery.data;
    return {
        total: (companyData?.supportMessages || 0) + (companyData?.adminMessages || 0),
        supportMessages: companyData?.supportMessages || 0,
        adminMessages: companyData?.adminMessages || 0,
        isLoading: companyQuery.isLoading,
        refetch: companyQuery.refetch,
    };
}
