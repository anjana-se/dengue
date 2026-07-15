import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { STR, type Lang, type StringKey } from "./strings";

const STORAGE_KEY = "dg.lang";

function initialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "si" || saved === "ta") return saved;
  // Fall back to the browser's preferred language when it is one we support.
  const nav = window.navigator.language.slice(0, 2).toLowerCase();
  if (nav === "si" || nav === "ta") return nav;
  return "en";
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Translate a key in the current language, falling back to English. */
  t: (key: StringKey) => string;
  /** The full dictionary for the current language. */
  L: Record<StringKey, string>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage can be unavailable (private mode); language still switches for the session.
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const dict = STR[lang] ?? STR.en;
    return {
      lang,
      setLang,
      L: dict,
      t: (key) => dict[key] ?? STR.en[key],
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <LanguageProvider>");
  return ctx;
}
