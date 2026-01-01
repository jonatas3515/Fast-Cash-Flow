import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import {
  DashboardWidget,
  getDashboardWidgets,
  saveDashboardWidgets,
  resetDashboardWidgets,
} from '../utils/dashboardWidgets';

export default function CustomizeDashboardScreen({ navigation }: any) {
  const { theme, mode } = useThemeCtx();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadWidgets();
  }, []);

  const loadWidgets = async () => {
    try {
      const loadedWidgets = await getDashboardWidgets();
      setWidgets(loadedWidgets.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Erro ao carregar widgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWidget = (id: string) => {
    const updated = widgets.map(w =>
      w.id === id ? { ...w, enabled: !w.enabled } : w
    );
    setWidgets(updated);
    setHasChanges(true);
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const currentIndex = widgets.findIndex(w => w.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === widgets.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const updated = [...widgets];
    const [movedWidget] = updated.splice(currentIndex, 1);
    updated.splice(newIndex, 0, movedWidget);

    // Atualizar ordem
    const reordered = updated.map((w, index) => ({ ...w, order: index }));
    setWidgets(reordered);
    setHasChanges(true);
  };

  const saveChanges = async () => {
    try {
      await saveDashboardWidgets(widgets);
      Alert.alert('Sucesso', 'Personalização salva! O dashboard foi atualizado.');
      setHasChanges(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Restaurar Padrão',
      'Deseja restaurar o dashboard para a configuração padrão? Isso irá desfazer todas as personalizações.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            await resetDashboardWidgets();
            await loadWidgets();
            setHasChanges(false);
            Alert.alert('Sucesso', 'Dashboard restaurado ao padrão!');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={[styles.header, { alignItems: 'center' }]}>
          <Ionicons name="construct-outline" size={40} color={mode === 'dark' ? theme.primary : theme.negative} />
          <Text style={[styles.title, { color: mode === 'dark' ? theme.primary : theme.negative, textAlign: 'center' }]}>
            Personalize seu Dashboard
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'center' }]}>
            Escolha quais informações você quer ver e organize na ordem que preferir
          </Text>
        </View>

        <View style={styles.widgetsList}>
          {widgets.map((widget, index) => (
            <View
              key={widget.id}
              style={[
                styles.widgetCard,
                {
                  backgroundColor: theme.card,
                  opacity: widget.enabled ? 1 : 0.5,
                },
              ]}
            >
              <View style={styles.widgetHeader}>
                <View style={styles.widgetInfo}>
                  <Ionicons
                    name={widget.icon as any}
                    size={28}
                    color={widget.enabled ? theme.primary : theme.textSecondary}
                  />
                  <View style={styles.widgetTexts}>
                    <Text style={[styles.widgetTitle, { color: theme.text }]}>
                      {widget.title}
                    </Text>
                    <Text style={[styles.widgetDescription, { color: theme.textSecondary }]}>
                      {widget.description}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={widget.enabled}
                  onValueChange={() => toggleWidget(widget.id)}
                  trackColor={{ false: theme.border, true: theme.primary + '80' }}
                  thumbColor={widget.enabled ? theme.primary : theme.textSecondary}
                />
              </View>

              {widget.enabled && (
                <View style={styles.widgetActions}>
                  <TouchableOpacity
                    style={[
                      styles.moveButton,
                      { backgroundColor: theme.background },
                      index === 0 && { opacity: 0.3 }
                    ]}
                    onPress={() => moveWidget(widget.id, 'up')}
                    disabled={index === 0}
                  >
                    <Ionicons name="arrow-up" size={20} color={theme.text} />
                    <Text style={[styles.moveButtonText, { color: theme.text }]}>Subir</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.moveButton,
                      { backgroundColor: theme.background },
                      index === widgets.length - 1 && { opacity: 0.3 }
                    ]}
                    onPress={() => moveWidget(widget.id, 'down')}
                    disabled={index === widgets.length - 1}
                  >
                    <Ionicons name="arrow-down" size={20} color={theme.text} />
                    <Text style={[styles.moveButtonText, { color: theme.text }]}>Descer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.resetButton, { borderColor: theme.negative }]}
          onPress={handleReset}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.negative} />
          <Text style={[styles.resetButtonText, { color: theme.negative }]}>
            Restaurar Padrão
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {hasChanges && (
        <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            onPress={saveChanges}
          >
            <Ionicons name="checkmark-circle-outline" size={24} color="#FFF" />
            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  widgetsList: {
    padding: 16,
  },
  widgetCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    // @ts-ignore
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  widgetTexts: {
    marginLeft: 12,
    flex: 1,
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  widgetDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  widgetActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  moveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  moveButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    marginHorizontal: 16,
    marginTop: 10,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
