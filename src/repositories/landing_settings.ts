import { supabase } from '../lib/supabase';

// ========== TypeScript Interfaces ==========

export interface Feature {
    icon: string;
    title: string;
    description: string;
    benefit: string;
    highlight: boolean;
}

export interface TargetAudience {
    icon: string;
    label: string;
    benefit: string;
}

export interface Screenshot {
    title: string;
    subtitle: string;
    image_url: string; // Can be URL or local path like '/Dashboard.jpg'
}

export interface SocialProof {
    companies: string;
    transactions: string;
    satisfaction: string;
}

export interface Plan {
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    features: string[];
    recommended: boolean;
    savingsBadge: string | null;
}

export interface SecurityBadge {
    icon: string;
    label: string;
}

export interface NavItem {
    label: string;
    ref: string;
}

export interface LandingSettings {
    id: string;
    version: number;
    status: 'draft' | 'published';

    // Hero
    hero_title: string;
    hero_subtitle: string;
    hero_cta_text: string;
    trial_days: number;

    // Features
    features: Feature[];

    // Target Audience
    target_audience: TargetAudience[];

    // Screenshots
    screenshots: Screenshot[];

    // Social Proof
    social_proof: SocialProof;

    // Plans
    plans: Plan[];

    // Security
    security_badges: SecurityBadge[];

    // Evolution
    evolution_title: string;
    evolution_subtitle: string;
    evolution_points: string[];

    // Final CTA
    final_cta_title: string;
    final_cta_subtitle: string;

    // Footer
    footer_year: number;
    footer_company_text: string;
    footer_logo_url: string;

    // Legal Pages
    terms_of_use: string;
    privacy_policy: string;

    // Navigation
    nav_items: NavItem[];

    // Metadata
    published_at: string | null;
    updated_at: string;
    created_at: string;
}

// ========== Default Values (Fallback) ==========

export const DEFAULT_LANDING_SETTINGS: Omit<LandingSettings, 'id' | 'created_at' | 'updated_at' | 'published_at'> = {
    version: 1,
    status: 'published',

    hero_title: 'Gestão financeira para pequenos negócios',
    hero_subtitle: 'Controle seu fluxo de caixa sem complicação. Dashboard intuitivo, relatórios prontos e alertas automáticos.',
    hero_cta_text: 'Começar grátis',
    trial_days: 7,

    features: [
        { icon: '📊', title: 'Dashboard em tempo real', description: 'Veja entradas, saídas e saldo projetado.', benefit: 'Reduza 50% do tempo de fechamento', highlight: true },
        { icon: '📋', title: 'Contas a pagar e receber', description: 'Organize boletos, parcelas e vencimentos.', benefit: 'Evite multas e juros por atraso', highlight: false },
        { icon: '📈', title: 'Relatórios inteligentes', description: 'Análises prontas para decisões e contador.', benefit: 'Exporte em segundos', highlight: false },
        { icon: '🏷️', title: 'Gestão completa', description: 'Clientes, produtos e precificação.', benefit: 'Aumente sua margem de lucro', highlight: false },
    ],

    target_audience: [
        { icon: '🛒', label: 'Comércios', benefit: 'Vendas diárias organizadas' },
        { icon: '🔧', label: 'Serviços', benefit: 'Contratos e recorrências' },
        { icon: '🏥', label: 'Clínicas', benefit: 'Convênios e particulares' },
        { icon: '🏭', label: 'Indústrias', benefit: 'Custos de produção' },
        { icon: '📱', label: 'Delivery', benefit: 'Integração com apps' },
    ],

    screenshots: [
        { title: 'Visão geral do caixa', subtitle: 'Entradas, saídas e saldo projetado', image_url: '/Dashboard.jpg' },
        { title: 'Relatórios para o contador', subtitle: 'Exportações organizadas', image_url: '/Relatórios.jpg' },
    ],

    social_proof: { companies: '+150', transactions: '+10.000', satisfaction: '98%' },

    plans: [
        { name: 'Essencial', description: 'MEI e pequenos negócios', monthlyPrice: 9.99, yearlyPrice: 99.99, features: ['Dashboard de fluxo de caixa', 'Lançamentos diários', 'Contas a pagar e receber', 'Relatórios principais', '1 usuário'], recommended: false, savingsBadge: null },
        { name: 'Profissional', description: 'Crescimento e gestão avançada', monthlyPrice: 15.99, yearlyPrice: 159.90, features: ['Tudo do Essencial', 'Despesas recorrentes', 'Metas financeiras', 'Diagnóstico financeiro', 'Notificações automáticas', '3 usuários'], recommended: true, savingsBadge: 'Economize 17%' },
        { name: 'Avançado', description: 'Múltiplas empresas e equipe', monthlyPrice: 29.99, yearlyPrice: 299.90, features: ['Tudo do Profissional', 'Multiempresa', 'Relatórios detalhados', 'Gestão de equipe', 'Usuários ilimitados'], recommended: false, savingsBadge: null },
    ],

    security_badges: [
        { icon: '🛡️', label: 'Dados protegidos' },
        { icon: '☁️', label: 'Backup automático' },
        { icon: '🔐', label: 'Acesso seguro' },
    ],

    evolution_title: 'Em constante evolução',
    evolution_subtitle: 'Investimos continuamente para entregar a melhor experiência',
    evolution_points: ['Atualizações frequentes', 'Backup automático', 'Equipe de suporte dedicada'],

    final_cta_title: 'Pronto para organizar suas finanças?',
    final_cta_subtitle: 'Comece agora mesmo, sem compromisso.',

    footer_year: 2025,
    footer_company_text: 'Um produto da marca',
    footer_logo_url: 'https://i.im.ge/2025/12/20/BSwhSJ.JNC.png',

    terms_of_use: `# Termos de Uso – Fast Cash Flow

## 1. Sobre o Fast Cash Flow
O Fast Cash Flow é um aplicativo/sistema de controle e gestão de fluxo de caixa, disponível para dispositivos móveis (iOS e Android) e versão web, criado para auxiliar pessoas físicas e jurídicas a registrar entradas, saídas, categorias de despesas e receitas, além de acompanhar indicadores financeiros do seu negócio ou finanças pessoais.

O serviço é disponibilizado por **Neves & Costa**, que pode ser contatada pelo telefone **(73) 99934-8552** ou pelo e-mail **contato@nevesecosta.com.br**.

## 2. Aceitação dos Termos
Ao criar uma conta, acessar ou utilizar o Fast Cash Flow, o usuário declara ter lido, compreendido e concordado com estes Termos de Uso e com a Política de Privacidade.

Caso não concorde com qualquer condição aqui descrita, o usuário não deve utilizar o aplicativo/sistema.

## 3. Cadastro e Conta do Usuário
Para utilizar o Fast Cash Flow, o usuário poderá precisar criar uma conta, informando dados como nome, e-mail e telefone, conforme solicitado na interface.

O usuário é responsável por fornecer informações verídicas, mantê-las atualizadas e proteger a confidencialidade de suas credenciais de acesso.

## 4. Uso do Aplicativo
O Fast Cash Flow é destinado exclusivamente ao controle financeiro e fluxo de caixa, não se caracterizando como consultoria financeira, contábil, jurídica ou investimento.

As decisões financeiras tomadas com base nas informações registradas no aplicativo são de inteira responsabilidade do usuário, que reconhece que os relatórios e gráficos são gerados a partir dos dados que ele mesmo insere.

## 5. Integrações Financeiras (Futuras)
O Fast Cash Flow poderá, no futuro, oferecer integrações com instituições bancárias, operadoras de cartão de crédito, plataformas de pagamento PIX e outros serviços financeiros. Ao utilizar essas integrações, o usuário:

- Autoriza o acesso apenas de leitura às informações necessárias para sincronização automática de transações;
- Reconhece que as integrações dependem de terceiros e podem sofrer indisponibilidades;
- Concorda em fornecer credenciais de forma segura, quando solicitado pela integração.

## 6. Conteúdo e Dados Inseridos pelo Usuário
Todos os lançamentos financeiros (entradas, saídas, categorias, clientes, fornecedores, etc.) registrados no Fast Cash Flow são de responsabilidade exclusiva do usuário, que deve respeitar a legislação vigente e direitos de terceiros.

O usuário declara ter o direito de registrar tais informações, isentando o Fast Cash Flow de qualquer responsabilidade por dados falsos, ilícitos ou inseridos sem autorização.

## 7. Licença de Uso
O Fast Cash Flow concede ao usuário uma licença pessoal, revogável, não exclusiva e intransferível para utilizar o aplicativo, exclusivamente para fins lícitos e de acordo com estes Termos.

É proibido copiar, modificar, distribuir, vender, alugar, sublicenciar ou explorar comercialmente o aplicativo ou qualquer parte de seu código, design ou conteúdo, salvo autorização expressa e por escrito.

## 8. Planos, Pagamentos e Serviços Adicionais
Caso o Fast Cash Flow ofereça planos pagos, funcionalidades premium ou integrações adicionais, as condições de preço, forma de pagamento, período de uso e renovação serão apresentadas na própria interface do aplicativo ou em comunicação oficial.

O usuário se compromete a verificar essas condições antes de contratar qualquer serviço pago.

## 9. Responsabilidades e Limitações
O Fast Cash Flow se compromete a envidar esforços razoáveis para manter o aplicativo em funcionamento, com correções de erros, atualizações e melhorias contínuas.

No entanto, não garante funcionamento ininterrupto, isento de falhas, bugs ou indisponibilidades, não se responsabilizando por prejuízos decorrentes de:

- Uso incorreto do aplicativo;
- Falhas de conexão à internet, dispositivos incompatíveis ou problemas em serviços de terceiros;
- Erros ou omissões nos dados inseridos pelo próprio usuário;
- Indisponibilidade de integrações com bancos, cartões ou serviços de pagamento.

## 10. Segurança e Armazenamento de Dados
O Fast Cash Flow utiliza serviços de terceiros para armazenamento e processamento de dados, como Supabase, além de armazenamento local seguro no dispositivo (por exemplo, Secure Store e Async Storage) para gerenciar sessões e dados necessários ao funcionamento do app.

Embora sejam adotadas práticas técnicas para proteger as informações, nenhum sistema é 100% seguro, e o usuário reconhece e aceita esse risco ao utilizar o serviço.

## 11. Propriedade Intelectual
Todos os direitos relativos ao aplicativo, incluindo nome, marca, logotipo, layouts, códigos-fonte, textos, telas, ícones, imagens e demais elementos, pertencem ao Fast Cash Flow ou a terceiros licenciantes.

É vedado o uso não autorizado de qualquer elemento protegido por propriedade intelectual.

## 12. Suspensão e Encerramento de Conta
O Fast Cash Flow poderá suspender ou encerrar o acesso do usuário, de forma temporária ou definitiva, em casos de:

- Violação destes Termos ou da legislação aplicável;
- Uso fraudulento, indevido ou que prejudique o funcionamento do sistema ou de outros usuários.

O usuário também poderá solicitar o encerramento de sua conta pelos canais de contato oficiais.

## 13. Alterações nos Termos de Uso
Estes Termos de Uso podem ser atualizados a qualquer momento, especialmente em razão de melhorias no aplicativo, mudanças de funcionalidades ou de requisitos legais.

Sempre que alterações relevantes forem feitas, o Fast Cash Flow poderá informar o usuário por meio do próprio aplicativo, e-mail ou outro canal disponível.

## 14. Contato
Em caso de dúvidas, solicitações ou reclamações, o usuário pode entrar em contato pelos seguintes canais:

- **Telefone/WhatsApp:** (73) 99934-8552
- **E-mail:** contato@nevesecosta.com.br

## 15. Foro e Lei Aplicável
Estes Termos de Uso são regidos pela legislação brasileira.

Fica eleito o foro da comarca de domicílio do responsável legal pelo Fast Cash Flow, salvo disposição legal em contrário.`,

    privacy_policy: `# Política de Privacidade – Fast Cash Flow

## 1. Introdução
Esta Política de Privacidade descreve como o Fast Cash Flow coleta, utiliza, armazena e protege os dados pessoais dos usuários ao utilizar o aplicativo/sistema de fluxo de caixa, disponível para dispositivos móveis (iOS e Android) e versão web.

Ao utilizar o aplicativo, o usuário concorda com as práticas descritas neste documento.

## 2. Dados que podem ser coletados
Podem ser coletados os seguintes tipos de dados, conforme o uso do aplicativo:

**Dados de identificação:** nome, e-mail, telefone e outras informações fornecidas pelo usuário no cadastro ou em formulários.

**Dados financeiros inseridos pelo usuário:** lançamentos de receitas e despesas, categorias, formas de pagamento, informações de clientes e fornecedores, metas e outras informações relacionadas ao fluxo de caixa.

**Dados de integrações bancárias:** quando disponíveis, poderão ser coletados dados de transações de contas bancárias, cartões de crédito e pagamentos PIX, mediante autorização expressa do usuário.

**Dados de uso:** informações sobre como o usuário navega pelo aplicativo, telas acessadas, idioma, configurações e logs técnicos necessários para melhor funcionamento e suporte.

## 3. Finalidades do Tratamento de Dados
Os dados pessoais e financeiros são utilizados para:

- Permitir o funcionamento do aplicativo (registro de lançamentos, geração de relatórios, gráficos e dashboards);
- Sincronizar automaticamente transações de contas bancárias e cartões, quando integração estiver disponível;
- Personalizar a experiência do usuário e melhorar o desempenho e a usabilidade do sistema;
- Enviar comunicações importantes sobre atualizações, notificações técnicas ou de segurança, quando aplicável;
- Cumprir obrigações legais, regulatórias ou requisições de autoridades competentes.

## 4. Base Legal para o Tratamento
O tratamento de dados é realizado com base em:

- **Execução de contrato**, para entrega das funcionalidades de controle financeiro oferecidas pelo Fast Cash Flow;
- **Legítimo interesse**, para aprimoramento do serviço, prevenção de fraudes e suporte ao usuário;
- **Consentimento do usuário**, quando exigido pela legislação vigente (por exemplo, para determinadas comunicações de marketing ou integrações bancárias).

## 5. Compartilhamento de Dados com Terceiros
O Fast Cash Flow poderá compartilhar dados com prestadores de serviço que atuam em seu nome, tais como:

- Provedores de hospedagem e banco de dados (como Supabase);
- Serviços auxiliares de análise e monitoramento;
- Instituições financeiras e provedores de pagamento (para integrações bancárias, quando disponíveis).

Esses terceiros recebem apenas os dados necessários para a execução de suas atividades e se comprometem a tratar as informações de forma segura e em conformidade com a legislação aplicável.

## 6. Armazenamento e Segurança
Os dados podem ser armazenados em servidores de terceiros e em armazenamento local seguro no dispositivo (como Secure Store e Async Storage), respeitando boas práticas técnicas de proteção.

São adotadas medidas de segurança administrativas, técnicas e físicas para proteger os dados contra acessos não autorizados, uso indevido, perda, alteração ou destruição; contudo, o usuário reconhece que nenhum sistema é totalmente imune a riscos.

## 7. Retenção e Exclusão de Dados
Os dados serão mantidos pelo tempo necessário para:

- Prestação do serviço de fluxo de caixa ao usuário;
- Cumprimento de obrigações legais ou regulatórias;
- Exercício regular de direitos em processos judiciais ou administrativos, se necessário.

O usuário pode solicitar a exclusão de sua conta e de seus dados pessoais, respeitadas as obrigações legais de retenção e prazos mínimos exigidos pela legislação.

## 8. Direitos do Usuário (LGPD)
Nos termos da Lei Geral de Proteção de Dados (LGPD – Lei 13.709/2018), o usuário tem, entre outros, os seguintes direitos em relação a seus dados pessoais:

- Confirmar se há tratamento de dados e solicitar acesso às informações;
- Solicitar correção de dados incompletos, inexatos ou desatualizados;
- Solicitar anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei;
- Solicitar portabilidade dos dados a outro fornecedor de serviço, quando aplicável;
- Solicitar eliminação dos dados pessoais tratados com base no consentimento, quando possível;
- Revogar consentimento e se opor a tratamentos realizados em desacordo com a LGPD.

Os pedidos podem ser realizados pelos canais de contato indicados nesta Política.

## 9. Cookies, Identificadores e Tecnologias Similares
Caso o Fast Cash Flow seja utilizado em versão web, poderão ser utilizados cookies e tecnologias similares para autenticação, segurança, análise de uso e personalização de experiência.

O usuário poderá gerenciar suas preferências de cookies no navegador, ciente de que a desativação de determinados tipos de cookies pode afetar o funcionamento do sistema.

## 10. Crianças e Adolescentes
O Fast Cash Flow não é direcionado especificamente a crianças.

Caso seja identificado o tratamento de dados pessoais de menores sem a devida autorização, o responsável poderá solicitar a exclusão por meio dos canais de contato.

## 11. Atualizações desta Política de Privacidade
Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças no aplicativo, em requisitos legais ou em práticas de tratamento de dados.

Recomenda-se que o usuário consulte este documento com frequência; em caso de alterações relevantes, o Fast Cash Flow poderá comunicar por meio do aplicativo ou de outro canal apropriado.

## 12. Encarregado e Contato
Para exercer seus direitos, tirar dúvidas ou obter mais informações sobre o tratamento de dados pessoais, o usuário pode entrar em contato com o responsável pelo tratamento por meio de:

- **Telefone/WhatsApp:** (73) 99934-8552
- **E-mail:** contato@nevesecosta.com.br`,

    nav_items: [
        { label: 'Como funciona', ref: 'features' },
        { label: 'Planos', ref: 'plans' },
        { label: 'Para quem', ref: 'audience' },
    ],
};

// ========== Repository Functions ==========

/**
 * Get the published landing settings for public display
 */
export async function getPublishedLandingSettings(): Promise<LandingSettings> {
    try {
        const { data, error } = await supabase
            .from('landing_settings')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.warn('[landing_settings] Error fetching published settings:', error);
            return createFallbackSettings();
        }

        if (!data) {
            console.log('[landing_settings] No published settings found, using defaults');
            return createFallbackSettings();
        }

        return data as LandingSettings;
    } catch (error) {
        console.error('[landing_settings] Exception fetching settings:', error);
        return createFallbackSettings();
    }
}

/**
 * Get all landing settings (for admin)
 */
export async function getAllLandingSettings(): Promise<LandingSettings[]> {
    const { data, error } = await supabase
        .from('landing_settings')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('[landing_settings] Error fetching all settings:', error);
        return [];
    }

    return (data || []) as LandingSettings[];
}

/**
 * Get latest settings (draft or published) for admin editing
 */
export async function getLatestLandingSettings(): Promise<LandingSettings | null> {
    console.log('[landing_settings] getLatestLandingSettings: Starting...');
    const { data, error } = await supabase
        .from('landing_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[landing_settings] getLatestLandingSettings ERROR:', error);
        return null;
    }

    console.log('[landing_settings] getLatestLandingSettings: Found', data ? 'settings with id ' + data.id : 'no settings');
    return data as LandingSettings | null;
}

/**
 * Create new landing settings (admin only)
 */
export async function createLandingSettings(
    input: Partial<Omit<LandingSettings, 'id' | 'created_at' | 'updated_at'>>
): Promise<LandingSettings> {
    const { data, error } = await supabase
        .from('landing_settings')
        .insert({
            ...DEFAULT_LANDING_SETTINGS,
            ...input,
            status: 'draft',
        })
        .select('*')
        .single();

    if (error) throw error;
    return data as LandingSettings;
}

/**
 * Update landing settings (admin only)
 */
export async function updateLandingSettings(
    id: string,
    updates: Partial<Omit<LandingSettings, 'id' | 'created_at'>>
): Promise<LandingSettings> {
    console.log('[landing_settings] updateLandingSettings: Starting with id:', id);
    console.log('[landing_settings] updateLandingSettings: Updates:', JSON.stringify(updates, null, 2).substring(0, 500) + '...');

    const { data, error } = await supabase
        .from('landing_settings')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
        console.error('[landing_settings] updateLandingSettings ERROR:', error);
        throw error;
    }

    console.log('[landing_settings] updateLandingSettings: Success! Updated id:', data?.id);
    return data as LandingSettings;
}

/**
 * Publish landing settings (admin only)
 * Sets status to 'published' and updates published_at timestamp
 */
export async function publishLandingSettings(id: string): Promise<LandingSettings> {
    console.log('[landing_settings] publishLandingSettings: Starting with id:', id);

    // First, set all other settings to draft
    const { error: draftError } = await supabase
        .from('landing_settings')
        .update({ status: 'draft' })
        .neq('id', id);

    if (draftError) {
        console.error('[landing_settings] publishLandingSettings: Error setting others to draft:', draftError);
    }

    // Then publish this one
    const { data, error } = await supabase
        .from('landing_settings')
        .update({
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
        console.error('[landing_settings] publishLandingSettings ERROR:', error);
        throw error;
    }

    console.log('[landing_settings] publishLandingSettings: Success! Published id:', data?.id);
    return data as LandingSettings;
}

/**
 * Delete landing settings (admin only)
 */
export async function deleteLandingSettings(id: string): Promise<void> {
    const { error } = await supabase
        .from('landing_settings')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

/**
 * Get or create landing settings (ensures at least one exists)
 */
export async function getOrCreateLandingSettings(): Promise<LandingSettings> {
    console.log('[landing_settings] getOrCreateLandingSettings: Starting...');
    const latest = await getLatestLandingSettings();

    if (latest) {
        console.log('[landing_settings] getOrCreateLandingSettings: Found existing settings');
        return latest;
    }

    // Create new settings with defaults
    console.log('[landing_settings] getOrCreateLandingSettings: No settings found, creating new...');
    try {
        const created = await createLandingSettings({});
        console.log('[landing_settings] getOrCreateLandingSettings: Created new settings with id:', created.id);
        return created;
    } catch (error) {
        console.error('[landing_settings] getOrCreateLandingSettings: Error creating settings:', error);
        return createFallbackSettings();
    }
}

// ========== Helper Functions ==========

function createFallbackSettings(): LandingSettings {
    const now = new Date().toISOString();
    return {
        id: 'fallback',
        ...DEFAULT_LANDING_SETTINGS,
        published_at: now,
        updated_at: now,
        created_at: now,
    };
}

/**
 * Format the last updated date for display
 */
export function formatLastUpdated(date: string | null): string {
    if (!date) return 'Nunca publicado';

    const d = new Date(date);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}
