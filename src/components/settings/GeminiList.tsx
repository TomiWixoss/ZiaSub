import React from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";
import { GeminiConfig } from "@utils/storage";
import Button3D from "../Button3D";

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
}) => (
  <View style={styles.container}>
    <ScrollView showsVerticalScrollIndicator={false}>
      {configs.map((config) => (
        <TouchableOpacity
          key={config.id}
          style={styles.configItem}
          onPress={() => onEdit(config)}
        >
          <View style={styles.configInfo}>
            <Text style={styles.configName}>{config.name}</Text>
            <Text style={styles.configModel}>{config.model}</Text>
          </View>
          <View style={styles.configActions}>
            <TouchableOpacity
              style={styles.configActionBtn}
              onPress={() => onDelete(config.id)}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={COLORS.textMuted}
            />
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
    <Button3D
      onPress={onAdd}
      icon="plus"
      title="Thêm cấu hình"
      variant="outline"
      style={{ marginTop: 16 }}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  configItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  configInfo: { flex: 1 },
  configName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  configModel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  configActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  configActionBtn: { padding: 4 },
});

export default GeminiList;
