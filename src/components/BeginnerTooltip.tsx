import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { useOnboarding } from '../contexts/OnboardingContext';

interface BeginnerTooltipProps {
  stepId: string;
  position?: 'top' | 'bottom';
  onComplete?: () => void;
}

export default function BeginnerTooltip({ stepId, position = 'top', onComplete }: BeginnerTooltipProps) {
  const { theme } = useThemeCtx();
  const { isBeginnerMode, beginnerSteps, activeTooltip, completeStep, hideTooltip, currentStep } = useOnboarding();
  const [fadeAnim] = React.useState(new Animated.Value(0));

  const step = beginnerSteps.find(s => s.id === stepId);
  const isActive = isBeginnerMode && currentStep?.id === stepId && !step?.completed;

  React.useEffect(() => {
    if (isActive) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isActive]);

  if (!isActive || !step) {
    return null;
  }

  const handleComplete = async () => {
    await completeStep(stepId);
    onComplete?.();
  };

  const handleDismiss = () => {
    hideTooltip();
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: '#FFC300',
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [position === 'top' ? -10 : 10, 0],
          })}],
        },
        position === 'bottom' && styles.containerBottom,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.stepNumber}>Passo {step.order} de 5</Text>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.icon}>{step.icon}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.tooltip}>{step.tooltip}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          onPress={handleComplete} 
          style={styles.completeButton}
        >
          <Text style={styles.completeButtonText}>✓ Concluir este passo</Text>
        </TouchableOpacity>
      </View>

      {/* Seta indicadora */}
      <View style={[
        styles.arrow,
        position === 'top' ? styles.arrowBottom : styles.arrowTop,
      ]} />
    </Animated.View>
  );
}

// Componente de banner para topo da tela
export function BeginnerBanner() {
  const { theme } = useThemeCtx();
  const { isBeginnerMode, currentStep, beginnerSteps, dismissBeginnerMode } = useOnboarding();

  if (!isBeginnerMode || !currentStep) {
    return null;
  }

  const completedCount = beginnerSteps.filter(s => s.completed).length;
  const totalSteps = beginnerSteps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <View style={[styles.banner, { backgroundColor: '#FFC300' }]}>
      <View style={styles.bannerHeader}>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerIcon}>🚀</Text>
          <View>
            <Text style={styles.bannerTitle}>Modo Iniciante</Text>
            <Text style={styles.bannerSubtitle}>
              {completedCount}/{totalSteps} passos • {progressPercent}% completo
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={dismissBeginnerMode} style={styles.bannerDismiss}>
          <Text style={styles.bannerDismissText}>Pular</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bannerProgress}>
        <View style={[styles.bannerProgressFill, { width: `${progressPercent}%` }]} />
      </View>

      <View style={styles.bannerCurrentStep}>
        <Text style={styles.bannerStepIcon}>{currentStep.icon}</Text>
        <View style={styles.bannerStepContent}>
          <Text style={styles.bannerStepTitle}>Próximo: {currentStep.title}</Text>
          <Text style={styles.bannerStepDesc}>{currentStep.description}</Text>
        </View>
        <Text style={styles.bannerStepArrow}>→</Text>
      </View>
    </View>
  );
}

// Componente de checklist compacta para sidebar/menu
export function BeginnerChecklist({ navigation }: { navigation: any }) {
  const { theme } = useThemeCtx();
  const { isBeginnerMode, beginnerSteps, dismissBeginnerMode } = useOnboarding();

  if (!isBeginnerMode) {
    return null;
  }

  const completedCount = beginnerSteps.filter(s => s.completed).length;
  const totalSteps = beginnerSteps.length;

  return (
    <View style={[styles.checklist, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.checklistHeader}>
        <Text style={styles.checklistIcon}>📋</Text>
        <Text style={[styles.checklistTitle, { color: theme.text }]}>
          Primeiros Passos ({completedCount}/{totalSteps})
        </Text>
      </View>

      {beginnerSteps.map((step, index) => (
        <TouchableOpacity
          key={step.id}
          style={styles.checklistItem}
          onPress={() => !step.completed && navigation.navigate(step.screen)}
          disabled={step.completed}
        >
          <View style={[
            styles.checklistCheckbox,
            { 
              backgroundColor: step.completed ? '#16A34A' : 'transparent',
              borderColor: step.completed ? '#16A34A' : theme.border,
            }
          ]}>
            {step.completed ? (
              <Text style={styles.checklistCheck}>✓</Text>
            ) : (
              <Text style={styles.checklistNumber}>{index + 1}</Text>
            )}
          </View>
          <Text style={[
            styles.checklistItemText,
            { 
              color: step.completed ? theme.textSecondary : theme.text,
              textDecorationLine: step.completed ? 'line-through' : 'none',
            }
          ]}>
            {step.title}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={dismissBeginnerMode} style={styles.checklistDismiss}>
        <Text style={[styles.checklistDismissText, { color: theme.textSecondary }]}>
          Pular tutorial
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  containerBottom: {
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111',
    opacity: 0.7,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 16,
    color: '#111',
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
    marginBottom: 4,
  },
  tooltip: {
    fontSize: 14,
    color: '#111',
    lineHeight: 20,
  },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  completeButton: {
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  completeButtonText: {
    color: '#FFC300',
    fontWeight: '700',
    fontSize: 14,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    left: 30,
  },
  arrowBottom: {
    bottom: -10,
    borderTopWidth: 10,
    borderTopColor: '#FFC300',
  },
  arrowTop: {
    top: -10,
    borderBottomWidth: 10,
    borderBottomColor: '#FFC300',
  },

  // Banner styles
  banner: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#111',
    opacity: 0.7,
  },
  bannerDismiss: {
    padding: 8,
  },
  bannerDismissText: {
    fontSize: 14,
    color: '#111',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  bannerProgress: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    marginBottom: 12,
  },
  bannerProgressFill: {
    height: '100%',
    backgroundColor: '#111',
    borderRadius: 3,
  },
  bannerCurrentStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 12,
    borderRadius: 8,
  },
  bannerStepIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  bannerStepContent: {
    flex: 1,
  },
  bannerStepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  bannerStepDesc: {
    fontSize: 12,
    color: '#111',
    opacity: 0.7,
  },
  bannerStepArrow: {
    fontSize: 20,
    color: '#111',
    fontWeight: '700',
  },

  // Checklist styles
  checklist: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checklistIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checklistCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checklistCheck: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  checklistNumber: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
  },
  checklistItemText: {
    fontSize: 13,
    flex: 1,
  },
  checklistDismiss: {
    marginTop: 12,
    alignItems: 'center',
  },
  checklistDismissText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
