import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { translate, type Locale, type TranslationKey } from '@marketplace/shared';
import { supabase } from './supabase';

const STORAGE_KEY = 'locale';

interface I18nState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nState | null>(null);

function deviceLocale(): Locale {
  const code = getLocales()[0]?.languageCode;
  return code === 'kk' ? 'kk' : 'ru';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(deviceLocale());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'ru' || v === 'kk') setLocaleState(v);
    }).catch(() => {});
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) supabase.from('profiles').update({ locale: l }).eq('id', data.user.id).then(() => {});
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale],
  );

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
