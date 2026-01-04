/**
 * FloatingAssistant - Assistente flutuante com animação e notificações
 * Substitui o botão flutuante antigo
 */
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
    Modal,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';
import { useCompanyUnreadMessages } from '../../hooks/useUnreadMessages';
import { useNavigation } from '@react-navigation/native';

interface FloatingAssistantProps {
    companyId: string | null;
    isAdmin?: boolean;
    onQuickAction?: () => void; // Callback para abrir modal de lançamento rápido
}

export default function FloatingAssistant({
    companyId,
    isAdmin = false,
    onQuickAction,
}: FloatingAssistantProps) {
    const { theme } = useThemeCtx();
    const navigation = useNavigation<any>();
    const [menuOpen, setMenuOpen] = useState(false);

    // Buscar mensagens não lidas
    const { data: unreadData } = useCompanyUnreadMessages(companyId);
    const totalUnread = (unreadData?.supportMessages || 0) + (unreadData?.adminMessages || 0);

    // Animação de flutuação
    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Animação de flutuação suave e contínua
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -8,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();

        return () => animation.stop();
    }, [floatAnim]);

    const handleQuickAction = () => {
        setMenuOpen(false);
        onQuickAction?.();
    };

    const handleHelp = () => {
        setMenuOpen(false);
        // Navegar para tela de ajuda/suporte
        if (isAdmin) {
            navigation.navigate('Suporte');
        } else {
            navigation.navigate('Ajuda');
        }
    };

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    // Imagens do assistente
    const assistantImage = Platform.OS === 'web'
        ? require('../../../assets/landing/Assistente Fast.png')
        : require('../../../assets/landing/Assistente Fast.png');

    return (
        <>
            {/* Botão do Assistente */}
            <Animated.View
                style={[
                    styles.container,
                    {
                        transform: [{ translateY: floatAnim }],
                    },
                ]}
            >
                <TouchableOpacity
                    onPress={toggleMenu}
                    activeOpacity={0.8}
                    style={styles.assistantButton}
                >
                    <Image
                        source={assistantImage}
                        style={styles.assistantImage}
                        resizeMode="contain"
                    />

                    {/* Badge de notificações */}
                    {totalUnread > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {totalUnread > 99 ? '99+' : totalUnread}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>

            {/* Menu Modal */}
            <Modal
                visible={menuOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuOpen(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setMenuOpen(false)}
                >
                    <View style={[styles.menuContainer, { backgroundColor: theme.card }]}>
                        {/* Cabeçalho */}
                        <View style={styles.menuHeader}>
                            <Image
                                source={assistantImage}
                                style={styles.menuHeaderImage}
                                resizeMode="contain"
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.menuTitle, { color: theme.text }]}>
                                    Assistente Fast
                                </Text>
                                <Text style={[styles.menuSubtitle, { color: theme.textSecondary }]}>
                                    Como posso ajudar?
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setMenuOpen(false)}>
                                <Text style={{ fontSize: 24, color: theme.textSecondary }}>×</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Opções do Menu */}
                        <View style={styles.menuOptions}>
                            {/* Lançamento Rápido */}
                            <TouchableOpacity
                                style={[styles.menuOption, { backgroundColor: '#16a34a' }]}
                                onPress={handleQuickAction}
                            >
                                <Text style={styles.menuOptionIcon}>⚡</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.menuOptionTitle}>Lançamento Rápido</Text>
                                    <Text style={styles.menuOptionDesc}>
                                        Registre entradas, saídas ou dívidas
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {/* Ajuda/Suporte */}
                            <TouchableOpacity
                                style={[styles.menuOption, { backgroundColor: '#3b82f6' }]}
                                onPress={handleHelp}
                            >
                                <View style={{ position: 'relative' }}>
                                    <Text style={styles.menuOptionIcon}>
                                        {isAdmin ? '💬' : '❓'}
                                    </Text>
                                    {totalUnread > 0 && (
                                        <View style={styles.optionBadge}>
                                            <Text style={styles.optionBadgeText}>{totalUnread}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.menuOptionTitle}>
                                        {isAdmin ? 'Suporte' : 'Ajuda'}
                                    </Text>
                                    <Text style={styles.menuOptionDesc}>
                                        {isAdmin
                                            ? 'Mensagens das empresas'
                                            : 'Fale com nosso suporte'
                                        }
                                    </Text>
                                </View>
                                {totalUnread > 0 && (
                                    <View style={styles.newBadge}>
                                        <Text style={styles.newBadgeText}>NOVO</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Dicas */}
                        <View style={[styles.tipContainer, { backgroundColor: theme.cardSecondary }]}>
                            <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                                💡 Dica: Use o lançamento rápido para agilizar seu controle financeiro!
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        zIndex: 1000,
    },
    assistantButton: {
        width: 70,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    assistantImage: {
        width: 55,
        height: 55,
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#EF4444',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        paddingBottom: 100,
        paddingRight: 20,
    },
    menuContainer: {
        width: 320,
        maxWidth: '90%',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    menuHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    menuHeaderImage: {
        width: 45,
        height: 45,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    menuSubtitle: {
        fontSize: 12,
    },
    menuOptions: {
        gap: 12,
    },
    menuOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    menuOptionIcon: {
        fontSize: 24,
    },
    menuOptionTitle: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    menuOptionDesc: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
    },
    optionBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
    newBadge: {
        backgroundColor: '#FFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    newBadgeText: {
        color: '#3b82f6',
        fontSize: 10,
        fontWeight: '800',
    },
    tipContainer: {
        marginTop: 16,
        padding: 12,
        borderRadius: 10,
    },
    tipText: {
        fontSize: 11,
        textAlign: 'center',
    },
});
