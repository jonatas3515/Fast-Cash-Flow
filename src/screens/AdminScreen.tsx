import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Platform, Modal, TextInput, Image } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quickSync } from '../lib/sync';
import { useSettings } from '../settings/SettingsProvider';
import * as ImagePicker from 'expo-image-picker';
import { capitalizeCompanyName } from '../utils/string';
import LandingSettingsScreen from './admin/LandingSettingsScreen';
import { useNavigation } from '@react-navigation/native';

// LEGACY SCREEN: This screen is largely replaced by AdminTabs and specific screens (AdminCompaniesScreen, AdminRequestsScreen, etc.)
// Keeping it for backward compatibility but redirecting actions to official flows.

export default function AdminScreen() {
  const { theme, mode, setMode } = useThemeCtx();
  const qc = useQueryClient();
  const { settings, setLogoUrl } = useSettings();
  const nav = useNavigation<any>();
  const [logo, setLogo] = React.useState(settings.logoUrl || '');
  const [tab, setTab] = React.useState<'empresas' | 'config' | 'debts' | 'landing'>('empresas');
  const [online, setOnline] = React.useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncing, setSyncing] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);

  // Queries
  const companiesQ = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
  });

  React.useEffect(() => {
    const updateOnline = () => setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    try {
      window.addEventListener('online', updateOnline);
      window.addEventListener('offline', updateOnline);
    } catch { }
    const id = setInterval(() => {
      try {
        const raw = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem('sync_outbox') : null;
        if (raw) {
          const arr = JSON.parse(raw);
          setPendingCount(Array.isArray(arr) ? arr.length : 0);
        } else {
          setPendingCount(0);
        }
      } catch { setPendingCount(0); }
    }, 2000);
    return () => { try { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline); } catch { }; clearInterval(id); };
  }, []);

  const requestsQ = useQuery({
    queryKey: ['company_requests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; company_name: string; owner_name: string; phone: string; address: string; cnpj: string; founded_on: string | null; approved: boolean; approved_company_id?: string | null; approved_at?: string | null; trial_until?: string | null }>;
    },
  });

  // DEPRECATED: approveMut removed. Use AdminRequestsScreen.

  const rejectMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('company_requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['company_requests'] }); },
  });

  const [selectCompanyOpen, setSelectCompanyOpen] = React.useState(false);
  const [companyForConfig, setCompanyForConfig] = React.useState<{ id: string | null; name: string } | null>(null);
  const [newCompanyPass, setNewCompanyPass] = React.useState('');

  const mergedCompanies = React.useMemo(() => {
    const list: { id: string | null; name: string }[] = [];
    const db = (companiesQ.data || []);
    db.forEach(c => list.push({ id: c.id, name: c.name }));
    (requestsQ.data || []).filter(r => r.approved).forEach(r => {
      const exists = list.some(x => x.name.toLowerCase() === (r.company_name || '').toLowerCase());
      if (!exists) list.push({ id: r.approved_company_id || null, name: r.company_name });
    });
    if (!list.some(x => x.name.toLowerCase() === 'fastsavorys')) list.push({ id: null, name: 'fastsavorys' });
    return list;
  }, [companiesQ.data, requestsQ.data]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, padding: 16, gap: 12 }}>
      {/* Banner de Aviso de Legado */}
      <View style={{ backgroundColor: '#fff3cd', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ffeeba' }}>
        <Text style={{ color: '#856404', textAlign: 'center' }}>
          ⚠️ Esta tela é antiga. Para funcionalidades completas, use o menu lateral (Empresas, Solicitações, etc).
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Image
            source={settings.logoUrl ? { uri: settings.logoUrl } : (mode === 'dark' ? require('../../assets/landing/Logo White.png') : require('../../assets/landing/Logo Black.png'))}
            resizeMode="contain"
            style={{ width: 60, height: 34 }}
          />
          <View style={{ gap: 0 }}>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800', lineHeight: 16 }}>FAST</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800', lineHeight: 16 }}>CASH</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800', lineHeight: 16 }}>FLOW</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            // Tenta navegar para o Dashboard novo
            try { nav.navigate('Dashboard'); } catch (e) { alert('Use o menu lateral para acessar o Dashboard novo.'); }
          }}
          style={{ backgroundColor: '#2563EB', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Ir para Painel Oficial</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity onPress={() => setTab('empresas')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FFC300' }}>
          <Text style={{ color: '#111', fontWeight: '800' }}>Empresas</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('config')} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FFC300' }}>
          <Text style={{ color: '#111', fontWeight: '800' }}>Config</Text>
        </TouchableOpacity>
      </View>

      {tab === 'empresas' && (
        <>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>Solicitações</Text>
          <FlatList
            data={requestsQ.data || []}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, backgroundColor: theme.card, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>{item.company_name} — {item.owner_name}</Text>
                  <Text style={{ color: theme.textSecondary }}>{item.phone} • {item.created_at}</Text>
                </View>
                {!item.approved && (
                  <TouchableOpacity
                    onPress={() => {
                      // Redirecionar para AdminRequestsScreen
                      try {
                        nav.navigate('Solicitações');
                      } catch {
                        alert('Por favor, acesse a tela "Solicitações" no menu lateral para aprovar.');
                      }
                    }}
                    style={{ backgroundColor: '#16A34A', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Gerenciar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        </>
      )}

      {tab === 'config' && (
        <View>
          <Text style={{ color: theme.text }}>Use a tela de Configurações no menu lateral.</Text>
        </View>
      )}

      {tab === 'landing' && <LandingSettingsScreen />}
    </View>
  );
}
