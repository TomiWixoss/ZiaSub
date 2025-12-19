import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { GeminiConfig } from "@src/types";

interface ConfigSelectorProps {
  visible: boolean;
  configs: GeminiConfig[];
  activeConfig: GeminiConfig | null;
  onSelect: (config: GeminiConfig) => void;
  onClose: () => void;
}

const ConfigSelector: React.FC<ConfigSelectorProps> = ({
  visible,
  configs,
  activeConfig,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(configSelectorThemedStyles);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={themedStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={themedStyles.container}>
              <View style={styles.header}>
                <Text style={themedStyles.title}>{t("chat.selectConfig")}</Text>
                <TouchableOpacity onPress={onClose}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
              >
                {configs.map((config) => {
                  const isActive = activeConfig?.id === config.id;
                  return (
                    <TouchableOpacity
                      key={config.id}
                      style={[
                        themedStyles.item,
                        isActive && themedStyles.itemActive,
                      ]}
                      onPress={() => onSelect(config)}
                    >
                      <View style={styles.itemContent}>
                        <MaterialCommunityIcons
                          name="robot"
                          size={20}
                          color={isActive ? colors.primary : colors.textMuted}
                        />
                        <View style={styles.itemText}>
                          <Text
                            style={[
                              themedStyles.itemName,
                              isActive && themedStyles.itemNameActive,
                            ]}
                          >
                            {config.name}
                          </Text>
                          <Text style={themedStyles.itemModel}>
                            {config.model}
                          </Text>
                        </View>
                      </View>
                      {isActive && (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={themedStyles.hint}>{t("chat.configHint")}</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  list: { maxHeight: 300 },
  itemContent: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  itemText: { flex: 1 },
});

const configSelectorThemedStyles = createThemedStyles((colors) => ({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "70%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "600" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  itemName: { color: colors.text, fontSize: 15, fontWeight: "500" },
  itemNameActive: { color: colors.primary },
  itemModel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
}));

export default ConfigSelector;
