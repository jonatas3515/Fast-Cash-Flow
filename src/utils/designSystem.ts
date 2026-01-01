/**
 * Design System Utilities
 * 
 * Shared styles and utilities for consistent UI across the app
 */

import { StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { fontSizes, fontWeights, spacing, radii, shadows } from '../theme';

// ============================================================================
// TYPOGRAPHY STYLES
// ============================================================================

export const typography = StyleSheet.create({
    // Headings
    h1: {
        fontSize: fontSizes.xxl,
        fontWeight: fontWeights.extrabold,
        lineHeight: fontSizes.xxl * 1.2,
    },
    h2: {
        fontSize: fontSizes.xl,
        fontWeight: fontWeights.bold,
        lineHeight: fontSizes.xl * 1.3,
    },
    h3: {
        fontSize: fontSizes.lg,
        fontWeight: fontWeights.bold,
        lineHeight: fontSizes.lg * 1.4,
    },
    // Body text
    bodyLarge: {
        fontSize: fontSizes.base,
        fontWeight: fontWeights.normal,
        lineHeight: fontSizes.base * 1.5,
    },
    body: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.normal,
        lineHeight: fontSizes.sm * 1.5,
    },
    bodySmall: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.normal,
        lineHeight: fontSizes.xs * 1.5,
    },
    // Labels
    label: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.semibold,
    },
    labelSmall: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.medium,
    },
    // Special
    caption: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.normal,
    },
    button: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.bold,
    },
    buttonLarge: {
        fontSize: fontSizes.base,
        fontWeight: fontWeights.bold,
    },
});

// ============================================================================
// CARD STYLES
// ============================================================================

export const getCardStyle = (theme: any, variant: 'default' | 'elevated' | 'outlined' = 'default'): ViewStyle => {
    const base: ViewStyle = {
        backgroundColor: theme.card,
        borderRadius: radii.lg,
        padding: spacing.md,
    };

    switch (variant) {
        case 'elevated':
            return {
                ...base,
                ...shadows.md,
                shadowColor: theme.shadow,
                // @ts-ignore
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
            };
        case 'outlined':
            return {
                ...base,
                borderWidth: 1,
                borderColor: theme.border,
            };
        default:
            return {
                ...base,
                borderWidth: 1,
                borderColor: theme.border,
                ...shadows.sm,
                shadowColor: theme.shadow,
                // @ts-ignore
                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
            };
    }
};

// ============================================================================
// SUMMARY CARD STYLES (for Dashboard KPIs)
// ============================================================================

export const getSummaryCardStyle = (theme: any, type: 'default' | 'positive' | 'negative' | 'warning' = 'default'): ViewStyle => {
    const base = getCardStyle(theme, 'default');

    const accentColors: Record<string, string> = {
        default: theme.primary,
        positive: theme.positive,
        negative: theme.negative,
        warning: theme.warning,
    };

    return {
        ...base,
        borderLeftWidth: 4,
        borderLeftColor: accentColors[type],
    };
};

// ============================================================================
// BUTTON STYLES
// ============================================================================

export const getButtonStyle = (theme: any, variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary'): ViewStyle => {
    const base: ViewStyle = {
        paddingVertical: spacing.sm + 4, // 12px
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
    };

    switch (variant) {
        case 'primary':
            return {
                ...base,
                backgroundColor: theme.primary,
            };
        case 'secondary':
            return {
                ...base,
                backgroundColor: theme.accent,
            };
        case 'outline':
            return {
                ...base,
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderColor: theme.primary,
            };
        case 'ghost':
            return {
                ...base,
                backgroundColor: 'transparent',
            };
        default:
            return base;
    }
};

// ============================================================================
// INPUT STYLES
// ============================================================================

export const getInputStyle = (theme: any, focused: boolean = false): ViewStyle => ({
    backgroundColor: theme.input,
    borderWidth: 1,
    borderColor: focused ? theme.inputBorderFocus : theme.inputBorder,
    borderRadius: radii.sm,
    padding: spacing.sm + 4, // 12px
    ...Platform.select({
        web: {
            outlineWidth: 0,
        },
    }),
});

// ============================================================================
// SECTION STYLES
// ============================================================================

export const sectionStyles = StyleSheet.create({
    container: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
    },
    title: {
        fontSize: fontSizes.lg,
        fontWeight: fontWeights.bold,
        marginBottom: spacing.md,
    },
    subtitle: {
        fontSize: fontSizes.sm,
        marginBottom: spacing.md,
    },
});

// ============================================================================
// ALERT/BANNER STYLES
// ============================================================================

export const getAlertStyle = (theme: any, type: 'info' | 'success' | 'warning' | 'error' = 'info'): ViewStyle => {
    const colors: Record<string, { bg: string; border: string }> = {
        info: { bg: `${theme.secondary}15`, border: theme.secondary },
        success: { bg: `${theme.positive}15`, border: theme.positive },
        warning: { bg: `${theme.warning}15`, border: theme.warning },
        error: { bg: `${theme.negative}15`, border: theme.negative },
    };

    return {
        backgroundColor: colors[type].bg,
        borderLeftWidth: 4,
        borderLeftColor: colors[type].border,
        borderRadius: radii.sm,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    };
};

// ============================================================================
// FEATURE BANNER STYLES (for landing promises in app)
// ============================================================================

export const getFeatureBannerStyle = (theme: any): ViewStyle => ({
    backgroundColor: `${theme.primary}10`,
    borderRadius: radii.md,
    padding: spacing.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
});

// ============================================================================
// COLLAPSIBLE FILTER HEADER STYLES
// ============================================================================

export const getFilterHeaderStyle = (theme: any, expanded: boolean): ViewStyle => ({
    backgroundColor: theme.cardSecondary,
    borderRadius: radii.sm,
    padding: spacing.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: expanded ? spacing.sm : 0,
});
