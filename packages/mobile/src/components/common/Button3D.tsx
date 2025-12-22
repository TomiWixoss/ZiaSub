import React, { useRef, useMemo } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@src/contexts";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "warning";

type ButtonSize = "normal" | "small";

interface Button3DProps {
  onPress: () => void;
  title?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconSize?: number;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  active?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
}

const SHADOW_HEIGHT = 4;

const Button3D: React.FC<Button3DProps> = ({
  onPress,
  title,
  icon,
  iconSize = 20,
  variant = "primary",
  size = "normal",
  disabled = false,
  active = false,
  style,
  textStyle,
  children,
}) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    animatedValue.setValue(1);
  };

  const handlePressOut = () => {
    animatedValue.setValue(0);
  };

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SHADOW_HEIGHT],
  });

  const getColors = useMemo(() => {
    if (disabled) {
      return {
        bg: colors.surfaceLight,
        shadow: colors.border,
        text: colors.textMuted,
        border: colors.border,
      };
    }

    const isActive = active;

    switch (variant) {
      case "primary":
        return {
          bg: isActive ? colors.primary : colors.primary,
          shadow: isActive ? colors.primaryDark : colors.primaryDark,
          text: "#FFFFFF",
          border: "transparent",
        };
      case "secondary":
        return {
          bg: isActive ? colors.primaryDark : colors.surfaceElevated,
          shadow: isActive ? colors.primaryDark : colors.background,
          text: colors.text,
          border: isActive ? colors.primary : colors.border,
        };
      case "outline":
        return {
          bg: isActive ? colors.surfaceLight : colors.surface,
          shadow: colors.background,
          text: isActive ? colors.text : colors.textSecondary,
          border: isActive ? colors.primary : colors.border,
        };
      case "ghost":
        return {
          bg: isActive ? colors.surfaceLight : "transparent",
          shadow: "transparent",
          text: isActive ? colors.text : colors.textSecondary,
          border: "transparent",
        };
      case "destructive":
        return {
          bg: colors.error,
          shadow: "#8B0000",
          text: "#FFFFFF",
          border: "transparent",
        };
      case "warning":
        return {
          bg: colors.warning,
          shadow: "#CC8800",
          text: "#FFFFFF",
          border: "transparent",
        };
      default:
        return {
          bg: colors.surfaceElevated,
          shadow: colors.background,
          text: colors.text,
          border: colors.border,
        };
    }
  }, [colors, disabled, active, variant]);

  const sizeStyles = useMemo(() => {
    if (size === "small") {
      return {
        containerHeight: 40 + SHADOW_HEIGHT,
        buttonHeight: 40,
        borderRadius: 10,
        fontSize: 13,
        iconSize: 16,
      };
    }
    return {
      containerHeight: 52 + SHADOW_HEIGHT,
      buttonHeight: 52,
      borderRadius: 14,
      fontSize: 15,
      iconSize: iconSize,
    };
  }, [size, iconSize]);

  return (
    <View
      style={[styles.container, { height: sizeStyles.containerHeight }, style]}
    >
      <View
        style={[
          styles.shadow,
          {
            backgroundColor: getColors.shadow,
            borderColor: getColors.shadow,
            height: sizeStyles.buttonHeight,
            borderRadius: sizeStyles.borderRadius,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={[
            styles.button,
            {
              backgroundColor: getColors.bg,
              borderColor: getColors.border,
              height: sizeStyles.buttonHeight,
              borderRadius: sizeStyles.borderRadius,
            },
          ]}
        >
          {children ? (
            children
          ) : (
            <View style={styles.content}>
              {icon && (
                <MaterialCommunityIcons
                  name={icon}
                  size={sizeStyles.iconSize}
                  color={getColors.text}
                />
              )}
              {title && (
                <Text
                  style={[
                    styles.text,
                    { color: getColors.text, fontSize: sizeStyles.fontSize },
                    icon && title && styles.textWithIcon,
                    textStyle,
                  ]}
                >
                  {title}
                </Text>
              )}
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // height is set dynamically based on size
  },
  shadow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderWidth: 1,
  },
  buttonWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  button: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
  },
  textWithIcon: {
    marginLeft: 8,
  },
});

export default Button3D;
