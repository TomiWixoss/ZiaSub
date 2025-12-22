import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { GeminiConfig } from "@src/types";
import Button3D from "../common/Button3D";

interface GeminiListProps {
  configs: GeminiConfig[];
  onEdit: (config: GeminiConfig) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const GeminiList: React.FC<GeminiListProps> = ({
  configs,
  onEdit,
  onDelete,
  onAdd,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(geminiListThemedStyles);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {configs.map((config) => (
          <Pressable
            key={config.id}
            style={themedStyles.configItem}
            onPress={() => onEdit(config)}
          >
            <View style={styles.configInfo}>
              <Text style={themedStyles.configName}>{config.name}</Text>
              <Text style={themedStyles.configModel}>{config.model}</Text>
            </View>
            <View style={styles.configActions}>
              <Pressable
                style={styles.configActionBtn}
                onPress={() => onDelete(config.id)}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={colors.textMuted}
              />
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <Button3D
        onPress={onAdd}
        icon="plus"
        title={t("settings.geminiConfig.addNew")}
        variant="outline"
        style={{ marginTop: 16 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  configInfo: { flex: 1 },
  configActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  configActionBtn: { padding: 4 },
});

const geminiListThemedStyles = createThemedStyles((colors) => ({
  configItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  configName: { color: colors.text, fontSize: 15, fontWeight: "600" },
  configModel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
}));

export default GeminiList;
