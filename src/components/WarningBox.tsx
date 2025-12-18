import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { fontSizes, fontWeights, spacing, radii } from '../theme';

export type WarningVariant = 'info' | 'warning' | 'danger' | 'success';

interface WarningBoxProps {
    variant: WarningVariant;
    title: string;
    messages: string[];
    icon?: string;
}

const VARIANT_CONFIG: Record<WarningVariant, { bg: string; border: string; icon: string }> = {
    info: { bg: 'rgba(59,130,246,0.1)', border: '#3B82F6', icon: 'ℹ️' },
    warning: { bg: 'rgba(245,158,11,0.1)', border: '#F59E0B', icon: '⚠️' },
    danger: { bg: 'rgba(239,68,68,0.1)', border: '#EF4444', icon: '🚨' },
    success: { bg: 'rgba(16,185,129,0.1)', border: '#10B981', icon: '✅' },
};

export default function WarningBox({ variant, title, messages, icon }: WarningBoxProps) {
    const { theme } = useThemeCtx();
    const config = VARIANT_CONFIG[variant];
    const displayIcon = icon || config.icon;

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: config.bg,
                    borderColor: config.border,
                },
            ]}
        >
            <View style={styles.header}>
                <Text style={styles.icon}>{displayIcon}</Text>
                <Text style={[styles.title, { color: config.border }]}>{title}</Text>
            </View>
            <View style={styles.messages}>
                {messages.map((message, index) => (
                    <View key={index} style={styles.messageRow}>
                        <Text style={[styles.bullet, { color: config.border }]}>•</Text>
                        <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

// Quick helpers for common use cases
export function ImportWarning() {
    return (
        <WarningBox
            variant="warning"
            title="Antes de Importar"
            icon="📥"
            messages={[
                'Verifique se o arquivo está no formato correto (CSV ou OFX)',
                'Faça um backup antes de importar muitos dados',
                'Transações duplicadas serão importadas novamente',
                'Revise todas as transações antes de confirmar',
            ]}
        />
    );
}

export function BackupWarning() {
    return (
        <WarningBox
            variant="warning"
            title="Importante"
            icon="💾"
            messages={[
                'O backup JSON contém TODOS os seus dados',
                'Guarde seus backups em local seguro (Google Drive, Dropbox)',
                'Faça backups antes de atualizações do app',
                'Compartilhe o CSV com seu contador se necessário',
            ]}
        />
    );
}

export function SyncWarning() {
    return (
        <WarningBox
            variant="danger"
            title="Atenção"
            icon="🔄"
            messages={[
                'Esta ação irá sincronizar todos os dados com o servidor',
                'Certifique-se de estar conectado à internet',
                'Não feche o aplicativo durante a sincronização',
                'Dados locais não salvos podem ser perdidos',
            ]}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: radii.md,
        borderWidth: 1,
        borderLeftWidth: 4,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    icon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    title: {
        fontSize: fontSizes.base,
        fontWeight: fontWeights.bold,
    },
    messages: {
        marginLeft: 4,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    bullet: {
        fontSize: fontSizes.sm,
        marginRight: spacing.xs,
        marginTop: 2,
    },
    message: {
        fontSize: fontSizes.sm,
        flex: 1,
        lineHeight: 20,
    },
});
