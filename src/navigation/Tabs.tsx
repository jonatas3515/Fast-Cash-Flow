import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import DayScreen from '../screens/DayScreen';
import RangeScreen from '../screens/RangeScreen';
import DREScreen from '../screens/DREScreen';
import CategoryReportScreen from '../screens/CategoryReportScreen';
import AccountsOverviewScreen from '../screens/AccountsOverviewScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BusinessProfileScreen from '../screens/BusinessProfileScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import DebtsScreen from '../screens/DebtsScreen';
import OrdersScreen from '../screens/OrdersScreen';
import DashboardScreen from '../screens/DashboardScreen';
import RecurringExpensesScreen from '../screens/RecurringExpensesScreen';
import InstructionsScreen from '../screens/InstructionsScreen';
import GoalsHistoryScreen from '../screens/GoalsHistoryScreen';
import BackupScreen from '../screens/BackupScreen';
import CustomizeDashboardScreen from '../screens/CustomizeDashboardScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import HelpScreen from '../screens/HelpScreen';
import RankingScreen from '../screens/RankingScreen';
import TeamScreen from '../screens/TeamScreen';
import ImportScreen from '../screens/ImportScreen';
import IntegrationsScreen from '../screens/IntegrationsScreen';
import DiagnosticoScreen from '../screens/DiagnosticoScreen';
import FinancialDiagnosticScreen from '../screens/FinancialDiagnosticScreen';
import ForcarSyncScreen from '../screens/ForcarSyncScreen';
import TesteLoginScreen from '../screens/TesteLoginScreen';
import ProductPricingScreen from '../screens/ProductPricingScreen';
import ClientsScreen from '../screens/ClientsScreen';
import ClientFormScreen from '../screens/ClientFormScreen';
import ProductsScreen from '../screens/ProductsScreen';
import ProductFormScreen from '../screens/ProductFormScreen';
import ReceiptScreen from '../screens/ReceiptScreen';
import ChartsScreen from '../screens/ChartsScreen';
import ReceivablesScreen from '../screens/ReceivablesScreen';
import PayablesScreen from '../screens/PayablesScreen';
import AutomationRulesScreen from '../screens/AutomationRulesScreen';
import POSScreen from '../screens/POSScreen';
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
  const [isSyncing, setIsSyncing] = React.useState(false);

  let owner: string | null = null;
  let companyName: string | null = null;
  try {
    if (Platform.OS === 'web') {
      const name = (window.localStorage.getItem('auth_name') || '').toLowerCase();
      if (name === 'fastsavorys') owner = 'Jéssica';
      companyName = window.localStorage.getItem('auth_name') || null;
    }
  } catch { }

  // Simulate sync indicator (would connect to real sync status)
  React.useEffect(() => {
    const interval = setInterval(() => {
      // This would normally check actual sync status
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    }}>
      {/* Botão de menu (hambúrguer) - apenas em mobile ou quando drawer não está fixo */}
      {!isWideWeb && (
        <TouchableOpacity
          onPress={() => navigation.toggleDrawer()}
          style={{
            paddingRight: 12,
            paddingVertical: 4,
          }}
        >
          <Text style={{ fontSize: 22, color: theme.text }}>☰</Text>
        </TouchableOpacity>
      )}

      {/* Espaço para mensagem de boas-vindas ou título */}
      <View style={{ flex: 1, alignItems: isWideWeb ? 'flex-start' : 'center' }}>
        {owner ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 18 }}>👋</Text>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>
              Olá, {owner}
            </Text>
          </View>
        ) : companyName ? (
          <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }} numberOfLines={1}>
            {companyName}
          </Text>
        ) : null}
      </View>

      {/* Sync status indicator */}
      <View style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: isSyncing ? theme.warning : theme.positive,
        marginRight: 12,
      }} />

      {/* Botão de tema - agora em TODAS as plataformas */}
      <TouchableOpacity
        onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}
        style={{
          padding: 8,
          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
        }}
      >
        <Text style={{ fontSize: 18 }}>
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
      id={undefined}
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
        name="DRE"
        component={DREScreen}
        options={{
          header: () => <CustomHeader title="DRE Gerencial" />,
        }}
      />
      <Drawer.Screen
        name="Categorias Report"
        component={CategoryReportScreen}
        options={{
          header: () => <CustomHeader title="Relatório por Categoria" />,
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
        name="Contas"
        component={AccountsOverviewScreen}
        options={{
          header: () => <CustomHeader title="Contas a Pagar/Receber" />,
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
        name="PDV"
        component={POSScreen}
        options={{
          header: () => <CustomHeader title="PDV Visual" />,
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
        name="Precificação"
        component={ProductPricingScreen}
        options={{
          header: () => <CustomHeader title="Precificação" />,
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
      <Drawer.Screen
        name="PerfilNegocio"
        component={BusinessProfileScreen}
        options={{
          header: () => <CustomHeader title="Perfil do Negócio" />,
        }}
      />
      <Drawer.Screen
        name="Notificações"
        component={NotificationSettingsScreen}
        options={{
          header: () => <CustomHeader title="Notificações" />,
        }}
      />
      <Drawer.Screen
        name="Automação"
        component={AutomationRulesScreen}
        options={{
          header: () => <CustomHeader title="Regras de Automação" />,
        }}
      />
      <Drawer.Screen
        name="Backup"
        component={BackupScreen}
        options={{
          header: () => <CustomHeader title="Backup de Dados" />,
        }}
      />
      <Drawer.Screen
        name="PersonalizarDashboard"
        component={CustomizeDashboardScreen}
        options={{
          header: () => <CustomHeader title="Personalizar Dashboard" />,
        }}
      />
      <Drawer.Screen
        name="Categorias"
        component={CategoriesScreen}
        options={{
          header: () => <CustomHeader title="Categorias" />,
        }}
      />
      <Drawer.Screen
        name="Ajuda"
        component={HelpScreen}
        options={{
          header: () => <CustomHeader title="Ajuda" />,
        }}
      />
      <Drawer.Screen
        name="Ranking"
        component={RankingScreen}
        options={{
          header: () => <CustomHeader title="Ranking" />,
        }}
      />
      <Drawer.Screen
        name="Equipe"
        component={TeamScreen}
        options={{
          header: () => <CustomHeader title="Equipe" />,
        }}
      />
      <Drawer.Screen
        name="Importar"
        component={ImportScreen}
        options={{
          header: () => <CustomHeader title="Importar" />,
        }}
      />
      <Drawer.Screen
        name="Integrações"
        component={IntegrationsScreen}
        options={{
          header: () => <CustomHeader title="Integrações" />,
        }}
      />
      <Drawer.Screen
        name="Diagnóstico"
        component={DiagnosticoScreen}
        options={{
          header: () => <CustomHeader title="Diagnóstico Android" />,
        }}
      />
      <Drawer.Screen
        name="Diagnóstico Financeiro"
        component={FinancialDiagnosticScreen}
        options={{
          header: () => <CustomHeader title="Diagnóstico Financeiro" />,
        }}
      />
      <Drawer.Screen
        name="Forçar Sync"
        component={ForcarSyncScreen}
        options={{
          header: () => <CustomHeader title="Forçar Sync FastSavorys" />,
        }}
      />
      <Drawer.Screen
        name="Teste Login"
        component={TesteLoginScreen}
        options={{
          header: () => <CustomHeader title="Teste Login FastSavorys" />,
        }}
      />
      <Drawer.Screen
        name="Clientes"
        component={ClientsScreen}
        options={{
          header: () => <CustomHeader title="Clientes" />,
        }}
      />
      <Drawer.Screen
        name="CadastroCliente"
        component={ClientFormScreen}
        options={{
          header: () => <CustomHeader title="Cadastro de Cliente" />,
        }}
      />
      <Drawer.Screen
        name="Produtos"
        component={ProductsScreen}
        options={{
          header: () => <CustomHeader title="Produtos" />,
        }}
      />
      <Drawer.Screen
        name="CadastroProduto"
        component={ProductFormScreen}
        options={{
          header: () => <CustomHeader title="Cadastro de Produto" />,
        }}
      />
      <Drawer.Screen
        name="CupomFiscal"
        component={ReceiptScreen}
        options={{
          header: () => <CustomHeader title="Cupom Fiscal" />,
        }}
      />
      <Drawer.Screen
        name="Gráficos"
        component={ChartsScreen}
        options={{
          header: () => <CustomHeader title="Análise de Gráficos" />,
        }}
      />
      <Drawer.Screen
        name="A Receber"
        component={ReceivablesScreen}
        options={{
          header: () => <CustomHeader title="Contas a Receber" />,
        }}
      />
      <Drawer.Screen
        name="A Pagar"
        component={PayablesScreen}
        options={{
          header: () => <CustomHeader title="Contas a Pagar" />,
        }}
      />
    </Drawer.Navigator>
  );
}
