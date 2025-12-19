import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { changeLanguage, supportedLanguages } from "@src/i18n";

export const useLanguage = () => {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language;

  const setLanguage = useCallback(async (languageCode: string) => {
    await changeLanguage(languageCode);
  }, []);

  const getCurrentLanguageName = useCallback(() => {
    const lang = supportedLanguages.find((l) => l.code === currentLanguage);
    return lang?.nativeName || currentLanguage;
  }, [currentLanguage]);

  return {
    currentLanguage,
    setLanguage,
    supportedLanguages,
    getCurrentLanguageName,
  };
};
