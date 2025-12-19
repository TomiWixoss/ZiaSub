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
import { COLORS } from "@constants/colors";
import { GeminiConfig } from "@utils/storage";

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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <View style={styles.header}>
                <Text style={styles.title}>Chọn cấu hình AI</Text>
                <TouchableOpacity onPress={onClose}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={COLORS.textMuted}
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
                      style={[styles.item, isActive && styles.itemActive]}
                      onPress={() => onSelect(config)}
                    >
                      <View style={styles.itemContent}>
                        <MaterialCommunityIcons
                          name="robot"
                          size={20}
                          color={isActive ? COLORS.primary : COLORS.textMuted}
                        />
                        <View style={styles.itemText}>
                          <Text
                            style={[
                              styles.itemName,
                              isActive && styles.itemNameActive,
                            ]}
                          >
                            {config.name}
                          </Text>
                          <Text style={styles.itemModel}>{config.model}</Text>
                        </View>
                      </View>
                      {isActive && (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color={COLORS.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.hint}>
                Vào Cài đặt → Gemini để thêm hoặc chỉnh sửa cấu hình
              </Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "70%",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "600",
  },
  list: {
    maxHeight: 300,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(155, 126, 217, 0.1)",
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  itemText: {
    flex: 1,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "500",
  },
  itemNameActive: {
    color: COLORS.primary,
  },
  itemModel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
});

export default ConfigSelector;
