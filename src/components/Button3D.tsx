import React, { useRef } from "react";
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
import { COLORS } from "@constants/colors";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

interface Button3DProps {
  onPress: () => void;
  title?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconSize?: number;
  variant?: ButtonVariant;
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
  disabled = false,
  active = false,
  style,
  textStyle,
  children,
}) => {
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

  const getColors = () => {
    if (disabled) {
      return {
        bg: COLORS.surfaceLight,
        shadow: COLORS.border,
        text: COLORS.textMuted,
        border: COLORS.border,
      };
    }

    const isActive = active;

    switch (variant) {
      case "primary":
        return {
          bg: isActive ? COLORS.primary : COLORS.primary,
          shadow: isActive ? "#990000" : "#990000",
          text: COLORS.text,
          border: "transparent",
        };
      case "secondary":
        return {
          bg: isActive ? COLORS.primaryDark : COLORS.surfaceElevated,
          shadow: isActive ? "#990000" : COLORS.background,
          text: COLORS.text,
          border: isActive ? COLORS.primary : COLORS.border,
        };
      case "outline":
        return {
          bg: isActive ? COLORS.surfaceLight : COLORS.surface,
          shadow: COLORS.background,
          text: isActive ? COLORS.text : COLORS.textSecondary,
          border: isActive ? COLORS.primary : COLORS.border,
        };
      case "ghost":
        return {
          bg: isActive ? COLORS.surfaceLight : "transparent",
          shadow: "transparent",
          text: isActive ? COLORS.text : COLORS.textSecondary,
          border: "transparent",
        };
      default:
        return {
          bg: COLORS.surfaceElevated,
          shadow: COLORS.background,
          text: COLORS.text,
          border: COLORS.border,
        };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.container, style]}>
      {/* Shadow layer */}
      <View
        style={[
          styles.shadow,
          {
            backgroundColor: colors.shadow,
            borderColor: colors.shadow,
          },
        ]}
      />

      {/* Button layer */}
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
              backgroundColor: colors.bg,
              borderColor: colors.border,
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
                  size={iconSize}
                  color={colors.text}
                />
              )}
              {title && (
                <Text
                  style={[
                    styles.text,
                    { color: colors.text },
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
    height: 52 + SHADOW_HEIGHT,
  },
  shadow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  buttonWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  button: {
    height: 52,
    borderRadius: 14,
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
