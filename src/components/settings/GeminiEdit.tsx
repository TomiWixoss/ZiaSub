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
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>Tên cấu hình</Text>
        <RNTextInput
          style={styles.input}
          value={config.name}
          onChangeText={(text) => onChange({ ...config, name: text })}
          placeholder="Tên cấu hình..."
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>API Key</Text>
        <View style={styles.apiKeyContainer}>
          <RNTextInput
            style={styles.apiKeyInput}
            value={config.apiKey}
            onChangeText={(text) => onChange({ ...config, apiKey: text })}
            placeholder="Nhập Gemini API Key..."
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showApiKey}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowApiKey(!showApiKey)}
          >
            <MaterialCommunityIcons
              name={showApiKey ? "eye-off" : "eye"}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>Model</Text>
        <RNTextInput
          style={styles.input}
          value={config.model}
          onChangeText={(text) => onChange({ ...config, model: text })}
          placeholder="gemini-3-flash-preview"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          Temperature: {config.temperature.toFixed(1)}
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
        <Text style={styles.settingLabel}>System Prompt</Text>
        <RNTextInput
          style={styles.promptInput}
          value={config.systemPrompt}
          onChangeText={(text) => onChange({ ...config, systemPrompt: text })}
          placeholder="Nhập system prompt..."
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
  apiKeyContainer: { position: "relative" },
  apiKeyInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    paddingRight: 44,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 14,
  },
  promptInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 120,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  rowButton: { flex: 1 },
});

export default GeminiEdit;
