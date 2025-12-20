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

  const currentPreset = currentPresetId
    ? PRESET_PROMPTS.find((p) => p.id === currentPresetId)
    : null;

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
                : t("settings.geminiConfig.selectPreset")}
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
            <View style={styles.sheetHeader}>
              <View style={styles.dragHandle} />
              <Text style={styles.title}>
                {t("settings.geminiConfig.selectPreset")}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.presetList}
              contentContainerStyle={styles.presetListContent}
              showsVerticalScrollIndicator={false}
            >
              {PRESET_PROMPTS.map((preset) => {
                const isSelected = preset.id === currentPresetId;
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
  // Picker Button
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

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end" as const,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 12,
    width: "100%" as const,
    height: SHEET_HEIGHT,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHeader: {
    alignItems: "center" as const,
    marginBottom: 16,
    position: "relative" as const,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    backgroundColor: colors.borderLight,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700" as const,
  },
  closeButton: {
    position: "absolute" as const,
    right: 0,
    top: 12,
    padding: 8,
  },

  // Preset List
  presetList: {
    flex: 1,
  },
  presetListContent: {
    paddingBottom: 20,
  },
  presetItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  presetItemSelected: {
    backgroundColor: colors.primary + "20",
    borderColor: colors.primary,
    borderWidth: 2,
  },
  presetIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
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
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 3,
  },
  presetNameSelected: {
    color: colors.primary,
  },
  presetDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
}));

export default PresetPromptPicker;
