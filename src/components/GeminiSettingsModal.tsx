import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { COLORS } from "@constants/colors";
import {
  GeminiConfig,
  DEFAULT_GEMINI_CONFIG,
  getGeminiConfig,
  saveGeminiConfig,
} from "@utils/storage";
import Button3D from "./Button3D";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

interface GeminiSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const GeminiSettingsModal: React.FC<GeminiSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [config, setConfig] = useState<GeminiConfig>(DEFAULT_GEMINI_CONFIG);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (visible) {
      loadConfig();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const loadConfig = async () => {
    const savedConfig = await getGeminiConfig();
    setConfig(savedConfig);
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleSave = async () => {
    await saveGeminiConfig(config);
    handleClose();
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_GEMINI_CONFIG, apiKey: config.apiKey });
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomSheet,
            {
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.dragHandle} />
            <Text style={styles.title}>Cài đặt Gemini AI</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* API Key */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>API Key</Text>
              <View style={styles.apiKeyContainer}>
                <RNTextInput
                  style={styles.apiKeyInput}
                  value={config.apiKey}
                  onChangeText={(text) =>
                    setConfig({ ...config, apiKey: text })
                  }
                  placeholder="Nhập Gemini API Key..."
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
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

            {/* Model */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>Model</Text>
              <RNTextInput
                style={styles.input}
                value={config.model}
                onChangeText={(text) => setConfig({ ...config, model: text })}
                placeholder="gemini-2.5-flash-preview-05-20"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
              />
            </View>

            {/* Temperature */}
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
                onValueChange={(value) =>
                  setConfig({ ...config, temperature: value })
                }
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.primary}
              />
            </View>

            {/* System Prompt */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>System Prompt</Text>
              <RNTextInput
                style={styles.promptInput}
                value={config.systemPrompt}
                onChangeText={(text) =>
                  setConfig({ ...config, systemPrompt: text })
                }
                placeholder="Nhập system prompt..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.buttonRow}>
            <Button3D
              onPress={handleReset}
              title="Đặt lại"
              variant="outline"
              style={styles.rowButton}
            />
            <Button3D
              onPress={handleSave}
              title="Lưu"
              variant="primary"
              style={styles.rowButton}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: "100%",
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  sheetHeader: {
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    backgroundColor: COLORS.borderLight,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: 12,
    padding: 8,
  },
  content: {
    flex: 1,
  },
  settingGroup: {
    marginBottom: 20,
  },
  settingLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  apiKeyContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  apiKeyInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  promptInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 150,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  rowButton: {
    flex: 1,
  },
});

export default GeminiSettingsModal;
