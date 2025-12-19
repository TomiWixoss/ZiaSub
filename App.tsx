import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider, MD3DarkTheme } from "react-native-paper";
import { COLORS } from "@constants/colors";
import HomeScreen from "@screens/HomeScreen";

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    surface: COLORS.surface,
    onSurface: COLORS.text,
    surfaceVariant: COLORS.surfaceLight,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <HomeScreen />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
