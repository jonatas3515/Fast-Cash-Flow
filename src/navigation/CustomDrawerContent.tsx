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
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useLogoUri } from '../utils/logo';
import { capitalizeCompanyName } from '../utils/string';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';

interface DrawerItemProps {
  label: string;
  icon: string;
  onPress: () => void;
  isActive: boolean;
  theme: any;
}

const DrawerItem: React.FC<DrawerItemProps> = ({ label, icon, onPress, isActive, theme }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.drawerItem,
        {
          backgroundColor: isActive ? theme.drawerActiveBackground : 'transparent',
          borderLeftWidth: isActive ? 4 : 0,
          borderLeftColor: isActive ? theme.drawerActiveBorder : 'transparent',
        },
      ]}
      activeOpacity={0.7}
    >
      <Text style={[styles.drawerIcon, { color: theme.text }]}>{icon}</Text>
      <Text
        style={[
          styles.drawerLabel,
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

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { theme, mode, setMode } = useThemeCtx();
  const resolvedLogo = useLogoUri();
  const defaultLogoUrl = 'https://i.im.ge/2025/11/03/nH0whJ.Logo-Black.png';
  const [logoError, setLogoError] = React.useState(false);
  const [logoLoading, setLogoLoading] = React.useState(true);
  
  // Validar URL e determinar qual logo usar
  const logoToDisplay = React.useMemo(() => {
    if (logoError || !resolvedLogo) return defaultLogoUrl;
    
    // Verificar se é uma URL válida
    const isValidUrl = resolvedLogo.startsWith('http') || resolvedLogo.startsWith('file');
    return isValidUrl ? resolvedLogo : defaultLogoUrl;
  }, [resolvedLogo, logoError]);
  
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 1024;

  const currentRoute = props.state.routes[props.state.index].name;

  // Função para tratar erro de carregamento da logo
  const handleLogoError = () => {
    console.log('Erro ao carregar logo, usando fallback');
    setLogoError(true);
    setLogoLoading(false);
  };

  const handleLogoLoad = () => {
    setLogoLoading(false);
  };

  const logout = async () => {
    try {
      if (Platform.OS === 'web') {
        try {
          window.sessionStorage.removeItem('auth_ok');
          window.sessionStorage.removeItem('auth_role');
          window.sessionStorage.removeItem('auth_name');
        } catch {}
      } else {
        await SecureStore.deleteItemAsync('auth_ok');
        await SecureStore.deleteItemAsync('auth_role');
      }
      await supabase.auth.signOut();
    } finally {
      if (Platform.OS === 'web') {
        try {
          window.location.reload();
        } catch {}
      }
    }
  };

  // Obter nome da empresa/usuário
  const [companyName, setCompanyName] = React.useState('FastSavory\'s');
  const [userEmail, setUserEmail] = React.useState('');
  const [isAdmin, setIsAdmin] = React.useState(false);
  
  React.useEffect(() => {
    try {
      // Obter email do usuário logado
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      });
      
      if (Platform.OS === 'web') {
        const name = window.sessionStorage.getItem('auth_name') || 'FastSavory\'s';
        const role = window.sessionStorage.getItem('auth_role') || '';
        // Capitalizar corretamente o nome usando a função utilitária
        const capitalizedName = capitalizeCompanyName(name);
        setCompanyName(capitalizedName);
        setIsAdmin(role.toLowerCase() === 'admin');
      }
    } catch {}
  }, []);

  // Menu items - filtra Encomendas para admin
  const allMenuItems: Array<{ name: string; label: string; icon: string; hideForAdmin?: boolean }> = [
    { name: 'Dashboard', label: 'Dashboard', icon: '🏠' },
    { name: 'Lançamentos', label: 'Lançamentos', icon: '💸' },
    { name: 'Relatórios', label: 'Relatórios', icon: '📊' },
    { name: 'Débitos', label: 'Débitos', icon: '💳' },
    { name: 'Histórico de Metas', label: 'Histórico de Metas', icon: '🎯' },
    { name: 'Encomendas', label: 'Encomendas', icon: '📦', hideForAdmin: true },
    { name: 'Recorrentes', label: 'Recorrentes', icon: '🔁' },
    { name: 'Instruções', label: 'Instruções', icon: '📋' },
    { name: 'Configuração', label: 'Configurações', icon: '⚙️' },
  ];

  const menuItems = allMenuItems.filter(item => !item.hideForAdmin || !isAdmin);

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
              width: 128, 
              height: 128, 
              objectFit: 'contain',
              marginBottom: 4,
              display: logoLoading ? 'none' : 'block',
            }} 
            alt="Logo"
            onLoad={handleLogoLoad}
            onError={handleLogoError}
          />
        ) : (
          <Image
            source={{ uri: logoToDisplay }}
            style={[
              styles.logo, 
              { 
                width: Platform.OS === 'android' ? 112 : 128,
                height: Platform.OS === 'android' ? 112 : 128,
                marginBottom: 4,
                display: logoLoading ? 'none' : 'flex' 
              }
            ]}
            resizeMode="contain"
            onLoad={handleLogoLoad}
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
        {menuItems.map((item) => (
          <DrawerItem
            key={item.name}
            label={item.label}
            icon={item.icon}
            isActive={currentRoute === item.name}
            theme={theme}
            onPress={() => {
              props.navigation.navigate(item.name);
              // Fechar drawer em mobile após navegação
              if (!isWideWeb) {
                props.navigation.closeDrawer();
              }
            }}
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
    paddingTop: 30,
    paddingBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomRightRadius: 38,
  },
  logo: {
    width: Platform.OS === 'web' ? 48 : 52,
    height: Platform.OS === 'web' ? 48 : 52,
    marginBottom: 8,
  },
  logoPlaceholder: {
    width: 52,
    height: 52,
    marginBottom: 10,
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
