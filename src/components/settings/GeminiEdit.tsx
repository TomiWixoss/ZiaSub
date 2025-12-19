import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  ScrollView,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { COLORS } from "@constants/colors";
import { GeminiConfig } from "@utils/storage";
import Button3D from "../Button3D";

const AVAILABLE_MODELS = [
  { id: "models/gemini-3-flash-preview", name: "Gemini 3 Flash (Preview)" },
  { id: "models/gemini-3-pro-preview", name: "Gemini 3 Pro (Preview)" },
  { id: "models/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "models/gemini-flash-latest", name: "Gemini Flash (Latest)" },
  { id: "models/gemini-flash-lite-latest", name: "Gemini Flash Lite (Latest)" },
];

interface GeminiEditProps {
  config: GeminiConfig;
  onChange: (config: GeminiConfig) => void;
  onSave: () => void;
  onCancel: () => void;
}

const GeminiEdit: React.FC<GeminiEditProps> = ({
  config,
  onChange,
  onSave,
  onCancel,
}) => {
  const [showModelPicker, setShowModelPicker] = useState(false);

  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === config.model);
  const modelDisplayName = selectedModel?.name || config.model;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>Tên kiểu dịch</Text>
        <RNTextInput
          style={styles.input}
          value={config.name}
          onChangeText={(text) => onChange({ ...config, name: text })}
          placeholder="Đặt tên..."
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>Mô hình AI</Text>
        <TouchableOpacity
          style={styles.modelPicker}
          onPress={() => setShowModelPicker(!showModelPicker)}
        >
          <Text style={styles.modelPickerText}>{modelDisplayName}</Text>
          <MaterialCommunityIcons
            name={showModelPicker ? "chevron-up" : "chevron-down"}
            size={20}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>
        {showModelPicker && (
          <View style={styles.modelDropdown}>
            {AVAILABLE_MODELS.map((model) => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelOption,
                  config.model === model.id && styles.modelOptionActive,
                ]}
                onPress={() => {
                  onChange({ ...config, model: model.id });
                  setShowModelPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.modelOptionText,
                    config.model === model.id && styles.modelOptionTextActive,
                  ]}
                >
                  {model.name}
                </Text>
                <Text style={styles.modelOptionId}>{model.id}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          Độ sáng tạo: {config.temperature.toFixed(1)}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={2}
          step={0.1}
          value={config.temperature}
          onValueChange={(value) => onChange({ ...config, temperature: value })}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>Hướng dẫn dịch</Text>
        <RNTextInput
          style={styles.promptInput}
          value={config.systemPrompt}
          onChangeText={(text) => onChange({ ...config, systemPrompt: text })}
          placeholder="Nhập hướng dẫn cho AI..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.buttonRow}>
        <Button3D
          onPress={onCancel}
          title="Hủy"
          variant="outline"
          style={styles.rowButton}
        />
        <Button3D
          onPress={onSave}
          title="Lưu"
          variant="primary"
          style={styles.rowButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  settingGroup: { marginBottom: 16 },
  settingLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  slider: { width: "100%", height: 40 },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  promptInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 200,
    maxHeight: 300,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  rowButton: { flex: 1 },
  modelPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modelPickerText: { color: COLORS.text, fontSize: 14 },
  modelDropdown: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  modelOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modelOptionActive: { backgroundColor: COLORS.surfaceElevated },
  modelOptionText: { color: COLORS.text, fontSize: 14 },
  modelOptionTextActive: { color: COLORS.primary, fontWeight: "600" },
  modelOptionId: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
});

export { GeminiEdit };

export default GeminiEdit;
