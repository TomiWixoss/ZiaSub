import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import { alert, confirmDestructive } from "../../common/CustomAlert";
import Button3D from "../../common/Button3D";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import { saveApiKeys } from "@utils/storage";
import { keyManager } from "@services/keyManager";

interface ApiKeysSectionProps {
  apiKeys: string[];
  onApiKeysChange: (keys: string[]) => void;
}

const maskKey = (key: string) => {
  if (key.length < 12) return "***";
  return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
};

const ApiKeysSection: React.FC<ApiKeysSectionProps> = ({
  apiKeys,
  onApiKeysChange,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(apiKeysThemedStyles);
  const [showKeys, setShowKeys] = useState(false);
  const [isAddingKey, setIsAddingKey] = useState(false);

  const handleAddKeyFromClipboard = async () => {
    if (isAddingKey) return;
    setIsAddingKey(true);
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      const key = clipboardContent?.trim();
      if (!key) {
        alert(
          t("settings.apiKeys.clipboardEmpty"),
          t("settings.apiKeys.clipboardEmptyMessage")
        );
        return;
      }
      if (!key.startsWith("AIza") || key.length < 30) {
        alert(
          t("settings.apiKeys.invalid"),
          t("settings.apiKeys.invalidMessage")
        );
        return;
      }
      if (apiKeys.includes(key)) {
        alert(
          t("settings.apiKeys.duplicate"),
          t("settings.apiKeys.duplicateMessage")
        );
        return;
      }
      const newKeys = [...apiKeys, key];
      onApiKeysChange(newKeys);
      await saveApiKeys(newKeys);
      keyManager.initialize(newKeys);
      alert(t("common.success"), t("settings.apiKeys.added"));
    } catch (error) {
      alert(t("common.error"), t("settings.apiKeys.clipboardError"));
    } finally {
      setIsAddingKey(false);
    }
  };

  const handleDeleteKey = (index: number) => {
    confirmDestructive(
      t("settings.apiKeys.deleteTitle"),
      t("settings.apiKeys.deleteConfirm"),
      async () => {
        const newKeys = apiKeys.filter((_, i) => i !== index);
        onApiKeysChange(newKeys);
        await saveApiKeys(newKeys);
        keyManager.initialize(newKeys);
      }
    );
  };

  return (
    <>
      <View style={styles.sectionHintRow}>
        <Text style={themedStyles.sectionHint}>
          {t("settings.apiKeys.description")}{" "}
        </Text>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL("https://aistudio.google.com/app/apikey")
          }
        >
          <Text style={themedStyles.linkText}>
            {t("settings.apiKeys.getKey")}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={themedStyles.apiKeysContainer}>
        {apiKeys.map((key, index) => (
          <View key={index} style={themedStyles.apiKeyItem}>
            <View style={styles.apiKeyInfo}>
              <MaterialCommunityIcons
                name="key"
                size={16}
                color={colors.primary}
              />
              <Text style={themedStyles.apiKeyText}>
                {showKeys ? key : maskKey(key)}
              </Text>
              {index === keyManager.getCurrentKeyIndex() - 1 && (
                <View style={themedStyles.activeKeyBadge}>
                  <Text style={themedStyles.activeKeyText}>
                    {t("settings.apiKeys.active")}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteKey(index)}
              style={styles.deleteKeyBtn}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={18}
                color={colors.error}
              />
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.addKeyRow}>
          <Button3D
            icon="clipboard-plus-outline"
            title={
              isAddingKey
                ? t("settings.apiKeys.adding")
                : t("settings.apiKeys.addFromClipboard")
            }
            variant="primary"
            onPress={handleAddKeyFromClipboard}
            disabled={isAddingKey}
            style={styles.addKeyFromClipboardBtn}
          />
          <TouchableOpacity
            onPress={() => setShowKeys(!showKeys)}
            style={styles.eyeBtn}
          >
            <MaterialCommunityIcons
              name={showKeys ? "eye-off" : "eye"}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>
        <Text style={themedStyles.clipboardHint}>
          {t("settings.apiKeys.clipboardHint")}
        </Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHintRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 12,
  },
  apiKeyInfo: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  deleteKeyBtn: { padding: 4 },
  addKeyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
    paddingTop: 4,
  },
  addKeyFromClipboardBtn: { flex: 1 },
  eyeBtn: { padding: 8, height: 52, justifyContent: "center" },
});

const apiKeysThemedStyles = createThemedStyles((colors) => ({
  sectionHint: { color: colors.textMuted, fontSize: 12 },
  linkText: {
    color: colors.primary,
    fontSize: 12,
    textDecorationLine: "underline",
  },
  apiKeysContainer: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  apiKeyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  apiKeyText: { color: colors.text, fontSize: 13, flex: 1 },
  activeKeyBadge: {
    backgroundColor: colors.success,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeKeyText: { color: colors.background, fontSize: 10, fontWeight: "600" },
  clipboardHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 8,
    fontStyle: "italic",
  },
}));

export default ApiKeysSection;
