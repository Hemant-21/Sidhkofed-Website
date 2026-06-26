'use client';

/**
 * Language + accessibility text-size context (codex §6/§7). Holds the active UI
 * language (English primary, Hindi optional) and a font-size scale driven by the
 * accessibility controls. Both persist to localStorage and reflect onto the
 * document: `<html lang>` for screen readers and `--font-size-scale` for resizing.
 *
 * Note: editorial content language is handled per-field via `pickText`; this
 * provider governs the UI string language and the visitor's text-size preference.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { env } from '@/config/env';
import { translate, type Language } from '@/i18n/dictionary';

const LANG_KEY = 'sidhkofed.lang';
const SCALE_KEY = 'sidhkofed.fontScale';
const MIN_SCALE = 0.875;
const MAX_SCALE = 1.5;
const STEP = 0.125;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  fontScale: number;
  increaseFont: () => void;
  decreaseFont: () => void;
  resetFont: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const clamp = (n: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(n * 1000) / 1000));

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(env.defaultLanguage);
  const [fontScale, setFontScale] = useState<number>(1);

  // Hydrate persisted preferences on mount (client only).
  useEffect(() => {
    const storedLang = window.localStorage.getItem(LANG_KEY);
    if (storedLang === 'en' || storedLang === 'hi') setLanguageState(storedLang);
    const storedScale = Number(window.localStorage.getItem(SCALE_KEY));
    if (!Number.isNaN(storedScale) && storedScale > 0) setFontScale(clamp(storedScale));
  }, []);

  // Reflect language onto <html lang> and persist.
  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(LANG_KEY, language);
  }, [language]);

  // Reflect text-size scale onto the CSS variable and persist.
  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-scale', String(fontScale));
    window.localStorage.setItem(SCALE_KEY, String(fontScale));
  }, [fontScale]);

  const setLanguage = useCallback((lang: Language) => setLanguageState(lang), []);
  const toggleLanguage = useCallback(() => setLanguageState((l) => (l === 'en' ? 'hi' : 'en')), []);
  const increaseFont = useCallback(() => setFontScale((s) => clamp(s + STEP)), []);
  const decreaseFont = useCallback(() => setFontScale((s) => clamp(s - STEP)), []);
  const resetFont = useCallback(() => setFontScale(1), []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t: (key: string) => translate(language, key),
      fontScale,
      increaseFont,
      decreaseFont,
      resetFont,
    }),
    [language, setLanguage, toggleLanguage, fontScale, increaseFont, decreaseFont, resetFont],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within <LanguageProvider>');
  return ctx;
}

/** Shorthand for the translate function alone. */
export function useT(): (key: string) => string {
  return useLanguage().t;
}
