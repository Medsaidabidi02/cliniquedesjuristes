import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import en from './locales/en/translation.json';
import fr from './locales/fr/translation.json';
import ar from './locales/ar/translation.json';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ar: { translation: ar },
};

// Try to read stored language (safe for SSR)
const stored = (() => {
  try {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem('i18nextLng') || undefined;
  } catch {
    return undefined;
  }
})();

// Force default to French when nothing is stored
const DEFAULT_LANG = 'fr';
const initialLang = stored || DEFAULT_LANG;

// Persist default into localStorage so other parts see it consistently
try {
  if (typeof window !== 'undefined' && !stored) {
    localStorage.setItem('i18nextLng', DEFAULT_LANG);
  }
} catch {
  // ignore
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    // Use stored language if present, otherwise default to French
    lng: initialLang,
    fallbackLng: 'fr',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

// Ensure html lang/dir reflect the selected language
try {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = i18n.language || DEFAULT_LANG;
    document.documentElement.dir = (i18n.language || DEFAULT_LANG) === 'ar' ? 'rtl' : 'ltr';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('i18nextLng', i18n.language || DEFAULT_LANG);
    }
  }
} catch {
  // ignore
}

export default i18n;