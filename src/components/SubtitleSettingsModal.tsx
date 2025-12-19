import React, { useEffect, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Animated,
  Dimensions,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.45;
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { COLORS } from "@constants/colors";
import { SubtitleSettings } from "@utils/storage";
import Button3D from "./Button3D";

interface SubtitleSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: SubtitleSettings;
  onSettingsChange: (settings: SubtitleSettings) => void;
}

const SubtitleSettingsModal: React.FC<SubtitleSettingsModalProps> = ({
  visible,
  onClose,
  settings,
  onSettingsChange,
}) => {
  const insets = useSafeAreaInsets();
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
    ]).start(() => onClose());
  };

  const handleFontSizeChange = (value: number) => {
    onSettingsChange({ ...settings, fontSize: Math.round(value) });
  };

  const toggleBold = () => {
    onSettingsChange({
      ...settings,
      fontWeight: settings.fontWeight === "bold" ? "normal" : "bold",
    });
  };

  const toggleItalic = () => {
    onSettingsChange({
      ...settings,
      fontStyle: settings.fontStyle === "italic" ? "normal" : "italic",
    });
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
            <Text style={styles.title}>Cài đặt phụ đề</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={styles.previewContainer}>
            <RNText
              style={[
                styles.previewText,
                {
                  fontSize: settings.fontSize,
                  fontWeight: settings.fontWeight === "bold" ? "700" : "400",
                  fontStyle: settings.fontStyle,
                },
              ]}
            >
              Xem trước phụ đề
            </RNText>
          </View>

          {/* Font Size */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>
              Cỡ chữ: {settings.fontSize}px
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={28}
              value={settings.fontSize}
              onValueChange={handleFontSizeChange}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
          </View>

          {/* Font Style Buttons */}
          <View style={styles.styleButtonsRow}>
            <Button3D
              onPress={toggleBold}
              icon="format-bold"
              title="Đậm"
              variant="secondary"
              active={settings.fontWeight === "bold"}
              style={styles.styleButton}
            />
            <Button3D
              onPress={toggleItalic}
              icon="format-italic"
              title="Nghiêng"
              variant="secondary"
              active={settings.fontStyle === "italic"}
              style={styles.styleButton}
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
  previewContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
    minHeight: 80,
    justifyContent: "center",
  },
  previewText: {
    color: COLORS.text,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  settingRow: {
    marginBottom: 24,
  },
  settingLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  styleButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  styleButton: {
    flex: 1,
  },
});

export default SubtitleSettingsModal;
