import React, { useEffect, useState, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import {
  ThemeProvider,
  useTheme,
  UpdateProvider,
  useUpdate,
} from "@src/contexts";
import { AlertProvider } from "@components/common/CustomAlert";
import HomeScreen from "@screens/HomeScreen";
import { OnboardingScreen } from "@components/onboarding";
import { initI18n } from "@i18n/index";
import { getOnboardingCompleted, setOnboardingCompleted } from "@utils/storage";
import { UpdateModal } from "@components/common/UpdateModal";
import { fileStorage } from "@services/fileStorageService";

const AppContent = () => {
  const { colors, isDark } = useTheme();
  const [isI18nReady, setIsI18nReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const {
    updateModalVisible,
    setUpdateModalVisible,
    updateResult,
    dismissUpdate,
    checkForUpdate,
  } = useUpdate();

  useEffect(() => {
    const init = async () => {
      // Initialize file storage first
      const storageReady = await fileStorage.initialize();

      const [, onboardingCompleted] = await Promise.all([
        initI18n(),
        getOnboardingCompleted(),
      ]);
      setIsI18nReady(true);

      // Show onboarding if not completed OR if storage is not configured
      setShowOnboarding(!onboardingCompleted || !storageReady);

      // Check for updates after app loads
      if (onboardingCompleted && storageReady) {
        checkForUpdate();
      }
    };
    init();
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    await setOnboardingCompleted(true);
    setShowOnboarding(false);

    // Check for updates after onboarding
    checkForUpdate();
  }, [checkForUpdate]);

  const paperTheme = {
    ...(isDark ? MD3DarkTheme : MD3LightTheme),
    colors: {
      ...(isDark ? MD3DarkTheme.colors : MD3LightTheme.colors),
      primary: colors.primary,
      background: colors.background,
      surface: colors.surface,
      onSurface: colors.text,
      surfaceVariant: colors.surfaceLight,
    },
  };

  if (!isI18nReady || showOnboarding === null) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <PaperProvider theme={paperTheme}>
        <AlertProvider>
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        </AlertProvider>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <AlertProvider>
        <HomeScreen />
        <UpdateModal
          visible={updateModalVisible}
          onClose={() => setUpdateModalVisible(false)}
          updateResult={updateResult}
          onDismissUpdate={dismissUpdate}
        />
      </AlertProvider>
    </PaperProvider>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <UpdateProvider>
          <AppContent />
        </UpdateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
