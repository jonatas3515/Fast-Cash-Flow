import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Dimensions, Image, ViewStyle, Animated, Linking } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';
import { getPublishedLandingSettings, DEFAULT_LANDING_SETTINGS } from '../repositories/landing_settings';

const { width: screenWidth } = Dimensions.get('window');

// Feature card data - simplified texts
const FEATURES = [
    {
        icon: '📊',
        title: 'Dashboard em tempo real',
        description: 'Veja entradas, saídas e saldo projetado.',
        benefit: 'Reduza 50% do tempo de fechamento',
        highlight: true,
    },
    {
        icon: '📋',
        title: 'Contas a pagar e receber',
        description: 'Organize boletos, parcelas e vencimentos.',
        benefit: 'Evite multas e juros por atraso',
        highlight: false,
    },
    {
        icon: '📈',
        title: 'Relatórios inteligentes',
        description: 'Análises prontas para decisões e contador.',
        benefit: 'Exporte em segundos',
        highlight: false,
    },
    {
        icon: '🏷️',
        title: 'Gestão completa',
        description: 'Clientes, produtos e precificação.',
        benefit: 'Aumente sua margem de lucro',
        highlight: false,
    },
];

// Target audience - simplified
const TARGET_AUDIENCE = [
    { icon: '🛒', label: 'Comércios', benefit: 'Vendas diárias organizadas' },
    { icon: '🔧', label: 'Serviços', benefit: 'Contratos e recorrências' },
    { icon: '🏥', label: 'Clínicas', benefit: 'Convênios e particulares' },
    { icon: '🏭', label: 'Indústrias', benefit: 'Custos de produção' },
    { icon: '📱', label: 'Delivery', benefit: 'Integração com apps' },
];

// Screenshots
const SCREENSHOTS = [
    {
        title: 'Visão geral do caixa',
        subtitle: 'Entradas, saídas e saldo projetado',
        image: require('../../assets/landing/Dashboard.jpg'),
    },
    {
        title: 'Relatórios para o contador',
        subtitle: 'Exportações organizadas',
        image: require('../../assets/landing/Relatórios.jpg'),
    },
];

// Plans data - expanded with 3 tiers and clear feature mapping
const PLANS = [
    {
        name: 'Essencial',
        description: 'MEI e pequenos negócios',
        monthlyPrice: 9.99,
        yearlyPrice: 99.99,
        features: [
            'Dashboard de fluxo de caixa',
            'Lançamentos diários',
            'Contas a pagar e receber',
            'Relatórios principais',
            '1 usuário',
        ],
        recommended: false,
        savingsBadge: null,
    },
    {
        name: 'Profissional',
        description: 'Crescimento e gestão avançada',
        monthlyPrice: 15.99,
        yearlyPrice: 159.90,
        features: [
            'Tudo do Essencial',
            'Despesas recorrentes',
            'Metas financeiras',
            'Diagnóstico financeiro',
            'Notificações automáticas',
            '3 usuários',
        ],
        recommended: true,
        savingsBadge: 'Economize 17%',
    },
    {
        name: 'Avançado',
        description: 'Múltiplas empresas e equipe',
        monthlyPrice: 29.99,
        yearlyPrice: 299.90,
        features: [
            'Tudo do Profissional',
            'Multiempresa',
            'Relatórios detalhados',
            'Gestão de equipe',
            'Usuários ilimitados',
        ],
        recommended: false,
        savingsBadge: null,
    },
];

// Security badges
const SECURITY_BADGES = [
    { icon: '🛡️', label: 'Dados protegidos' },
    { icon: '☁️', label: 'Backup automático' },
    { icon: '🔐', label: 'Acesso seguro' },
];

// Social proof
const SOCIAL_PROOF = { companies: '+150', transactions: '+10.000', satisfaction: '98%' };

// Evolution points
const EVOLUTION_POINTS = ['Atualizações frequentes', 'Backup automático', 'Equipe de suporte dedicada'];

// Header nav items
const NAV_ITEMS = [
    { label: 'Como funciona', ref: 'features' },
    { label: 'Planos', ref: 'plans' },
    { label: 'Para quem', ref: 'audience' },
];

type Props = {
    trialDays: number;
    onRegister: () => void;
    onLogin: () => void;
};

export default function LandingPage({ trialDays, onRegister, onLogin }: Props) {
    const { mode, setMode, theme } = useThemeCtx();
    const [activeSlide, setActiveSlide] = React.useState(0);
    const [hoveredCard, setHoveredCard] = React.useState<number | null>(null);
    const [hoveredChip, setHoveredChip] = React.useState<number | null>(null);
    const [hoveredPlan, setHoveredPlan] = React.useState<number | null>(null);
    const [yearlyBilling, setYearlyBilling] = React.useState(true);
    const fadeAnim = React.useRef(new Animated.Value(1)).current;
    const scrollViewRef = React.useRef<ScrollView>(null);
    const sectionRefs = React.useRef<{ [key: string]: number }>({});
    const [currentPage, setCurrentPage] = React.useState<'home' | 'terms' | 'privacy'>('home');
    const [tooltipVisible, setTooltipVisible] = React.useState(false);

    // State for CMS settings (using useState instead of useQuery since LandingPage is outside QueryClientProvider)
    const [cmsSettings, setCmsSettings] = React.useState<typeof DEFAULT_LANDING_SETTINGS | null>(null);

    // Fetch CMS settings on mount
    React.useEffect(() => {
        getPublishedLandingSettings()
            .then(data => setCmsSettings(data))
            .catch(err => {
                console.warn('[LandingPage] Failed to fetch CMS settings, using defaults:', err);
                setCmsSettings(null);
            });
    }, []);

    // Use fetched settings or fallback to defaults
    const settings = cmsSettings || DEFAULT_LANDING_SETTINGS;

    // Dynamic data from CMS with fallback
    const DYNAMIC_FEATURES = settings.features || FEATURES;
    const DYNAMIC_TARGET_AUDIENCE = settings.target_audience || TARGET_AUDIENCE;
    const DYNAMIC_PLANS = settings.plans || PLANS;
    const DYNAMIC_SOCIAL_PROOF = settings.social_proof || SOCIAL_PROOF;
    const DYNAMIC_EVOLUTION_POINTS = settings.evolution_points || EVOLUTION_POINTS;
    const DYNAMIC_NAV_ITEMS = settings.nav_items || NAV_ITEMS;
    const DYNAMIC_SCREENSHOTS = settings.screenshots || SCREENSHOTS.map(s => ({
        title: s.title,
        subtitle: s.subtitle,
        image_url: '' // Will use local require as fallback
    }));

    const isWeb = Platform.OS === 'web';
    const isMobile = screenWidth < 900;
    const isDesktop = screenWidth >= 1024;

    // Scroll to section
    const scrollToSection = (section: string) => {
        const offset = sectionRefs.current[section];
        if (offset !== undefined && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: offset - 80, animated: true });
        }
    };

    // Carousel animation
    const animateSlideChange = (newIndex: number) => {
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0.3, duration: 150, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
        setActiveSlide(newIndex);
    };

    React.useEffect(() => {
        const interval = setInterval(() => {
            animateSlideChange((activeSlide + 1) % DYNAMIC_SCREENSHOTS.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [activeSlide, DYNAMIC_SCREENSHOTS.length]);

    const sectionStyle: ViewStyle = {
        width: '100%' as any,
        maxWidth: 1200,
        paddingHorizontal: 24,
        alignSelf: 'center',
    };

    const SECTION_PADDING = 48;

    // Simple markdown renderer for legal pages
    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, index) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('# ')) {
                return <Text key={index} style={{ color: theme.text, fontSize: 28, fontWeight: '800', marginTop: 24, marginBottom: 12 }}>{trimmed.slice(2)}</Text>;
            }
            if (trimmed.startsWith('## ')) {
                return <Text key={index} style={{ color: theme.text, fontSize: 20, fontWeight: '700', marginTop: 20, marginBottom: 8 }}>{trimmed.slice(3)}</Text>;
            }
            if (trimmed.startsWith('- ')) {
                return <Text key={index} style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 24, marginLeft: 16 }}>• {trimmed.slice(2)}</Text>;
            }
            if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                return <Text key={index} style={{ color: theme.text, fontSize: 15, fontWeight: '700', lineHeight: 24, marginTop: 8 }}>{trimmed.slice(2, -2)}</Text>;
            }
            if (trimmed === '') {
                return <View key={index} style={{ height: 8 }} />;
            }
            // Handle inline bold **text**
            const parts = trimmed.split(/\*\*(.*?)\*\*/g);
            if (parts.length > 1) {
                return (
                    <Text key={index} style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 24 }}>
                        {parts.map((part, i) => i % 2 === 1 ? <Text key={i} style={{ fontWeight: '700', color: theme.text }}>{part}</Text> : part)}
                    </Text>
                );
            }
            return <Text key={index} style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 24 }}>{trimmed}</Text>;
        });
    };

    // Render Legal Pages (Terms/Privacy)
    if (currentPage !== 'home') {
        const content = currentPage === 'terms' ? settings.terms_of_use : settings.privacy_policy;
        const title = currentPage === 'terms' ? 'Termos de Uso' : 'Política de Privacidade';

        return (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
                {/* Header */}
                <View style={{
                    backgroundColor: mode === 'dark' ? 'rgba(31,41,55,0.95)' : 'rgba(249,250,251,0.95)',
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    paddingVertical: 16,
                    paddingHorizontal: 24,
                }}>
                    <View style={{ ...sectionStyle, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <TouchableOpacity
                            onPress={() => setCurrentPage('home')}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        >
                            <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>← Voltar à Tela Inicial</Text>
                        </TouchableOpacity>
                        <Image
                            source={mode === 'dark' ? require('../../assets/landing/Logo White.png') : require('../../assets/landing/Logo Black.png')}
                            resizeMode="contain"
                            style={{ width: 100, height: 36 }}
                        />
                    </View>
                </View>

                {/* Content */}
                <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
                    <View style={{ ...sectionStyle }}>
                        {content ? renderMarkdown(content) : (
                            <Text style={{ color: theme.textSecondary, fontSize: 16, textAlign: 'center', marginTop: 40 }}>
                                Conteúdo não configurado. Configure os {title} no painel de administração.
                            </Text>
                        )}
                    </View>
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            {/* Sticky Header */}
            <View
                style={{
                    position: isWeb ? 'sticky' as any : 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    backgroundColor: mode === 'dark' ? 'rgba(31,41,55,0.95)' : 'rgba(249,250,251,0.95)',
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    shadowColor: theme.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                }}
            >
                <View
                    style={{
                        ...sectionStyle,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                    }}
                >
                    {/* Logo */}
                    <Image
                        source={mode === 'dark' ? require('../../assets/landing/Logo White.png') : require('../../assets/landing/Logo Black.png')}
                        resizeMode="contain"
                        style={{ width: 100, height: 40 }}
                    />

                    {/* Nav Links (Desktop) */}
                    {isDesktop && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 28 }}>
                            {DYNAMIC_NAV_ITEMS.map((item, index) => (
                                <TouchableOpacity key={index} onPress={() => scrollToSection(item.ref)}>
                                    <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: '600' }}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Right Actions */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity
                            onPress={onLogin}
                            style={{
                                backgroundColor: '#D90429',
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 10,
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Entrar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onRegister}
                            style={{
                                backgroundColor: theme.accent,
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 10,
                            }}
                        >
                            <Text style={{ color: '#111', fontWeight: '700', fontSize: 14 }}>Teste grátis</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
                            <Text style={{ fontSize: 18 }}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingTop: 70, paddingBottom: 48 }}
            >
                {/* Hero Section */}
                <View
                    style={{
                        ...sectionStyle,
                        paddingTop: 40,
                        paddingBottom: SECTION_PADDING,
                        flexDirection: isDesktop ? 'row' : 'column',
                        alignItems: 'center',
                        gap: isDesktop ? 48 : 24,
                    }}
                >
                    {/* Left Column */}
                    <View style={{ flex: isDesktop ? 1 : undefined, alignItems: 'center', maxWidth: isDesktop ? 520 : undefined }}>
                        <Image
                            source={mode === 'dark' ? require('../../assets/landing/Logo White.png') : require('../../assets/landing/Logo Black.png')}
                            resizeMode="contain"
                            style={{ width: isDesktop ? 180 : 130, height: isDesktop ? 90 : 65, marginBottom: 24 }}
                        />
                        <Text style={{ color: theme.text, fontSize: isMobile ? 26 : 34, fontWeight: '800', textAlign: 'center', marginBottom: 12, lineHeight: isMobile ? 34 : 44 }}>
                            Organize o caixa da sua empresa em poucos minutos
                        </Text>
                        <Text style={{ color: theme.textSecondary, fontSize: isMobile ? 15 : 17, textAlign: 'center', lineHeight: isMobile ? 24 : 28, marginBottom: 28 }}>
                            Controle financeiro sem planilhas, de qualquer dispositivo.
                        </Text>
                        <TouchableOpacity
                            onPress={onRegister}
                            style={{
                                backgroundColor: theme.accent,
                                paddingHorizontal: 36,
                                paddingVertical: 18,
                                borderRadius: 14,
                                shadowColor: theme.accent,
                                shadowOffset: { width: 0, height: 6 },
                                shadowOpacity: 0.35,
                                shadowRadius: 12,
                                elevation: 8,
                                marginBottom: 14,
                            }}
                        >
                            <Text style={{ color: '#111', fontWeight: '800', fontSize: 18 }}>
                                Comece agora – {trialDays} dias grátis
                            </Text>
                        </TouchableOpacity>
                        <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }}>
                            Sem cartão • Cancele quando quiser
                        </Text>
                    </View>
                    {/* Right Column - Device Mockups */}
                    {isDesktop && (
                        <View style={{ flex: 1, maxWidth: 600, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            {/* Laptop */}
                            <View style={{ position: 'relative', zIndex: 1 }}>
                                <View style={{ width: 480, height: 300, backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 8, borderColor: '#333', overflow: 'hidden', shadowColor: theme.shadow, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.3, shadowRadius: 32, elevation: 16 }}>
                                    <Image source={require('../../assets/landing/Dashboard.jpg')} resizeMode="contain" style={{ width: '100%', height: '100%', backgroundColor: '#1a1a1a' }} />
                                </View>
                                <View style={{ width: 540, height: 16, backgroundColor: '#2a2a2a', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, alignSelf: 'center', marginTop: -2 }}>
                                    <View style={{ width: 80, height: 6, backgroundColor: '#444', borderRadius: 4, alignSelf: 'center', marginTop: 5 }} />
                                </View>
                                <View style={{ width: 600, height: 10, backgroundColor: '#1f1f1f', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, alignSelf: 'center' }} />
                            </View>
                            {/* Phone */}
                            <View style={{ position: 'absolute', right: -20, bottom: -30, zIndex: 2 }}>
                                <View style={{ width: 120, height: 240, backgroundColor: '#1a1a1a', borderRadius: 20, borderWidth: 4, borderColor: '#333', overflow: 'hidden', shadowColor: theme.shadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 20 }}>
                                    <View style={{ position: 'absolute', top: 4, left: '50%', marginLeft: -20, width: 40, height: 6, backgroundColor: '#1a1a1a', borderRadius: 4, zIndex: 10 }} />
                                    <Image source={require('../../assets/landing/Tela Celular.jpeg')} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Features Section */}
                <View
                    onLayout={(e) => { sectionRefs.current['features'] = e.nativeEvent.layout.y; }}
                    style={{ ...sectionStyle, paddingTop: SECTION_PADDING, paddingBottom: SECTION_PADDING }}
                >
                    <Text style={{ color: theme.text, fontSize: isMobile ? 24 : 28, fontWeight: '800', textAlign: 'center', marginBottom: 32 }}>
                        Como o sistema ajuda
                    </Text>
                    <View style={{ flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
                        {DYNAMIC_FEATURES.map((feature, index) => (
                            <TouchableOpacity
                                key={index}
                                activeOpacity={0.95}
                                onPressIn={() => isWeb && setHoveredCard(index)}
                                onPressOut={() => isWeb && setHoveredCard(null)}
                                style={{
                                    backgroundColor: theme.card,
                                    borderRadius: 16,
                                    padding: 18,
                                    width: isMobile ? '100%' as any : '23%' as any,
                                    minWidth: isMobile ? undefined : 250,
                                    maxWidth: isMobile ? undefined : 270,
                                    borderWidth: 2,
                                    borderColor: feature.highlight ? theme.accent : (hoveredCard === index ? theme.primary : theme.border),
                                    shadowColor: theme.shadow,
                                    shadowOffset: { width: 0, height: hoveredCard === index ? 8 : 4 },
                                    shadowOpacity: hoveredCard === index ? 0.18 : 0.1,
                                    shadowRadius: hoveredCard === index ? 16 : 12,
                                    elevation: hoveredCard === index ? 8 : 4,
                                    transform: [{ scale: hoveredCard === index ? 1.02 : 1 }],
                                }}
                            >
                                {feature.highlight && (
                                    <View style={{ position: 'absolute', top: -10, right: 12, backgroundColor: theme.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                                        <Text style={{ color: '#111', fontSize: 10, fontWeight: '700' }}>⭐ Mais usado</Text>
                                    </View>
                                )}
                                <Text style={{ fontSize: 32, marginBottom: 10 }}>{feature.icon}</Text>
                                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>{feature.title}</Text>
                                <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 10 }}>{feature.description}</Text>
                                <View style={{ backgroundColor: mode === 'dark' ? 'rgba(22,163,74,0.18)' : 'rgba(22,163,74,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: theme.primary }}>
                                    <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>{feature.benefit}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Screenshots Carousel */}
                <View style={{ backgroundColor: mode === 'dark' ? '#0F172A' : '#F8FAFC', paddingTop: SECTION_PADDING, paddingBottom: SECTION_PADDING }}>
                    <View style={sectionStyle}>
                        <Text style={{ color: theme.text, fontSize: isMobile ? 24 : 28, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>Conheça o sistema</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 28 }}>Telas internas do Fast Cash Flow</Text>
                        <View style={{ maxWidth: 650, alignSelf: 'center', width: '100%', position: 'relative' }}>
                            {/* Gradient background */}
                            <View style={{
                                position: 'absolute', top: -20, left: -20, right: -20, bottom: -20,
                                backgroundColor: mode === 'dark' ? 'rgba(22,163,74,0.08)' : 'rgba(22,163,74,0.05)',
                                borderRadius: 32, zIndex: -1,
                            }} />

                            {/* Left Arrow */}
                            <TouchableOpacity
                                onPress={() => animateSlideChange(activeSlide === 0 ? DYNAMIC_SCREENSHOTS.length - 1 : activeSlide - 1)}
                                style={{
                                    position: 'absolute', left: isMobile ? -10 : -50, top: '50%', marginTop: -24, zIndex: 10,
                                    width: 48, height: 48, borderRadius: 24,
                                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <Text style={{ color: theme.text, fontSize: 24, fontWeight: '600' }}>‹</Text>
                            </TouchableOpacity>

                            {/* Right Arrow */}
                            <TouchableOpacity
                                onPress={() => animateSlideChange((activeSlide + 1) % DYNAMIC_SCREENSHOTS.length)}
                                style={{
                                    position: 'absolute', right: isMobile ? -10 : -50, top: '50%', marginTop: -24, zIndex: 10,
                                    width: 48, height: 48, borderRadius: 24,
                                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <Text style={{ color: theme.text, fontSize: 24, fontWeight: '600' }}>›</Text>
                            </TouchableOpacity>

                            <View style={{
                                backgroundColor: mode === 'dark' ? 'rgba(55,65,81,0.6)' : 'rgba(255,255,255,0.85)',
                                borderRadius: 20, padding: isMobile ? 14 : 20, borderWidth: 1,
                                borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                shadowColor: theme.shadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 28, elevation: 10,
                            }}>
                                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
                                    <View style={{ backgroundColor: '#1a1a1a', borderRadius: 10, borderWidth: 3, borderColor: '#333', overflow: 'hidden' }}>
                                        <Image
                                            source={DYNAMIC_SCREENSHOTS[activeSlide]?.image_url?.startsWith('http')
                                                ? { uri: DYNAMIC_SCREENSHOTS[activeSlide].image_url }
                                                : SCREENSHOTS[activeSlide % SCREENSHOTS.length].image
                                            }
                                            resizeMode="contain"
                                            style={{ width: '100%', height: isMobile ? 220 : 380, backgroundColor: '#1a1a1a' }}
                                        />
                                    </View>
                                </Animated.View>
                                <Animated.View style={{ marginTop: 16, opacity: fadeAnim }}>
                                    <Text style={{ color: theme.text, fontSize: isMobile ? 16 : 20, fontWeight: '700', textAlign: 'center', marginBottom: 4 }}>{DYNAMIC_SCREENSHOTS[activeSlide]?.title}</Text>
                                    <Text style={{ color: theme.textSecondary, fontSize: isMobile ? 12 : 14, textAlign: 'center' }}>{DYNAMIC_SCREENSHOTS[activeSlide]?.subtitle}</Text>
                                </Animated.View>
                                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 16 }}>
                                    {DYNAMIC_SCREENSHOTS.map((_, index) => (
                                        <TouchableOpacity key={index} onPress={() => animateSlideChange(index)} style={{ width: activeSlide === index ? 28 : 12, height: 10, borderRadius: 5, backgroundColor: activeSlide === index ? theme.primary : theme.textSecondary, opacity: activeSlide === index ? 1 : 0.4 }} />
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Target Audience */}
                <View
                    onLayout={(e) => { sectionRefs.current['audience'] = e.nativeEvent.layout.y; }}
                    style={{ ...sectionStyle, paddingTop: SECTION_PADDING, paddingBottom: SECTION_PADDING }}
                >
                    <Text style={{ color: theme.text, fontSize: isMobile ? 24 : 28, fontWeight: '800', textAlign: 'center', marginBottom: 28 }}>Feito para</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
                        {DYNAMIC_TARGET_AUDIENCE.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                activeOpacity={0.95}
                                onPressIn={() => isWeb && setHoveredChip(index)}
                                onPressOut={() => isWeb && setHoveredChip(null)}
                                style={{
                                    backgroundColor: hoveredChip === index ? theme.drawerActiveBackground : theme.card,
                                    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
                                    borderColor: hoveredChip === index ? theme.primary : theme.border,
                                    width: isMobile ? '100%' as any : '18%' as any, minWidth: isMobile ? undefined : 160, maxWidth: isMobile ? undefined : 200,
                                    minHeight: 90, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
                                    transform: [{ scale: hoveredChip === index ? 1.02 : 1 }],
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{item.label}</Text>
                                </View>
                                <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 16 }} numberOfLines={2}>{item.benefit}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Social Proof */}
                <View style={{ backgroundColor: mode === 'dark' ? '#0F172A' : '#EFF6FF', paddingTop: SECTION_PADDING - 8, paddingBottom: SECTION_PADDING - 8 }}>
                    <View style={sectionStyle}>
                        <Text style={{ color: theme.text, fontSize: isMobile ? 22 : 26, fontWeight: '800', textAlign: 'center', marginBottom: 24 }}>Números que crescem</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: isMobile ? 24 : 48 }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: theme.primary, fontSize: isMobile ? 32 : 40, fontWeight: '800' }}>{DYNAMIC_SOCIAL_PROOF.companies}</Text>
                                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Empresas</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: theme.primary, fontSize: isMobile ? 32 : 40, fontWeight: '800' }}>{DYNAMIC_SOCIAL_PROOF.transactions}</Text>
                                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Lançamentos/mês</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: theme.primary, fontSize: isMobile ? 32 : 40, fontWeight: '800' }}>{DYNAMIC_SOCIAL_PROOF.satisfaction}</Text>
                                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Satisfação</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Plans Section */}
                <View
                    onLayout={(e) => { sectionRefs.current['plans'] = e.nativeEvent.layout.y; }}
                    style={{ ...sectionStyle, paddingTop: SECTION_PADDING, paddingBottom: SECTION_PADDING }}
                >
                    <Text style={{ color: theme.text, fontSize: isMobile ? 24 : 28, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>Conheça nossos planos</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>Escolha o plano ideal para seu negócio</Text>

                    {/* Billing Toggle */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                        <Text style={{ color: !yearlyBilling ? theme.text : theme.textSecondary, fontWeight: '600', fontSize: 14 }}>Mensal</Text>
                        <TouchableOpacity
                            onPress={() => setYearlyBilling(!yearlyBilling)}
                            style={{
                                width: 56, height: 28, borderRadius: 14,
                                backgroundColor: yearlyBilling ? theme.primary : theme.border,
                                justifyContent: 'center', paddingHorizontal: 3,
                            }}
                        >
                            <View style={{
                                width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
                                alignSelf: yearlyBilling ? 'flex-end' : 'flex-start',
                            }} />
                        </TouchableOpacity>
                        <Text style={{ color: yearlyBilling ? theme.text : theme.textSecondary, fontWeight: '600', fontSize: 14 }}>Anual</Text>
                    </View>

                    {/* Plan Cards */}
                    <View style={{ flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, alignItems: 'stretch' }}>
                        {DYNAMIC_PLANS.map((plan, index) => (
                            <TouchableOpacity
                                key={index}
                                activeOpacity={0.95}
                                onPressIn={() => isWeb && setHoveredPlan(index)}
                                onPressOut={() => isWeb && setHoveredPlan(null)}
                                style={{
                                    backgroundColor: theme.card,
                                    borderRadius: 20, padding: 24,
                                    width: isMobile ? '100%' as any : 280,
                                    minWidth: isMobile ? undefined : 260,
                                    borderWidth: plan.recommended ? 3 : 2,
                                    borderColor: plan.recommended ? theme.accent : (hoveredPlan === index ? theme.primary : theme.border),
                                    shadowColor: plan.recommended ? theme.accent : theme.shadow,
                                    shadowOffset: { width: 0, height: plan.recommended ? 12 : 6 },
                                    shadowOpacity: plan.recommended ? 0.25 : 0.12,
                                    shadowRadius: plan.recommended ? 24 : 16,
                                    elevation: plan.recommended ? 12 : 6,
                                    transform: [{ scale: hoveredPlan === index ? 1.02 : (plan.recommended ? 1.02 : 1) }],
                                }}
                            >
                                {plan.recommended && (
                                    <View style={{ position: 'absolute', top: -14, left: '50%', marginLeft: -60, backgroundColor: theme.accent, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 }}>
                                        <Text style={{ color: '#111', fontSize: 12, fontWeight: '700' }}>⭐ Mais escolhido</Text>
                                    </View>
                                )}
                                <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 4, marginTop: plan.recommended ? 8 : 0 }}>{plan.name}</Text>
                                <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 16 }}>{plan.description}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 20, gap: 4 }}>
                                    <Text style={{ color: theme.text, fontSize: 14 }}>R$ </Text>
                                    <Text style={{ color: theme.text, fontSize: 34, fontWeight: '800' }}>
                                        {yearlyBilling ? plan.yearlyPrice.toFixed(2).replace('.', ',') : plan.monthlyPrice.toFixed(2).replace('.', ',')}
                                    </Text>
                                    <Text style={{ color: theme.textSecondary, fontSize: 14 }}>/{yearlyBilling ? 'ano' : 'mês'}</Text>
                                    {yearlyBilling && plan.savingsBadge && (
                                        <View style={{ backgroundColor: theme.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 }}>
                                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{plan.savingsBadge}</Text>
                                        </View>
                                    )}
                                </View>
                                {plan.features.map((feat, i) => (
                                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                        <Text style={{ color: theme.primary, fontSize: 16 }}>✓</Text>
                                        <Text style={{ color: theme.text, fontSize: 14 }}>{feat}</Text>
                                    </View>
                                ))}
                                <TouchableOpacity
                                    onPress={onRegister}
                                    style={{
                                        backgroundColor: plan.recommended ? theme.accent : 'transparent',
                                        borderWidth: plan.recommended ? 0 : 2,
                                        borderColor: theme.primary,
                                        paddingVertical: 14, borderRadius: 12, marginTop: 16,
                                    }}
                                >
                                    <Text style={{ color: plan.recommended ? '#111' : theme.primary, fontWeight: '700', fontSize: 15, textAlign: 'center' }}>
                                        Começar {trialDays} dias grátis
                                    </Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Evolution Section */}
                <View style={{ backgroundColor: mode === 'dark' ? '#111827' : '#F3F4F6', paddingTop: SECTION_PADDING, paddingBottom: SECTION_PADDING }}>
                    <View style={sectionStyle}>
                        <View
                            style={{
                                flexDirection: isDesktop ? 'row' : 'column',
                                alignItems: isDesktop ? 'stretch' : 'center',
                                gap: isDesktop ? 56 : 28,
                            }}
                        >
                            <View style={{ flex: isDesktop ? 1 : undefined, width: '100%', maxWidth: isDesktop ? 560 : undefined, justifyContent: isDesktop ? 'space-between' : undefined }}>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ color: theme.text, fontSize: isMobile ? 24 : 28, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>Em constante evolução</Text>
                                    <Text style={{ color: theme.textSecondary, fontSize: 14, textAlign: 'center', maxWidth: 520, alignSelf: 'center', marginBottom: 24, lineHeight: 22 }}>
                                        Recebemos sugestões dos usuários e lançamos melhorias de forma contínua.
                                    </Text>
                                </View>
                                <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 24, maxWidth: isDesktop ? 520 : 480, alignSelf: 'center', width: '100%', borderWidth: 1, borderColor: theme.border }}>
                                    {DYNAMIC_EVOLUTION_POINTS.map((point, index) => (
                                        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: index < DYNAMIC_EVOLUTION_POINTS.length - 1 ? 14 : 0 }}>
                                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: mode === 'dark' ? 'rgba(22,163,74,0.2)' : 'rgba(22,163,74,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '700' }}>✓</Text>
                                            </View>
                                            <Text style={{ color: theme.text, fontSize: 14, flex: 1 }}>{point}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            <View style={{ flex: isDesktop ? 1 : undefined, width: '100%', maxWidth: isDesktop ? 520 : undefined, alignItems: 'center', justifyContent: isDesktop ? 'space-between' : undefined }}>
                                <Text style={{ color: theme.text, fontSize: isMobile ? 22 : 26, fontWeight: '800', textAlign: 'center' }}>Pronto para organizar seu caixa?</Text>
                                <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', flex: isDesktop ? 1 : undefined, paddingVertical: isDesktop ? 0 : 18 }}>
                                    <TouchableOpacity
                                        onPress={onRegister}
                                        style={{ backgroundColor: theme.accent, paddingHorizontal: 36, paddingVertical: 18, borderRadius: 14, shadowColor: theme.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8, alignSelf: 'center' }}
                                    >
                                        <Text style={{ color: '#111', fontWeight: '800', fontSize: 18 }}>Comece agora – {trialDays} dias grátis</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
                                    {SECURITY_BADGES.map((badge, index) => (
                                        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: theme.border }}>
                                            <Text style={{ fontSize: 16 }}>{badge.icon}</Text>
                                            <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500' }}>{badge.label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Final CTA */}
                <View style={{ ...sectionStyle, paddingTop: SECTION_PADDING, paddingBottom: SECTION_PADDING - 8 }}>
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'flex-start' : 'stretch', justifyContent: 'space-between', gap: isDesktop ? 56 : 28 }}>
                        <View style={{ flex: isDesktop ? 1 : undefined, maxWidth: isDesktop ? 520 : undefined }}>
                            <View style={{ paddingVertical: 6 }}>
                                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 26, textAlign: 'center' }}>Desenvolvidos por JNC Tecnologia.</Text>
                                <View style={{ flexDirection: 'row', flexWrap: (isDesktop ? 'nowrap' : 'wrap') as any, justifyContent: 'center', alignItems: 'center', gap: isDesktop ? 0 : 4, alignSelf: 'center' }}>
                                    {[
                                        {
                                            dark: 'https://i.im.ge/2025/11/02/nzgjAc.Logo-White.png',
                                            light: 'https://i.im.ge/2025/11/03/nH0whJ.Logo-Black.png',
                                            link: 'https://fastcashflow.vercel.app/',
                                            tooltip: '',
                                        },
                                        {
                                            dark: 'https://i.im.ge/2025/12/20/BSw0fS.JusJNC-White.png',
                                            light: 'https://i.im.ge/2025/12/20/BSwiNy.JusJNC-Black.png',
                                            link: '',
                                            tooltip: 'Sistema em produção - Gerenciador de Escritórios',
                                        },
                                        {
                                            dark: 'https://i.im.ge/2025/10/18/nRo1MP.Logo-transparente.png',
                                            light: 'https://i.im.ge/2025/10/18/nRo1MP.Logo-transparente.png',
                                            link: 'https://www.nevesecosta.com.br/',
                                            tooltip: '',
                                        },
                                        {
                                            dark: 'https://i.im.ge/2025/12/21/BDiDfm.Animes-JNC.png',
                                            light: 'https://i.im.ge/2025/12/21/BDiDfm.Animes-JNC.png',
                                            link: 'https://www.instagram.com/animesjnc/',
                                            tooltip: '',
                                        },
                                        {
                                            dark: require('../../Fast Savory\'s.png'),
                                            light: require('../../Fast Savory\'s.png'),
                                            link: 'https://fastsavorys.vercel.app/pages/fast.html',
                                            isLocal: true,
                                            tooltip: '',
                                        },
                                    ].map((logo, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            onPress={() => {
                                                if (logo.link) {
                                                    if (Platform.OS === 'web') {
                                                        window.open(logo.link, '_blank');
                                                    } else {
                                                        Linking.openURL(logo.link);
                                                    }
                                                } else if (logo.tooltip) {
                                                    setTooltipVisible(!tooltipVisible);
                                                }
                                            }}
                                            style={{ opacity: 1 }}
                                        >
                                            <Image
                                                source={(logo as any).isLocal ? (mode === 'dark' ? logo.dark : logo.light) : { uri: mode === 'dark' ? logo.dark : logo.light }}
                                                resizeMode="contain"
                                                style={{
                                                    width: isDesktop
                                                        ? (idx === 0 ? 120 : (idx === 1 ? 130 : (idx === 2 ? 150 : (idx === 3 ? 120 : 110))))
                                                        : (idx === 0 ? 90 : (idx === 1 ? 96 : (idx === 2 ? 110 : (idx === 3 ? 90 : 80)))),
                                                    height: idx === 0 ? 34 : (idx === 1 ? 50 : (idx === 2 ? 56 : (idx === 3 ? 42 : 50))),
                                                    marginLeft: isDesktop && idx > 0 ? -14 : 0,
                                                }}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {/* Inline Tooltip Card */}
                                {tooltipVisible && (
                                    <View style={{
                                        marginTop: 16,
                                        backgroundColor: mode === 'dark' ? '#374151' : '#FEF3C7',
                                        borderRadius: 10,
                                        padding: 14,
                                        alignSelf: 'center',
                                        maxWidth: 360,
                                        borderWidth: 1,
                                        borderColor: mode === 'dark' ? '#4B5563' : '#F59E0B',
                                    }}>
                                        <Text style={{ color: mode === 'dark' ? '#FCD34D' : '#92400E', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                                            🚧 Sistema em produção - Gerenciador de Escritórios
                                        </Text>
                                        <TouchableOpacity onPress={() => setTooltipVisible(false)} style={{ position: 'absolute', top: 6, right: 10 }}>
                                            <Text style={{ color: mode === 'dark' ? '#9CA3AF' : '#92400E', fontSize: 16 }}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={{ flex: isDesktop ? 1 : undefined, maxWidth: isDesktop ? 240 : undefined, alignItems: isDesktop ? 'flex-start' : 'center' }}>
                            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 14 }}>Links</Text>
                            <View style={{ gap: 10, alignItems: isDesktop ? 'flex-start' : 'center' }}>
                                <TouchableOpacity onPress={() => scrollToSection('features')}><Text style={{ color: theme.textSecondary, fontSize: 14 }}>Como Funciona</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => scrollToSection('plans')}><Text style={{ color: theme.textSecondary, fontSize: 14 }}>Planos</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => scrollToSection('audience')}><Text style={{ color: theme.textSecondary, fontSize: 14 }}>Pra Quem</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => setCurrentPage('terms')}><Text style={{ color: theme.textSecondary, fontSize: 14 }}>Termos de Uso</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => setCurrentPage('privacy')}><Text style={{ color: theme.textSecondary, fontSize: 14 }}>Privacidade</Text></TouchableOpacity>
                            </View>
                        </View>

                        <View style={{ flex: isDesktop ? 1 : undefined, maxWidth: isDesktop ? 260 : undefined, alignItems: isDesktop ? 'flex-start' : 'center' }}>
                            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 14 }}>Contato</Text>
                            <View style={{ gap: 10, alignItems: isDesktop ? 'flex-start' : 'center' }}>
                                <Text style={{ color: theme.textSecondary, fontSize: 14 }}>contato@nevesecosta.com.br</Text>
                                <Text style={{ color: theme.textSecondary, fontSize: 14 }}>(73) 99934-8552</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: 24, alignItems: 'center', marginTop: 16 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 13 }}>© {settings.footer_year || 2025} Fast Cash Flow. Todos os direitos reservados.</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 0 }}>
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{settings.footer_company_text || 'Um produto da marca'}</Text>
                        <Image
                            source={{ uri: settings.footer_logo_url || 'https://i.im.ge/2025/12/20/BSwhSJ.JNC.png' }}
                            resizeMode="contain"
                            style={{ width: 82, height: 22, marginLeft: -18 }}
                        />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
