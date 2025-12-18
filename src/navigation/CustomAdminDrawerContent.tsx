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
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useThemeCtx } from '../theme/ThemeProvider';
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

// Componente de seção colapsável
const CollapsibleSection: React.FC<{
  section: MenuSection;
  isExpanded: boolean;
  onToggle: () => void;
  currentRoute: string;
  theme: any;
  onNavigate: (name: string) => void;
}> = ({ section, isExpanded, onToggle, currentRoute, theme, onNavigate }) => {
  const hasActiveItem = section.items.some(item => item.name === currentRoute);

  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity
        onPress={onToggle}
        style={[
          styles.sectionHeader,
          hasActiveItem && { backgroundColor: theme.drawerActiveBackground + '40' },
        ]}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionIcon, { color: theme.text }]}>{section.icon}</Text>
        <Text style={[styles.sectionLabel, { color: theme.text, fontWeight: hasActiveItem ? '700' : '600' }]}>
          {section.label}
        </Text>
        <Text style={[styles.expandIcon, { color: theme.textSecondary }]}>
          {isExpanded ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.sectionItems}>
          {section.items.map(item => (
            <DrawerItem
              key={item.name}
              label={item.label}
              icon={item.icon}
              isActive={currentRoute === item.name}
              theme={theme}
              isSubItem
              onPress={() => onNavigate(item.name)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default function CustomAdminDrawerContent(props: DrawerContentComponentProps) {
  const { theme, mode, setMode } = useThemeCtx();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 1024;
  const defaultLogoUrl = 'https://i.im.ge/2025/11/03/nH0whJ.Logo-Black.png';

  const currentRoute = props.state.routes[props.state.index].name;

  const logout = async () => {
    console.log('[🚪 LOGOUT] Iniciando logout admin...');
    try {
      // Limpar storage COMPLETAMENTE primeiro
      if (Platform.OS === 'web') {
        try {
          // Limpar TODOS os storages
          window.sessionStorage.clear(); // Session storage
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

  const [userEmail, setUserEmail] = React.useState('admin@email.com');

  React.useEffect(() => {
    try {
      // Obter email do usuário logado
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      });
    } catch { }
  }, []);

  // Estado para seções expandidas
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set(['visao_geral']));

  const toggleSection = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Menu organizado em seções (baseado em boas práticas SaaS)
  const menuSections: MenuSection[] = [
    {
      key: 'visao_geral',
      label: 'Visão Geral',
      icon: '🏠',
      items: [
        { name: 'Dashboard', label: 'Dashboard', icon: '📊' },
        { name: 'Relatórios', label: 'Relatórios', icon: '📈' },
      ],
    },
    {
      key: 'clientes',
      label: 'Clientes & Empresas',
      icon: '🏢',
      items: [
        { name: 'Empresas', label: 'Empresas', icon: '🏢' },
        { name: 'Solicitações', label: 'Solicitações', icon: '📥' },
        { name: 'Engajamento', label: 'Saúde & Engajamento', icon: '🏥' },
        { name: 'Inadimplência', label: 'Inadimplência', icon: '🔴' },
      ],
    },
    {
      key: 'produto_uso',
      label: 'Produto & Uso',
      icon: '📈',
      items: [
        { name: 'Analytics', label: 'Analytics', icon: '📈' },
        { name: 'Conversão', label: 'Funil de Conversão', icon: '🎯' },
      ],
    },
    {
      key: 'comunicacao',
      label: 'Comunicação & Suporte',
      icon: '💬',
      items: [
        { name: 'Comunicados', label: 'Broadcast', icon: '📢' },
        { name: 'Suporte', label: 'Suporte', icon: '💬' },
      ],
    },
    {
      key: 'financeiro',
      label: 'Financeiro',
      icon: '💰',
      items: [
        { name: 'Finanças', label: 'Finanças', icon: '💰' },
        { name: 'Débitos', label: 'Débitos', icon: '💳' },
        { name: 'Cupons', label: 'Cupons', icon: '🎟️' },
      ],
    },
    {
      key: 'infra',
      label: 'Infra & Dados',
      icon: '☁️',
      items: [
        { name: 'Backup Central', label: 'Backup Central', icon: '☁️' },
        { name: 'Auditoria', label: 'Auditoria', icon: '📜' },
      ],
    },
    {
      key: 'config',
      label: 'Configurações',
      icon: '⚙️',
      items: [
        { name: 'Configuração', label: 'Configurações', icon: '⚙️' },
        { name: 'LandingSettings', label: 'Landing Page', icon: '🌐' },
        { name: 'Instruções', label: 'Instruções', icon: '📖' },
      ],
    },
  ];

  // Navegação
  const handleNavigate = (name: string) => {
    props.navigation.navigate(name);
    if (!isWideWeb) {
      props.navigation.closeDrawer();
    }
  };

  // Logo do admin
  const webLogoUrl = mode === 'dark'
    ? 'https://i.im.ge/2025/11/02/nzgjAc.Logo-White.png'
    : 'https://i.im.ge/2025/11/03/nH0whJ.Logo-Black.png';
  const logoSource = mode === 'dark' ? require('../../assets/landing/Logo White.png') : require('../../assets/landing/Logo Black.png');

  return (
    <View style={[styles.container, { backgroundColor: theme.drawerBackground }]}>
      {/* Cabeçalho do Drawer */}
      <View style={[styles.header, { backgroundColor: theme.drawerHeaderBackground }]}>
        {Platform.OS === 'web' ? (
          // @ts-ignore - img tag para Web
          <img
            src={webLogoUrl}
            style={{
              width: 64,
              height: 64,
              objectFit: 'contain',
              marginBottom: 4,
            }}
            alt="Logo Admin"
          />
        ) : (
          <Image
            source={logoSource}
            style={[styles.logo, { width: 64, height: 64, marginBottom: 4 }]}
            resizeMode="contain"
          />
        )}
        <Text style={[styles.companyName, { color: theme.drawerHeaderText }]}>
          Fast Cash Flow
        </Text>
        <Text style={[styles.adminBadge, { color: theme.drawerHeaderText }]}>
          👑 ADMINISTRADOR
        </Text>
        <Text style={[styles.userEmail, { color: theme.drawerHeaderTextSecondary }]}>
          {userEmail}
        </Text>
      </View>

      {/* Items de Navegação - Seções Colapsáveis */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        {menuSections.map((section) => (
          <CollapsibleSection
            key={section.key}
            section={section}
            isExpanded={expandedSections.has(section.key)}
            onToggle={() => toggleSection(section.key)}
            currentRoute={currentRoute}
            theme={theme}
            onNavigate={handleNavigate}
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
          style={[styles.drawerItem, styles.logoutItem]}
          activeOpacity={0.7}
        >
          <Text style={[styles.logoutIcon, { color: theme.textSecondary }]}>🚪</Text>
          <Text style={[styles.logoutLabel, { color: theme.textSecondary }]}>
            Sair
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rodapé */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          v1.0.0 | Painel Admin
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
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  adminBadge: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 11,
    fontWeight: '400',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 8,
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  menuSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginBottom: 4,
    marginTop: 4,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginVertical: 1,
    borderRadius: 10,
    minHeight: 44,
  },
  drawerIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  drawerLabel: {
    fontSize: 13,
    flex: 1,
  },
  subItem: {
    paddingLeft: 32,
    paddingVertical: 10,
    minHeight: 40,
  },
  subItemIcon: {
    fontSize: 14,
    marginRight: 10,
    width: 20,
  },
  subItemLabel: {
    fontSize: 12,
  },
  sectionContainer: {
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderRadius: 10,
  },
  sectionIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 22,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    flex: 1,
  },
  expandIcon: {
    fontSize: 10,
    marginLeft: 8,
  },
  sectionItems: {
    marginLeft: 8,
  },
  footerActions: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
  },
  logoutItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 4,
    minHeight: 44,
    paddingVertical: 10,
  },
  logoutIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  logoutLabel: {
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
