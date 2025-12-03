import Constants from 'expo-constants';

export const SUPABASE_URL = (Constants.expoConfig?.extra as any)?.SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = (Constants.expoConfig?.extra as any)?.SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Avoid throwing at import time in Expo; warn instead
  console.warn('Supabase env not found. Check app.config.ts and .env');
}
