import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Pressable,
  ViewStyle,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import { PRESET_PROMPTS, type PresetPromptType } from "@constants/defaults";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

// Custom option for user-defined prompt
const CUSTOM_PRESET_ID = "custom" as PresetPromptType;

interface PresetPromptPickerProps {
  onSelectPreset: (prompt: string, presetId: PresetPromptType) => void;
  currentPresetId?: PresetPromptType;
  style?: ViewStyle;
}

const PresetPromptPicker: React.FC<PresetPromptPickerProps> = ({
  onSelectPreset,
  currentPresetId,
  style,
}) => {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const isVi = i18n.language === "vi";
  const styles = useThemedStyles(themedStyles);

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
    ]).start(() => setVisible(false));
  };

  const handleSelect = (preset: (typeof PRESET_PROMPTS)[0]) => {
    onSelectPreset(preset.prompt, preset.id);
    handleClose();
  };

  const handleSelectCustom = () => {
    // Don't change the prompt, just mark as custom
    onSelectPreset("", CUSTOM_PRESET_ID);
    handleClose();
  };

  const currentPreset =
    currentPresetId && currentPresetId !== CUSTOM_PRESET_ID
      ? PRESET_PROMPTS.find((p) => p.id === currentPresetId)
      : null;

  const isCustomSelected =
    currentPresetId === CUSTOM_PRESET_ID || !currentPresetId;

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerButton, style]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.pickerLeft}>
          <View style={styles.pickerIconContainer}>
            <MaterialCommunityIcons
              name={(currentPreset?.icon as any) || "file-document-outline"}
              size={20}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.pickerTextContainer}>
            <Text style={styles.pickerLabel}>
              {t("settings.geminiConfig.presetPrompts")}
            </Text>
            <Text style={styles.pickerValue} numberOfLines={1}>
              {currentPreset
                ? isVi
                  ? currentPreset.nameVi
                  : currentPreset.name
                : isVi
                ? "Tùy chỉnh"
                : "Custom"}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
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
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.title}>
                {t("settings.geminiConfig.selectPreset")}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.presetList}
              contentContainerStyle={styles.presetListContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Custom option - use user's own system prompt */}
              <TouchableOpacity
                style={[
                  styles.presetItem,
                  isCustomSelected && styles.presetItemSelected,
                ]}
                onPress={handleSelectCustom}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.presetIcon,
                    isCustomSelected && styles.presetIconSelected,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={22}
                    color={isCustomSelected ? "#FFFFFF" : colors.textSecondary}
                  />
                </View>
                <View style={styles.presetInfo}>
                  <Text
                    style={[
                      styles.presetName,
                      isCustomSelected && styles.presetNameSelected,
                    ]}
                  >
                    {isVi ? "Tùy chỉnh" : "Custom"}
                  </Text>
                  <Text style={styles.presetDesc} numberOfLines={1}>
                    {isVi
                      ? "Sử dụng prompt tự định nghĩa trong cài đặt"
                      : "Use your own prompt defined in settings"}
                  </Text>
                </View>
                {isCustomSelected && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={22}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>
                  {isVi ? "Mẫu có sẵn" : "Presets"}
                </Text>
                <View style={styles.dividerLine} />
              </View>

              {PRESET_PROMPTS.map((preset) => {
                const isSelected =
                  preset.id === currentPresetId && !isCustomSelected;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetItem,
                      isSelected && styles.presetItemSelected,
                    ]}
                    onPress={() => handleSelect(preset)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.presetIcon,
                        isSelected && styles.presetIconSelected,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={preset.icon as any}
                        size={22}
                        color={isSelected ? "#FFFFFF" : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.presetInfo}>
                      <Text
                        style={[
                          styles.presetName,
                          isSelected && styles.presetNameSelected,
                        ]}
                      >
                        {isVi ? preset.nameVi : preset.name}
                      </Text>
                      <Text style={styles.presetDesc} numberOfLines={1}>
                        {preset.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={22}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const themedStyles = createThemedStyles((colors) => ({
  // Picker Button - style giống ConfigPicker
  pickerButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  pickerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
    gap: 12,
  },
  pickerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  pickerTextContainer: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
  },

  // Modal - style giống TranslationQueueModal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end" as const,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    width: "100%" as const,
    height: SHEET_HEIGHT,
    backgroundColor: colors.surface,
  },
  sheetHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 12,
    marginTop: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center" as const,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700" as const,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  // Preset List - style giống QueueItemCard
  presetList: {
    flex: 1,
  },
  presetListContent: {
    paddingBottom: 20,
  },
  presetItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  presetItemSelected: {
    backgroundColor: colors.primary + "15",
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  presetIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.surfaceElevated,
  },
  presetIconSelected: {
    backgroundColor: colors.primary,
  },
  presetInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 2,
  },
  presetNameSelected: {
    color: colors.primary,
  },
  presetDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // Divider
  divider: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginVertical: 10,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
}));

export default PresetPromptPicker;
