import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  Keyboard,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import Button3D from "@components/common/Button3D";
import { Ionicons } from "@expo/vector-icons";
import { getApiKeys, saveApiKeys } from "@utils/storage";
import { keyManager } from "@services/keyManager";
import * as Clipboard from "expo-clipboard";

interface StepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const API_KEY_URL = "https://aistudio.google.com/app/apikey";

export const ApiKeyStep: React.FC<StepProps> = ({
  onNext,
  onPrevious,
  onSkip,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkExistingKeys();
  }, []);

  const checkExistingKeys = async () => {
    const keys = await getApiKeys();
    setHasKey(keys.length > 0);
  };

  const isValidApiKey = (key: string): boolean => {
    return key.startsWith("AIza") && key.length >= 35;
  };

  const handleAddKey = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return;

    if (!isValidApiKey(trimmedKey)) {
      setError(t("settings.apiKeys.invalidMessage"));
      return;
    }

    setIsAdding(true);
    setError("");

    try {
      const existingKeys = await getApiKeys();
      if (existingKeys.includes(trimmedKey)) {
        setError(t("settings.apiKeys.duplicateMessage"));
        setIsAdding(false);
        return;
      }

      const newKeys = [...existingKeys, trimmedKey];
      await saveApiKeys(newKeys);
      keyManager.initialize(newKeys);
      setApiKey("");
      setHasKey(true);
      Keyboard.dismiss();
    } catch (err) {
      setError(t("errors.generic"));
    } finally {
      setIsAdding(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && isValidApiKey(text.trim())) {
        setApiKey(text.trim());
        setError("");
      } else if (text) {
        setError(t("settings.apiKeys.invalidMessage"));
      }
    } catch {
      setError(t("settings.apiKeys.clipboardError"));
    }
  };

  const handleGetKey = () => {
    Linking.openURL(API_KEY_URL);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.surfaceLight },
          ]}
        >
          <Ionicons name="key-outline" size={64} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {t("onboarding.apiKey.title")}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t("onboarding.apiKey.subtitle")}
        </Text>

        <View style={styles.inputContainer}>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.surface,
                borderColor: error ? colors.error : colors.border,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t("onboarding.apiKey.placeholder")}
              placeholderTextColor={colors.textMuted}
              value={apiKey}
              onChangeText={(text) => {
                setApiKey(text);
                setError("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.pasteButton}
              onPress={handlePasteFromClipboard}
            >
              <Ionicons
                name="clipboard-outline"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {error ? (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.addButton,
              {
                backgroundColor: apiKey.trim()
                  ? colors.primary
                  : colors.surfaceLight,
              },
            ]}
            onPress={handleAddKey}
            disabled={!apiKey.trim() || isAdding}
          >
            <Text
              style={[
                styles.addButtonText,
                { color: apiKey.trim() ? "#fff" : colors.textMuted },
              ]}
            >
              {isAdding
                ? t("settings.apiKeys.adding")
                : t("settings.apiKeys.add")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.getKeyLink} onPress={handleGetKey}>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
            <Text style={[styles.getKeyText, { color: colors.primary }]}>
              {t("settings.apiKeys.getKey")}
            </Text>
          </TouchableOpacity>
        </View>

        {hasKey && (
          <View
            style={[
              styles.successBadge,
              { backgroundColor: colors.success + "20" },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
            />
            <Text style={[styles.successText, { color: colors.success }]}>
              {t("onboarding.apiKey.added")}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: colors.border }]}
          onPress={onPrevious}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        {!hasKey ? (
          <TouchableOpacity
            style={[styles.skipButton, { borderColor: colors.border }]}
            onPress={onSkip}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              {t("onboarding.skip")}
            </Text>
          </TouchableOpacity>
        ) : null}

        <Button3D
          title={t("common.done")}
          onPress={onNext}
          style={styles.nextButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  inputContainer: {
    width: "100%",
    gap: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
  },
  pasteButton: {
    padding: 8,
  },
  errorText: {
    fontSize: 13,
    marginTop: -4,
  },
  addButton: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  getKeyLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  getKeyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  successText: {
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 24,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButton: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontSize: 15,
    fontWeight: "500",
  },
  nextButton: {
    flex: 1,
  },
});
