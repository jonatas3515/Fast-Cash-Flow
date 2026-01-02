import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useLogoUri, getDefaultLogoUrl } from '../utils/logo';
import { capitalizeCompanyName } from '../utils/string';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';

// Habilitar LayoutAnimation no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MenuItem {
  name: string;
  label: string;
  icon: string;
  hideForAdmin?: boolean;
  showOnlyAdmin?: boolean;
}

interface MenuSection {
  key: string;
  label: string;
  icon: string;
  items: MenuItem[];
}

interface DrawerItemProps {
  label: string;
  icon: string;
  onPress: () => void;
  isActive: boolean;
  theme: any;
  isSubItem?: boolean;
}

interface DrawerSectionProps {
  section: MenuSection;
  isExpanded: boolean;
  onToggle: () => void;
  currentRoute: string;
  theme: any;
  onNavigate: (name: string) => void;
  isAdmin: boolean;
}

const DrawerItem: React.FC<DrawerItemProps> = ({ label, icon, onPress, isActive, theme, isSubItem = false }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.drawerItem,
        isSubItem && styles.subItem,
        {
          backgroundColor: isActive ? theme.drawerActiveBackground : 'transparent',
          borderLeftWidth: isActive ? 4 : 0,
          borderLeftColor: isActive ? theme.drawerActiveBorder : 'transparent',
        },
      ]}
      activeOpacity={0.7}
    >
      <Text style={[styles.drawerIcon, isSubItem && styles.subItemIcon, { color: theme.text }]}>{icon}</Text>
      <Text
        style={[
          styles.drawerLabel,
          isSubItem && styles.subItemLabel,
          {
            color: theme.text,
            fontWeight: isActive ? '700' : '500',
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const DrawerSection: React.FC<DrawerSectionProps> = ({
  section,
  isExpanded,
  onToggle,
  currentRoute,
  theme,
  onNavigate,
  isAdmin
}) => {
  // Filtrar itens baseado em isAdmin
  const visibleItems = section.items.filter(item => {
    if (item.hideForAdmin && isAdmin) return false;
    if (item.showOnlyAdmin && !isAdmin) return false;
    return true;
  });

  // Verificar se algum item da seção está ativo
  const hasActiveItem = visibleItems.some(item => item.name === currentRoute);

  return (
    <View style={styles.sectionContainer}>
      {/* Cabeçalho da seção (colapsável) */}
      <TouchableOpacity
        onPress={onToggle}
        style={[
          styles.sectionHeader,
          {
            backgroundColor: hasActiveItem ? `${theme.drawerActiveBackground}50` : 'transparent',
          },
        ]}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionIcon, { color: theme.text }]}>{section.icon}</Text>
        <Text style={[styles.sectionLabel, { color: theme.text, fontWeight: hasActiveItem ? '700' : '600' }]}>
          {section.label}
        </Text>
        <Text style={[styles.expandIcon, { color: theme.textSecondary }]}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Itens da seção (visíveis quando expandido) */}
      {isExpanded && (
        <View style={styles.sectionItems}>
          {visibleItems.map((item) => (
            <DrawerItem
              key={item.name}
              label={item.label}
              icon={item.icon}
              isActive={currentRoute === item.name}
              theme={theme}
              isSubItem={true}
              onPress={() => onNavigate(item.name)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { theme, mode, setMode } = useThemeCtx();
  const isDark = mode === 'dark';
  const { uri: resolvedLogo, isLoading: logoLoading } = useLogoUri();
  const defaultLogoUrl = getDefaultLogoUrl(isDark); // Logo oficial baseada no tema
  const [logoError, setLogoError] = React.useState(false);

  // Validar URL e determinar qual logo usar
  const logoToDisplay = React.useMemo(() => {
    if (logoError || !resolvedLogo) return defaultLogoUrl;

    // Verificar se é uma URL válida (http, https, file ou data:)
    const isValidUrl = resolvedLogo.startsWith('http') || resolvedLogo.startsWith('file') || resolvedLogo.startsWith('data:');
    return isValidUrl ? resolvedLogo : defaultLogoUrl;
  }, [resolvedLogo, logoError, defaultLogoUrl]);

  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 1024;

  const currentRoute = props.state.routes[props.state.index].name;

  // Função para tratar erro de carregamento da logo
  const handleLogoError = () => {
    console.log('Erro ao carregar logo, usando fallback');
    setLogoError(true);
  };

  const logout = async () => {
    console.log('[🚪 LOGOUT] Iniciando logout...');
    try {
      // Limpar storage COMPLETAMENTE primeiro
      if (Platform.OS === 'web') {
        try {
          // Limpar TODOS os storages
          window.localStorage.clear(); // Session storage
          window.localStorage.clear(); // Local storage

          // Limpar cookies se existirem
          document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
          });

          // Limpar IndexedDB se possível
          if (window.indexedDB) {
            const databases = await indexedDB.databases();
            databases.forEach(db => {
              if (db.name) {
                indexedDB.deleteDatabase(db.name);
              }
            });
          }

          console.log('[✅ LOGOUT] Storage web limpo completamente');
        } catch (e) {
          console.warn('[⚠️ LOGOUT] Erro ao limpar storage web:', e);
        }
      } else {
        await SecureStore.deleteItemAsync('auth_ok');
        await SecureStore.deleteItemAsync('auth_role');
        await SecureStore.deleteItemAsync('auth_company_id');
      }

      // Fazer signOut do Supabase
      await supabase.auth.signOut();
      console.log('[✅ LOGOUT] SignOut concluído');

      // Forçar reload COMPLETO IMEDIATAMENTE na web
      if (Platform.OS === 'web') {
        console.log('[🔄 LOGOUT] Recarregando página completamente...');
        // Usar uma abordagem mais agressiva para garantir reload completo
        window.location.replace(window.location.origin);
      }
    } catch (error) {
      console.error('[❌ LOGOUT] Erro:', error);
      // Mesmo com erro, forçar reload na web
      if (Platform.OS === 'web') {
        window.location.replace(window.location.origin);
      }
    }
  };

  // Obter nome da empresa/usuário
  const [companyName, setCompanyName] = React.useState('FastSavory\'s');
  const [userEmail, setUserEmail] = React.useState('');
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        // Obter nome da empresa
        let name = '';
        let companyId = '';

        if (Platform.OS === 'web') {
          name = window.localStorage.getItem('auth_name') || 'FastSavory\'s';
          companyId = window.localStorage.getItem('auth_company_id') || '';
          const role = window.localStorage.getItem('auth_role') || '';
          setIsAdmin(role.toLowerCase() === 'admin');
        }

        // Capitalizar corretamente o nome usando a função utilitária
        const capitalizedName = capitalizeCompanyName(name);
        setCompanyName(capitalizedName);

        // Buscar email da empresa do Supabase
        if (companyId) {
          const { data, error } = await supabase
            .from('companies')
            .select('email')
            .eq('id', companyId)
            .single();

          if (!error && data?.email) {
            setUserEmail(data.email);
            return;
          }
        }

        // Fallback: buscar email do usuário logado no Supabase Auth
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.email) {
          setUserEmail(authData.user.email);
        }
      } catch (error) {
        console.error('Erro ao carregar informações da empresa:', error);
      }
    };

    loadCompanyInfo();
  }, []);

  // Estado para controlar qual seção está expandida
  const [expandedSection, setExpandedSection] = React.useState<string | null>(null);

  // Estrutura do menu organizada em seções colapsáveis
  const menuSections: MenuSection[] = [
    {
      key: 'financeiro',
      label: 'Financeiro',
      icon: '💰',
      items: [
        { name: 'Lançamentos', label: 'Lançamentos', icon: '💸' },
        { name: 'Recorrentes', label: 'Despesas Recorrentes', icon: '🔁' },
        { name: 'Relatórios', label: 'Relatórios', icon: '📊' },
        { name: 'DRE', label: 'DRE Gerencial', icon: '📋' },
        { name: 'Categorias Report', label: 'Por Categoria', icon: '🏷️' },
        { name: 'Gráficos', label: 'Gráficos', icon: '📈' },
        { name: 'A Receber', label: 'A Receber', icon: '📥' },
        { name: 'A Pagar', label: 'A Pagar', icon: '📤' },
        { name: 'Contas', label: 'Visão Geral', icon: '💳' },
        { name: 'Histórico de Metas', label: 'Metas', icon: '🎯' },
      ],
    },
    {
      key: 'operacional',
      label: 'Operacional',
      icon: '📦',
      items: [
        { name: 'Encomendas', label: 'Encomendas', icon: '📋', hideForAdmin: true },
        { name: 'CupomFiscal', label: 'Cupom Fiscal', icon: '🧾', hideForAdmin: true },
        { name: 'Importar', label: 'Importar Extrato', icon: '📄' },
      ],
    },
    {
      key: 'clientes_produtos',
      label: 'Clientes & Produtos',
      icon: '👥',
      items: [
        { name: 'Clientes', label: 'Lista de Clientes', icon: '👤' },
        { name: 'CadastroCliente', label: 'Novo Cliente', icon: '➕' },
        { name: 'Produtos', label: 'Lista de Produtos', icon: '📦' },
        { name: 'CadastroProduto', label: 'Novo Produto', icon: '➕' },
        { name: 'Categorias', label: 'Categorias', icon: '🏷️' },
        { name: 'Precificação', label: 'Precificação', icon: '💵' },
      ],
    },
    {
      key: 'configuracoes',
      label: 'Configurações',
      icon: '⚙️',
      items: [
        { name: 'Configuração', label: 'Configurações Gerais', icon: '⚙️' },
        { name: 'PerfilNegocio', label: 'Perfil do Negócio', icon: '📊' },
        { name: 'Notificações', label: 'Notificações', icon: '🔔' },
        { name: 'Automação', label: 'Automação (WhatsApp)', icon: '🤖' },
        { name: 'PersonalizarDashboard', label: 'Personalizar', icon: '🎨' },
        { name: 'Integrações', label: 'Integrações', icon: '🔗' },
        { name: 'Ajuda', label: 'Ajuda', icon: '❓' },
        { name: 'Instruções', label: 'Instruções', icon: '📋' },
        { name: 'Equipe', label: 'Equipe', icon: '👥' },
        { name: 'Backup', label: 'Backup', icon: '💾' },
      ],
    },
  ];

  // Itens que ficam sempre visíveis (não colapsáveis)
  const topMenuItems: MenuItem[] = [
    { name: 'Dashboard', label: 'Dashboard', icon: '📊' },
    { name: 'Ranking', label: 'Ranking', icon: '🏆' },
  ];

  // Função para alternar seção expandida
  const toggleSection = (sectionKey: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(prev => prev === sectionKey ? null : sectionKey);
  };

  // Função para navegar
  const handleNavigate = (routeName: string) => {
    props.navigation.navigate(routeName);
    // Fechar drawer em mobile após navegação
    if (!isWideWeb) {
      props.navigation.closeDrawer();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.drawerBackground }]}>
      {/* Cabeçalho do Drawer */}
      <View style={[styles.header, { backgroundColor: theme.drawerHeaderBackground }]}>
        {logoLoading && (
          <View style={[styles.logoPlaceholder, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <Text style={[styles.logoText, { color: theme.drawerHeaderText }]}>
              FAST{'\n'}CASH{'\n'}FLOW
            </Text>
          </View>
        )}

        {Platform.OS === 'web' ? (
          // @ts-ignore - img tag para Web
          <img
            src={logoToDisplay}
            style={{
              width: 64,
              height: 64,
              objectFit: 'contain',
              marginBottom: 4,
              display: logoLoading ? 'none' : 'block',
            }}
            alt="Logo"
            onError={handleLogoError}
          />
        ) : (
          <Image
            source={{ uri: logoToDisplay }}
            style={[
              styles.logo,
              {
                width: 64,
                height: 64,
                marginBottom: 4,
                display: logoLoading ? 'none' : 'flex'
              }
            ]}
            resizeMode="contain"
            onError={handleLogoError}
          />
        )}

        <Text style={[styles.companyName, { color: theme.drawerHeaderText, marginBottom: 1 }]}>
          {companyName}
        </Text>
        <Text style={[styles.userEmail, { color: theme.drawerHeaderTextSecondary }]}>
          {userEmail}
        </Text>
      </View>

      {/* Items de Navegação */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={true}>
        {/* Itens principais (sempre visíveis) */}
        {topMenuItems.map((item) => (
          <DrawerItem
            key={item.name}
            label={item.label}
            icon={item.icon}
            isActive={currentRoute === item.name}
            theme={theme}
            onPress={() => handleNavigate(item.name)}
          />
        ))}

        {/* Separador */}
        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        {/* Seções colapsáveis */}
        {menuSections.map((section) => (
          <DrawerSection
            key={section.key}
            section={section}
            isExpanded={expandedSection === section.key}
            onToggle={() => toggleSection(section.key)}
            currentRoute={currentRoute}
            theme={theme}
            onNavigate={handleNavigate}
            isAdmin={isAdmin}
          />
        ))}
      </ScrollView>

      {/* Rodapé com Tema e Sair */}
      <View style={[styles.footerActions, { borderTopColor: theme.border }]}>
        {/* Alternar Tema - Apenas no Mobile */}
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}
            style={[styles.drawerItem, { backgroundColor: 'transparent', marginHorizontal: 0 }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.drawerIcon, { color: theme.text }]}>
              {mode === 'dark' ? '☀️' : '🌙'}
            </Text>
            <Text style={[styles.drawerLabel, { color: theme.text }]}>
              {mode === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Sair - Discreto */}
        <TouchableOpacity
          onPress={logout}
          style={[styles.drawerItem, styles.logoutItem, { borderWidth: 0 }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.logoutIcon, { color: theme.textSecondary }]}>🚪</Text>
          <Text style={[styles.logoutLabel, { color: mode === 'dark' ? '#FFFFFF' : '#EF4444' }]}>
            Sair
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rodapé */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          v1.0.0 | Suporte
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomRightRadius: 38,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 4,
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    marginBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 12,
    textAlign: 'center',
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 11,
    fontWeight: '400',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginVertical: 1,
    borderRadius: 10,
    minHeight: 40,
  },
  drawerIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 22,
    textAlign: 'center',
  },
  drawerLabel: {
    fontSize: 13,
    flex: 1,
  },
  // Estilos para subitens (dentro de seções colapsáveis)
  subItem: {
    paddingLeft: 32,
    paddingVertical: 8,
    minHeight: 36,
    marginVertical: 0,
  },
  subItemIcon: {
    fontSize: 14,
    width: 20,
    marginRight: 8,
  },
  subItemLabel: {
    fontSize: 12,
  },
  // Estilos para seções colapsáveis
  sectionContainer: {
    marginVertical: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderRadius: 10,
    minHeight: 44,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 10,
    width: 24,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 14,
    flex: 1,
  },
  expandIcon: {
    fontSize: 10,
    marginLeft: 8,
  },
  sectionItems: {
    marginLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(128, 128, 128, 0.2)',
    marginVertical: 4,
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  footerActions: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  logoutItem: {
    marginTop: 4,
    minHeight: 4,
    paddingVertical: 8,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  logoutLabel: {
    fontSize: 16,
    flex: 1,
    fontWeight: '500',
  },
  footer: {
    paddingVertical: 2,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
