import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AdminCompaniesScreen from '../screens/admin/AdminCompaniesScreen';
import AdminRequestsScreen from '../screens/admin/AdminRequestsScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminBroadcastScreen from '../screens/admin/AdminBroadcastScreen';
import DebtsScreen from '../screens/DebtsScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import AdminInstructionsScreen from '../screens/admin/AdminInstructionsScreen';
import CustomAdminDrawerContent from './CustomAdminDrawerContent';
import { colors } from '../theme';
import { View, Text, Image, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';
import { quickSync } from '../lib/sync';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { listAllDebts } from '../repositories/debts';
import { getAdminAppCompanyId } from '../lib/company';
import { todayYMD } from '../utils/date';
import { DrawerNavigationProp } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

export default function AdminTabs() {
  const { theme, mode, setMode } = useThemeCtx();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const navigation = useNavigation<any>();
  const [hasAdminOverdueDebts, setHasAdminOverdueDebts] = React.useState(false);
  const [hasSeenAdminOverdueModal, setHasSeenAdminOverdueModal] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const cid = await getAdminAppCompanyId();
        if (!cid) return;
        const debts = await listAllDebts(cid);
        const today = todayYMD();
        let hasOverdue = false;
        for (const debt of debts as any[]) {
          const total = (debt as any).total_cents || 0;
          const paidCount = (debt as any).paid_installments || 0;
          if (!total) continue;
          const baseDate = (debt as any).invoice_due_date || debt.start_date || '';
          const sParts = (baseDate || '').split('-').map((n: string) => parseInt(n, 10) || 0);
          const tParts = (today || '').split('-').map((n: string) => parseInt(n, 10) || 0);
          const monthsStart = sParts[0] * 12 + (sParts[1] - 1);
          const monthsToday = tParts[0] * 12 + (tParts[1] - 1);
          let elapsed = monthsToday - monthsStart;
          if (
            tParts[0] > sParts[0] ||
            (tParts[0] === sParts[0] && tParts[1] > sParts[1]) ||
            (tParts[0] === sParts[0] && tParts[1] === sParts[1] && tParts[2] > sParts[2])
          ) {
            elapsed = Math.max(0, elapsed + (tParts[2] > sParts[2] ? 1 : 0));
          }
          elapsed = Math.max(0, Math.min((debt as any).installment_count || 0, elapsed));
          if (elapsed > paidCount) {
            hasOverdue = true;
            break;
          }
        }
        setHasAdminOverdueDebts(hasOverdue);
      } catch {}
    })();
  }, []);

  const isWideWeb = Platform.OS === 'web' && width >= 1024;

  // Componente de Header customizado para Admin
  const CustomAdminHeader = React.useCallback(({ title }: { title: string }) => {
    const webUrl = mode === 'dark'
      ? 'https://i.im.ge/2025/11/02/nzgjAc.Logo-White.png'
      : 'https://i.im.ge/2025/11/03/nH0whJ.Logo-Black.png';
    const localLogo = mode === 'dark'
      ? require('../../Logo White.png')
      : require('../../Logo Black.png');
    const nav = useNavigation<DrawerNavigationProp<any>>();
    
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: theme.card,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}>
        {/* Botão de menu (hambúrguer) - apenas em mobile */}
        {!isWideWeb && (
          <TouchableOpacity 
            onPress={() => nav.toggleDrawer()}
            style={{ paddingRight: 12 }}
          >
            <Text style={{ fontSize: 24, color: theme.text }}>☰</Text>
          </TouchableOpacity>
        )}
        
        {/* Logo e título */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          {Platform.OS === 'web' ? (
            // @ts-ignore
            <img src={webUrl} style={{ width: 40, height: 40, objectFit: 'contain' }} />
          ) : (
            <Image source={localLogo} style={{ width: 40, height: 40, resizeMode: 'contain' }} />
          )}
          <Text style={{ fontWeight: '800', color: theme.text, lineHeight: 12, fontSize: 10 }}>
            FAST{"\n"}
            CASH{"\n"}
            FLOW
          </Text>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12 }}>
              {title}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 10 }}>
              👑 Admin
            </Text>
          </View>
        </View>

        {/* Botão de tema - apenas em desktop web */}
        {isWideWeb && (
          <TouchableOpacity 
            onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}
            style={{ paddingHorizontal: 12 }}
          >
            <Text style={{ fontSize: 20 }}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [mode, theme, isWideWeb, setMode]);

  return (
    <>
    <Drawer.Navigator
      drawerContent={(props) => <CustomAdminDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        drawerType: isWideWeb ? 'permanent' : 'front',
        drawerStyle: {
          width: isWideWeb ? 240 : width * 0.75,
          backgroundColor: theme.drawerBackground,
        },
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        drawerPosition: 'left',
        swipeEnabled: !isWideWeb,
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen 
        name="Dashboard" 
        component={AdminDashboardScreen}
        options={{
          header: () => <CustomAdminHeader title="Dashboard" />,
        }}
      />
      <Drawer.Screen 
        name="Empresas" 
        component={AdminCompaniesScreen}
        options={{
          header: () => <CustomAdminHeader title="Empresas" />,
        }}
      />
      <Drawer.Screen 
        name="Solicitações" 
        component={AdminRequestsScreen}
        options={{
          header: () => <CustomAdminHeader title="Solicitações" />,
        }}
      />
      <Drawer.Screen 
        name="Débitos" 
        component={DebtsScreen}
        options={{
          header: () => <CustomAdminHeader title="Débitos" />,
        }}
      />
      <Drawer.Screen 
        name="Relatórios" 
        component={AdminReportsScreen}
        options={{
          header: () => <CustomAdminHeader title="Relatórios" />,
        }}
      />
      <Drawer.Screen 
        name="Comunicados" 
        component={AdminBroadcastScreen}
        options={{
          header: () => <CustomAdminHeader title="Comunicados" />,
        }}
      />
      <Drawer.Screen 
        name="Configuração" 
        component={AdminSettingsScreen}
        options={{
          header: () => <CustomAdminHeader title="Configurações" />,
        }}
      />
      <Drawer.Screen 
        name="Instruções" 
        component={AdminInstructionsScreen}
        options={{
          header: () => <CustomAdminHeader title="Instruções" />,
        }}
      />
    </Drawer.Navigator>

    {hasAdminOverdueDebts && !hasSeenAdminOverdueModal && (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: '#f97316',
            gap: 12,
          }}
        >
          <Text style={{ color: '#b45309', fontWeight: '800', fontSize: 16, textAlign: 'center' }}>
            ⚠️ Existem parcelas em atraso
          </Text>
          <Text style={{ color: theme.text, fontSize: 13, textAlign: 'center' }}>
            Confirme os pagamentos das parcelas em atraso na aba Débitos da empresa administradora para manter os relatórios em dia.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setHasSeenAdminOverdueModal(true);
              // @ts-ignore
              navigation.navigate('Débitos');
            }}
            style={{
              marginTop: 4,
              alignSelf: 'center',
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: '#f97316',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Ir para a aba Débitos</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
    </>
  );
}
