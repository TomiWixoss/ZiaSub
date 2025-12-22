import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { vi, en } from "./locales";

const LANGUAGE_KEY = "@app_language";

export const resources = {
  vi: { translation: vi },
  en: { translation: en },
};

export const supportedLanguages = [
  { code: "vi", name: "Tiếng Việt", nativeName: "Tiếng Việt" },
  { code: "en", name: "English", nativeName: "English" },
];

export const getStoredLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
};

export const setStoredLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error("Failed to save language:", error);
  }
};

const getDeviceLanguage = (): string => {
  const deviceLocale = Localization.getLocales()[0]?.languageCode || "vi";
  return supportedLanguages.some((lang) => lang.code === deviceLocale)
    ? deviceLocale
    : "vi";
};

export const initI18n = async () => {
  const storedLanguage = await getStoredLanguage();
  const initialLanguage = storedLanguage || getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: "vi",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  return i18n;
};

export const changeLanguage = async (language: string) => {
  await setStoredLanguage(language);
  await i18n.changeLanguage(language);
};

export default i18n;
