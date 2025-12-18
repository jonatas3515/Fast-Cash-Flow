import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';

interface LogoutWarningBannerProps {
    showWarning: boolean;
    timeLeft: number;
    extendSession: () => void;
}

/**
 * Component to display logout warning when session is about to expire
 * Shows a floating banner that allows user to extend session
 */
export default function LogoutWarningBanner({
    showWarning,
    timeLeft,
    extendSession
}: LogoutWarningBannerProps) {
    const { theme } = useThemeCtx();

    // Only render on web when warning is active
    if (Platform.OS !== 'web' || !showWarning) {
        return null;
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.warning }]}>
            <View style={styles.content}>
                <Text style={styles.icon}>⏰</Text>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>Sessão expirando</Text>
                    <Text style={styles.subtitle}>
                        Você será desconectado em {formatTime(timeLeft)}
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.button}
                onPress={extendSession}
                activeOpacity={0.8}
            >
                <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        zIndex: 9999,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    icon: {
        fontSize: 20,
    },
    textContainer: {
        gap: 2,
    },
    title: {
        color: '#1F2937',
        fontWeight: '700',
        fontSize: 14,
    },
    subtitle: {
        color: '#374151',
        fontSize: 12,
    },
    button: {
        backgroundColor: '#1F2937',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13,
    },
});
