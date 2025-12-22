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
import { KeyboardProvider } from "react-native-keyboard-controller";
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
import { UpdateModal } from "@components/common/UpdateModal";
import { storageService } from "@services/storageService";
import { backupService } from "@services/backupService";
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

  // Handle app state changes - auto backup when going to background
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // App is going to background, auto backup if enabled
        console.log("[App] Going to background...");
        try {
          const autoBackupEnabled = await storageService.isAutoBackupEnabled();
          const backupPath = await storageService.getBackupPath();
          if (autoBackupEnabled && backupPath) {
            console.log("[App] Auto backup enabled, creating backup...");
            await backupService.createBackup();
            console.log("[App] Auto backup completed");
          }
        } catch (error) {
          console.error("[App] Auto backup error:", error);
        }
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

        // Step 2: Initialize storage service
        setLoadingMessage("Đang tải dữ liệu...");
        await storageService.initialize();

        // Step 3: Check onboarding status
        setLoadingMessage("Đang kiểm tra cài đặt...");
        const onboardingCompleted =
          await storageService.getOnboardingCompleted();

        // If onboarding not completed, show onboarding
        if (!onboardingCompleted) {
          setInitState("onboarding");
          return;
        }

        // Step 4: Initialize keyManager with API keys
        setLoadingMessage("Đang khởi tạo API keys...");
        const apiKeys = storageService.getApiKeys();
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

      await storageService.setOnboardingCompleted(true);

      // Re-initialize storage to pick up any restored data
      setLoadingMessage("Đang tải dữ liệu...");
      await storageService.initialize();

      // Initialize keyManager
      setLoadingMessage("Đang khởi tạo API keys...");
      const apiKeys = storageService.getApiKeys();
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
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <ThemeProvider>
          <UpdateProvider>
            <AppContent />
          </UpdateProvider>
        </ThemeProvider>
      </KeyboardProvider>
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
