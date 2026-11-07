import { translations, type Language } from "@/lib/i18n";

// Keep existing validation feedback translated when the visitor switches language.
export function translateAuthMessage(message: string, language: Language): string {
  const key = (Object.keys(translations.ar.auth) as (keyof typeof translations.ar.auth)[])
    .find(key => translations.ar.auth[key] === message || translations.en.auth[key] === message);
  return key ? translations[language].auth[key] : message;
}
