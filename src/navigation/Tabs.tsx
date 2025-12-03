import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import DayScreen from '../screens/DayScreen';
import RangeScreen from '../screens/RangeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import DebtsScreen from '../screens/DebtsScreen';
import OrdersScreen from '../screens/OrdersScreen';
import DashboardScreen from '../screens/DashboardScreen';
import RecurringExpensesScreen from '../screens/RecurringExpensesScreen';
import InstructionsScreen from '../screens/InstructionsScreen';
import GoalsHistoryScreen from '../screens/GoalsHistoryScreen';
import CustomDrawerContent from './CustomDrawerContent';
import { colors } from '../theme';
import { View, Text, Image, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useSettings } from '../settings/SettingsProvider';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useLogoUri } from '../utils/logo';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';

const Drawer = createDrawerNavigator();

// Componente de Header customizado para cada tela
function CustomHeader({ title }: { title: string }) {
  const { theme, mode, setMode } = useThemeCtx();
  const resolvedLogo = useLogoUri();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 1024;
  const navigation = useNavigation<DrawerNavigationProp<any>>();

  let owner: string | null = null;
  try {
    if (Platform.OS === 'web') {
      const name = (window.sessionStorage.getItem('auth_name') || '').toLowerCase();
      if (name === 'fastsavorys') owner = 'Jéssica';
    }
  } catch {}

  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: theme.card,
    }}>
      {/* Botão de menu (hambúrguer) - apenas em mobile ou quando drawer não está fixo */}
      {!isWideWeb && (
        <TouchableOpacity 
          onPress={() => navigation.toggleDrawer()}
          style={{ paddingRight: 12 }}
        >
          <Text style={{ fontSize: 24, color: theme.text }}>☰</Text>
        </TouchableOpacity>
      )}
      
      {/* Espaço para mensagem de boas-vindas ou título */}
      <View style={{ flex: 1, alignItems: 'center' }}>
        {owner && (
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 17 }}>
            Bem-vindo(a), {owner}
          </Text>
        )}
      </View>

      {/* Botão de tema - agora em TODAS as plataformas */}
      <TouchableOpacity 
        onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}
        style={{
          padding: 10,
          backgroundColor: theme.card,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          marginLeft: 8
        }}
      >
        <Text style={{ fontSize: 20 }}>
          {mode === 'dark' ? '☀️' : '🌙'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function Tabs() {
  const { settings } = useSettings();
  const { theme, mode, setMode } = useThemeCtx();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 1024;
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
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
        component={DashboardScreen}
        options={{
          header: () => <CustomHeader title="Dashboard" />,
        }}
      />
      <Drawer.Screen 
        name="Lançamentos" 
        component={DayScreen}
        options={{
          header: () => <CustomHeader title="Lançamentos" />,
        }}
      />
      <Drawer.Screen 
        name="Relatórios" 
        component={RangeScreen}
        options={{
          header: () => <CustomHeader title="Relatórios" />,
        }}
      />
      <Drawer.Screen 
        name="Débitos" 
        component={DebtsScreen}
        options={{
          header: () => <CustomHeader title="Débitos" />,
        }}
      />
      <Drawer.Screen 
        name="Histórico de Metas" 
        component={GoalsHistoryScreen}
        options={{
          header: () => <CustomHeader title="Histórico de Metas" />,
        }}
      />
      <Drawer.Screen 
        name="Encomendas" 
        component={OrdersScreen}
        options={{
          header: () => <CustomHeader title="Encomendas" />,
        }}
      />
      <Drawer.Screen 
        name="Recorrentes" 
        component={RecurringExpensesScreen}
        options={{
          header: () => <CustomHeader title="Recorrentes" />,
        }}
      />
      <Drawer.Screen 
        name="Instruções" 
        component={InstructionsScreen}
        options={{
          header: () => <CustomHeader title="Instruções" />,
        }}
      />
      <Drawer.Screen 
        name="Configuração" 
        component={SettingsScreen}
        options={{
          header: () => <CustomHeader title="Configurações" />,
        }}
      />
    </Drawer.Navigator>
  );
}
