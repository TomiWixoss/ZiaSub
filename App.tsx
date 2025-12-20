import React, {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { ThemeProvider, useTheme } from "@src/contexts";
import { AlertProvider } from "@components/common/CustomAlert";
import HomeScreen from "@screens/HomeScreen";
import { OnboardingScreen } from "@components/onboarding";
import { initI18n } from "@i18n/index";
import { getOnboardingCompleted, setOnboardingCompleted } from "@utils/storage";
import { updateService, UpdateCheckResult } from "@services/updateService";
import { UpdateModal } from "@components/common/UpdateModal";

// Update Context
interface UpdateContextType {
  hasUpdate: boolean;
  updateResult: UpdateCheckResult | null;
  showUpdateModal: () => void;
  dismissUpdate: () => void;
}

const UpdateContext = createContext<UpdateContextType>({
  hasUpdate: false,
  updateResult: null,
  showUpdateModal: () => {},
  dismissUpdate: () => {},
});

export const useUpdate = () => useContext(UpdateContext);

const AppContent = () => {
  const { colors, isDark } = useTheme();
  const [isI18nReady, setIsI18nReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(
    null
  );

  useEffect(() => {
    const init = async () => {
      const [, onboardingCompleted] = await Promise.all([
        initI18n(),
        getOnboardingCompleted(),
      ]);
      setIsI18nReady(true);
      setShowOnboarding(!onboardingCompleted);

      // Check for updates after app loads
      if (onboardingCompleted) {
        const result = await updateService.checkForUpdate();
        setUpdateResult(result);
        if (result.hasUpdate) {
          setHasUpdate(true);
          setUpdateModalVisible(true);
        }
      }
    };
    init();
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    await setOnboardingCompleted(true);
    setShowOnboarding(false);

    // Check for updates after onboarding
    const result = await updateService.checkForUpdate();
    setUpdateResult(result);
    if (result.hasUpdate) {
      setHasUpdate(true);
      setUpdateModalVisible(true);
    }
  }, []);

  const showUpdateModalHandler = useCallback(() => {
    setUpdateModalVisible(true);
  }, []);

  const dismissUpdate = useCallback(() => {
    // Keep hasUpdate true so badge still shows, just close modal
    setUpdateModalVisible(false);
  }, []);

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

  const updateContextValue: UpdateContextType = {
    hasUpdate,
    updateResult,
    showUpdateModal: showUpdateModalHandler,
    dismissUpdate,
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
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </PaperProvider>
    );
  }

  return (
    <UpdateContext.Provider value={updateContextValue}>
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
    </UpdateContext.Provider>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
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
