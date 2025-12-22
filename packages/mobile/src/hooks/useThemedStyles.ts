import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTheme, ThemeColors } from "@src/contexts";

type StyleFactory<T> = (colors: ThemeColors, isDark: boolean) => T;

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  styleFactory: StyleFactory<T>
): T {
  const { colors, isDark } = useTheme();
  return useMemo(
    () => styleFactory(colors, isDark),
    [colors, isDark, styleFactory]
  );
}

export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  styleFactory: StyleFactory<T>
): StyleFactory<T> {
  return styleFactory;
}
