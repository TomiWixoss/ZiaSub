import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeColors {
  // Base
  background: string;
  surface: string;
  surfaceLight: string;
  surfaceElevated: string;

  // Brand
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentDark: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;

  // UI Elements
  border: string;
  borderLight: string;

  // States
  success: string;
  error: string;
  warning: string;
  overlay: string;
  transparent: string;

  // Gradient
  gradientStart: string;
  gradientEnd: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const THEME_STORAGE_KEY = "@app_theme_mode";

export const darkColors: ThemeColors = {
  background: "#0D0D1A",
  surface: "#141428",
  surfaceLight: "#1E1E3A",
  surfaceElevated: "#2A2A4A",
  primary: "#9B7ED9",
  primaryDark: "#7B5FB9",
  primaryLight: "#B8A0E8",
  accent: "#6B8DD6",
  accentDark: "#4A6DB6",
  text: "#FFFFFF",
  textSecondary: "#B8B8D0",
  textMuted: "#6B6B8A",
  border: "#2E2E4A",
  borderLight: "#3E3E5A",
  success: "#7ED99B",
  error: "#E57373",
  warning: "#FFB74D",
  overlay: "rgba(13,13,26,0.85)",
  transparent: "transparent",
  gradientStart: "#9B7ED9",
  gradientEnd: "#4A6DB6",
};

export const lightColors: ThemeColors = {
  background: "#F5F5FA",
  surface: "#FFFFFF",
  surfaceLight: "#F0F0F8",
  surfaceElevated: "#E8E8F0",
  primary: "#7B5FB9",
  primaryDark: "#5A3F99",
  primaryLight: "#9B7ED9",
  accent: "#4A6DB6",
  accentDark: "#3A5D96",
  text: "#1A1A2E",
  textSecondary: "#4A4A6A",
  textMuted: "#8A8AA0",
  border: "#D0D0E0",
  borderLight: "#E0E0F0",
  success: "#4CAF50",
  error: "#E53935",
  warning: "#FB8C00",
  overlay: "rgba(0,0,0,0.5)",
  transparent: "transparent",
  gradientStart: "#9B7ED9",
  gradientEnd: "#6B8DD6",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored && ["light", "dark", "system"].includes(stored)) {
        setThemeModeState(stored as ThemeMode);
      }
      setIsLoaded(true);
    });
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === "system") {
      return systemColorScheme === "dark";
    }
    return themeMode === "dark";
  }, [themeMode, systemColorScheme]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const value = useMemo(
    () => ({
      colors,
      themeMode,
      isDark,
      setThemeMode,
    }),
    [colors, themeMode, isDark, setThemeMode]
  );

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
