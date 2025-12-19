import React, { useEffect, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";
import Button3D from "./Button3D";

export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  type?: "info" | "success" | "warning" | "error";
}

interface CustomAlertProps {
  visible: boolean;
  config: AlertConfig | null;
  onClose: () => void;
}

// Singleton state for global alert
let globalShowAlert: ((config: AlertConfig) => void) | null = null;

export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  type?: AlertConfig["type"]
) => {
  if (globalShowAlert) {
    globalShowAlert({ title, message, buttons, type });
  }
};

export const alert = (title: string, message?: string) => {
  showAlert(title, message, [{ text: "OK" }]);
};

export const confirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = "Đồng ý",
  cancelText = "Không"
) => {
  showAlert(title, message, [
    { text: confirmText, onPress: onConfirm },
    { text: cancelText, style: "cancel" },
  ]);
};

export const confirmDestructive = (
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = "Xóa",
  cancelText = "Không"
) => {
  showAlert(
    title,
    message,
    [
      { text: confirmText, style: "destructive", onPress: onConfirm },
      { text: cancelText, style: "cancel" },
    ],
    "warning"
  );
};

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  config,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!config) return null;

  const { title, message, buttons = [{ text: "OK" }], type = "info" } = config;

  const getIcon = () => {
    switch (type) {
      case "success":
        return { name: "check-circle", color: COLORS.success };
      case "warning":
        return { name: "alert-circle", color: COLORS.warning };
      case "error":
        return { name: "close-circle", color: COLORS.error };
      default:
        return { name: "information", color: COLORS.primary };
    }
  };

  const icon = getIcon();

  const handleButtonPress = (button: AlertButton) => {
    onClose();
    setTimeout(() => button.onPress?.(), 150);
  };

  const getButtonVariant = (
    style?: AlertButton["style"]
  ): "primary" | "secondary" | "destructive" => {
    switch (style) {
      case "destructive":
        return "destructive";
      case "cancel":
        return "secondary";
      default:
        return "primary";
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => {
            const hasCancel = buttons.some((b) => b.style === "cancel");
            if (hasCancel || buttons.length === 1) onClose();
          }}
        />
        <Animated.View
          style={[
            styles.container,
            { transform: [{ scale: scaleAnim }], opacity: fadeAnim },
          ]}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={icon.name as any}
              size={40}
              color={icon.color}
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}

          <View
            style={[
              styles.buttonContainer,
              (buttons.length > 2 || buttons.some((b) => b.text.length > 10)) &&
                styles.buttonContainerVertical,
            ]}
          >
            {buttons.map((button, index) => {
              const isVertical =
                buttons.length > 2 || buttons.some((b) => b.text.length > 10);
              return (
                <View
                  key={index}
                  style={!isVertical ? styles.buttonFlex : undefined}
                >
                  <Button3D
                    title={button.text}
                    variant={getButtonVariant(button.style)}
                    onPress={() => handleButtonPress(button)}
                    style={styles.alertButton}
                  />
                </View>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Provider component to wrap app
export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = React.useState(false);
  const [config, setConfig] = React.useState<AlertConfig | null>(null);

  useEffect(() => {
    globalShowAlert = (cfg: AlertConfig) => {
      setConfig(cfg);
      setVisible(true);
    };
    return () => {
      globalShowAlert = null;
    };
  }, []);

  return (
    <>
      {children}
      <CustomAlert
        visible={visible}
        config={config}
        onClose={() => setVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  buttonContainerVertical: {
    flexDirection: "column",
  },
  alertButton: {
    // Use default Button3D height
  },
  buttonFlex: {
    flex: 1,
  },
});

export default CustomAlert;
