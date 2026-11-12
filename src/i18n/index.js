// AI-assisted: see docs/AI_LOG.md #15
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations';

// Preferencia de idioma: es de las pocas cosas que el PDF permite guardar en AsyncStorage
const LANGUAGE_KEY = '@uberclone/language';
export const SUPPORTED_LANGUAGES = ['es', 'en'];

const lookup = (dict, path) => path.split('.').reduce((node, key) => node?.[key], dict);

// t('home.title') o t('trip.eta', { min: 5 }). Si falta en inglés, cae al español; si falta en los dos, muestra la clave
export function translate(language, path, params) {
  const template = lookup(translations[language], path) ?? lookup(translations.es, path) ?? path;
  if (typeof template !== 'string' || !params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (params[key] != null ? String(params[key]) : match));
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('es');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then((saved) => {
        if (!cancelled && SUPPORTED_LANGUAGES.includes(saved)) setLanguageState(saved);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next) => {
    if (!SUPPORTED_LANGUAGES.includes(next)) return;
    setLanguageState(next);
    AsyncStorage.setItem(LANGUAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback((path, params) => translate(language, path, params), [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de LanguageProvider');
  return ctx;
}
