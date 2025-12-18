import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'FAST CASH FLOW',
  slug: 'fast-cash-flow',
  scheme: 'fastcashflow',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.fastcashflow.app',
  },
  android: {
    package: 'com.fastcashflow.app',
  },
  web: {
    bundler: 'metro',
    display: 'standalone' as any,
    themeColor: '#111111' as any,
    backgroundColor: '#000000' as any,
    name: 'FAST CASH FLOW' as any,
    shortName: 'FastCashFlow' as any,
    favicon: './assets/favicon.png' as any,
  },
  plugins: ['expo-secure-store'],
  extra: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    eas: {
      projectId: '415b059b-1666-4df8-8456-48d8509324c0',
    },
  },
};

export default config;
