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

export default function CustomAdminDrawerContent(props: DrawerContentComponentProps) {
  const { theme, mode, setMode } = useThemeCtx();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 1024;
  const defaultLogoUrl = 'https://i.im.ge/2025/11/03/nH0whJ.Logo-Black.png';

  const currentRoute = props.state.routes[props.state.index].name;

  const logout = async () => {
    try {
      if (Platform.OS === 'web') {
        try {
          window.sessionStorage.removeItem('auth_ok');
          window.sessionStorage.removeItem('auth_role');
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

  const [userEmail, setUserEmail] = React.useState('admin@email.com');
  
  React.useEffect(() => {
    try {
      // Obter email do usuário logado
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      });
    } catch {}
  }, []);

  const menuItems = [
    { name: 'Empresas', label: 'Empresas', icon: '🏢' },
    { name: 'Solicitações', label: 'Solicitações', icon: '📥' },
    { name: 'Débitos', label: 'Débitos', icon: '💳' },
    { name: 'Relatórios', label: 'Relatórios', icon: '📊' },
    { name: 'Configuração', label: 'Configurações', icon: '⚙️' },
  ];

  // Logo do admin
  const webLogoUrl = mode === 'dark'
    ? 'https://i.im.ge/2025/11/02/nzgjAc.Logo-White.png'
    : 'https://i.im.ge/2025/11/03/nH0whJ.Logo-Black.png';
  const logoSource = mode === 'dark' ? require('../../Logo White.png') : require('../../Logo Black.png');

  return (
    <View style={[styles.container, { backgroundColor: theme.drawerBackground }]}>
      {/* Cabeçalho do Drawer */}
      <View style={[styles.header, { backgroundColor: theme.drawerHeaderBackground }]}>
        {Platform.OS === 'web' ? (
          // @ts-ignore - img tag para Web
          <img 
            src={webLogoUrl} 
            style={{ 
              width: 48, 
              height: 48, 
              objectFit: 'contain',
              marginBottom: 8,
            }} 
            alt="Logo Admin"
          />
        ) : (
          <Image
            source={logoSource}
            style={styles.logo}
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

      {/* Items de Navegação */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
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
    paddingTop: 30,
    paddingBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  logo: {
    width: Platform.OS === 'web' ? 48 : 52,
    height: Platform.OS === 'web' ? 48 : 52,
    marginBottom: 8,
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
