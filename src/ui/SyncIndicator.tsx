import React from 'react';
import { View, Text, Platform } from 'react-native';
import { onSyncing } from '../lib/sync';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';

export default function SyncIndicator() {
  const [syncing, setSyncing] = React.useState(false);
  const { theme } = useThemeCtx();
  const { t } = useI18n();
  React.useEffect(() => {
    const off = onSyncing(setSyncing);
    return off;
  }, []);
  if (!syncing) return null;
  return (
    <View style={{ position: 'absolute', top: Platform.OS === 'web' ? 0 : 30, left: 0, right: 0, alignItems: 'center' }}>
      <View style={{ backgroundColor: '#FFC300', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 }}>
        <Text style={{ color: '#111', fontWeight: '700' }}>{t('syncing')}</Text>
      </View>
    </View>
  );
}
