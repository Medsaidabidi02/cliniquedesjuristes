import React, { useState, useEffect, useRef } from 'react';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
import '../styles/language-switcher.css';

type LangDef = {
  code: string;
  label: string;
  svg: React.ReactNode;
};

const FrFlag = (
  <svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden focusable="false">
    <title>Français</title>
    <rect width="1" height="2" x="0" fill="#0055A4" />
    <rect width="1" height="2" x="1" fill="#FFFFFF" />
    <rect width="1" height="2" x="2" fill="#EF4135" />
  </svg>
);

const UkFlag = (
  <svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden focusable="false">
    <title>English</title>
    <rect width="60" height="30" fill="#012169" />
    <path d="M0 0 L60 30 M60 0 L0 30" stroke="#fff" strokeWidth="6"/>
    <path d="M0 0 L60 30 M60 0 L0 30" stroke="#C8102E" strokeWidth="4"/>
    <rect x="25" width="10" height="30" fill="#fff" />
    <rect y="10" width="60" height="10" fill="#fff" />
    <rect x="26.5" width="7" height="30" fill="#C8102E" />
    <rect y="11.5" width="60" height="7" fill="#C8102E" />
  </svg>
);

const TnFlag = (
  <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden focusable="false">
    <title>العربية</title>
    <path fill="#E70013" d="M32 5H4a4 4 0 0 0-4 4v18a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4z"></path>
    <circle fill="#FFF" cx="18" cy="18" r="6.5"></circle>
    <path fill="#E70013" d="M15.4 18a3.9 3.9 0 0 1 6.541-2.869a4.875 4.875 0 1 0 0 5.738A3.9 3.9 0 0 1 15.4 18z"></path>
    <path fill="#E70013" d="M19.645 16.937l-1.249-1.719v2.125L16.375 18l2.021.657v2.125l1.249-1.719l2.021.656L20.417 18l1.249-1.719z"></path>
  </svg>
);

const LANGS: LangDef[] = [
  { code: 'fr', label: 'Français', svg: FrFlag },
  { code: 'en', label: 'English', svg: UkFlag },
  { code: 'ar', label: 'العربية', svg: TnFlag },
];

const LanguageSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // Use i18n.language (it will be 'fr' by default based on i18n.ts)
  const current = i18n.language || (typeof window !== 'undefined' ? (localStorage.getItem('i18nextLng') || 'fr') : 'fr');

  const changeLanguage = (lng: string) => {
    if (!lng) return;
    i18n.changeLanguage(lng);
    try { localStorage.setItem('i18nextLng', lng); } catch {}
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', lng === 'ar');
    setOpen(false);
  };

  const currentLang = LANGS.find(l => l.code === current) || LANGS[0];

  return (
    <div
      className="language-switcher"
      ref={ref}
      aria-label={t('language_switcher', 'Language')}
      role="navigation"
    >
      <button
        type="button"
        className="flag-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('language_switcher', 'Language')}
        onClick={() => setOpen(v => !v)}
      >
        <span className="flag-svg" aria-hidden>{currentLang.svg}</span>
        <span className="flag-caret" aria-hidden>▾</span>
      </button>

      {open && (
        <div className="lang-dropdown" role="menu" aria-label={t('language_switcher', 'Language menu')}>
          {LANGS.map(l => (
            <button
              key={l.code}
              type="button"
              role="menuitem"
              className={`lang-option ${current === l.code ? 'selected' : ''}`}
              onClick={() => changeLanguage(l.code)}
            >
              <span className="lang-flag" aria-hidden>{l.svg}</span>
              <span className="lang-label">{l.label}</span>
              {current === l.code && <span className="lang-check" aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;