import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  AppState,
  AppStateStatus,
} from "react-native";
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
import { cacheService } from "@services/cacheService";
import { keyManager } from "@services/keyManager";

type InitState = "loading" | "onboarding" | "ready" | "error";

const AppContent = () => {
  const { colors, isDark } = useTheme();
  const [initState, setInitState] = useState<InitState>("loading");
  const [loadingMessage, setLoadingMessage] = useState("Đang khởi động...");
  const appState = useRef(AppState.currentState);
  const {
    updateModalVisible,
    setUpdateModalVisible,
    updateResult,
    dismissUpdate,
    checkForUpdate,
  } = useUpdate();

  // Handle app state changes - flush cache when going to background
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // App is going to background, flush pending writes immediately
        console.log("[App] Going to background, flushing cache...");
        await cacheService.forceFlush();
        console.log("[App] Cache flushed");
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        // Step 1: Initialize i18n
        setLoadingMessage("Đang tải ngôn ngữ...");
        await initI18n();

        // Step 2: Check onboarding status
        setLoadingMessage("Đang kiểm tra cài đặt...");
        const onboardingCompleted = await getOnboardingCompleted();

        // Step 3: Initialize file storage
        setLoadingMessage("Đang kết nối lưu trữ...");
        const storageReady = await fileStorage.initialize();

        // If onboarding not completed or storage not ready, show onboarding
        if (!onboardingCompleted || !storageReady) {
          setInitState("onboarding");
          return;
        }

        // Step 4: Initialize cache with all data from files
        setLoadingMessage("Đang tải dữ liệu...");
        await cacheService.initialize(fileStorage);

        // Step 5: Preload translations data
        setLoadingMessage("Đang tải bản dịch...");
        await cacheService.preloadTranslations(fileStorage);

        // Step 6: Initialize keyManager with API keys from cache
        setLoadingMessage("Đang khởi tạo API keys...");
        const apiKeys = cacheService.getApiKeys();
        if (apiKeys.length > 0) {
          keyManager.initialize(apiKeys);
        }

        // All done!
        setInitState("ready");

        // Check for updates in background
        setTimeout(() => checkForUpdate(), 1000);
      } catch (error) {
        console.error("App initialization error:", error);
        setInitState("error");
      }
    };

    init();
  }, [checkForUpdate]);

  const handleOnboardingComplete = useCallback(async () => {
    try {
      setInitState("loading");
      setLoadingMessage("Đang hoàn tất cài đặt...");

      await setOnboardingCompleted(true);

      // Initialize cache after onboarding
      setLoadingMessage("Đang tải dữ liệu...");
      await cacheService.initialize(fileStorage);

      // Preload translations
      setLoadingMessage("Đang tải bản dịch...");
      await cacheService.preloadTranslations(fileStorage);

      // Initialize keyManager
      setLoadingMessage("Đang khởi tạo API keys...");
      const apiKeys = cacheService.getApiKeys();
      if (apiKeys.length > 0) {
        keyManager.initialize(apiKeys);
      }

      setInitState("ready");

      // Check for updates
      setTimeout(() => checkForUpdate(), 1000);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setInitState("error");
    }
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

  // Loading state
  if (initState === "loading") {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {loadingMessage}
        </Text>
      </View>
    );
  }

  // Error state
  if (initState === "error") {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.error }]}>
          Có lỗi xảy ra khi khởi động app
        </Text>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Vui lòng khởi động lại
        </Text>
      </View>
    );
  }

  // Onboarding state
  if (initState === "onboarding") {
    return (
      <PaperProvider theme={paperTheme}>
        <AlertProvider>
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        </AlertProvider>
      </PaperProvider>
    );
  }

  // Ready state
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
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
