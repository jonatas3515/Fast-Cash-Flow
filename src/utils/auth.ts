/**
 * Utilitários de autenticação e verificação de permissões
 * Centraliza a lógica de verificação de admin para uso em todo o app
 */

// Lista de e-mails com acesso admin
const ADMIN_EMAILS = [
    'admin@fastcashflow.com.br',
    'suporte@fastcashflow.com.br',
    'jonatas.silva@jnccontabilidade.com.br', // JNC Admin
];

/**
 * Verifica se um usuário é administrador
 * @param user Objeto do usuário Supabase (ou parcial com email/metadata)
 * @returns true se o usuário tem permissão de admin
 */
export function isAdminUser(user: any): boolean {
    if (!user) return false;

    // 1. Verificar email na lista de admins
    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return true;
    }

    // 2. Verificar metadata de role
    if (user.user_metadata?.role === 'admin') {
        return true;
    }

    // 3. Verificar app_metadata (alguns projetos usam)
    if (user.app_metadata?.role === 'admin') {
        return true;
    }

    return false;
}

/**
 * Verifica se um email está na lista de admins
 * @param email Email a verificar
 * @returns true se o email tem permissão de admin
 */
export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Lista de emails admin (readonly para uso externo se necessário)
 */
export const getAdminEmails = (): readonly string[] => ADMIN_EMAILS;
