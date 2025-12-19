import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";

interface FloatingButtonProps {
  onPress: () => void;
  onSettingsPress: () => void;
  visible: boolean;
  hasSubtitles?: boolean;
}

const SHADOW_HEIGHT = 4;

interface Fab3DProps {
  onPress: () => void;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  size: number;
  iconSize: number;
  active?: boolean;
}

const Fab3D: React.FC<Fab3DProps> = ({
  onPress,
  icon,
  size,
  iconSize,
  active = false,
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

  const bgColor = active ? COLORS.primary : COLORS.surfaceElevated;
  const shadowColor = active ? "#990000" : COLORS.background;
  const borderColor = active ? COLORS.primaryDark : COLORS.border;

  return (
    <View style={[styles.fab3dContainer, { width: size, height: size + SHADOW_HEIGHT }]}>
      <View
        style={[
          styles.fabShadow,
          {
            width: size,
            height: size,
            borderRadius: size * 0.3,
            backgroundColor: shadowColor,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.fabWrapper,
          { transform: [{ translateY }] },
        ]}
      >
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.fabButton,
            {
              width: size,
              height: size,
              borderRadius: size * 0.3,
              backgroundColor: bgColor,
              borderColor: borderColor,
            },
          ]}
        >
          <MaterialCommunityIcons name={icon} size={iconSize} color={COLORS.text} />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const FloatingButton: React.FC<FloatingButtonProps> = ({
  onPress,
  onSettingsPress,
  visible,
  hasSubtitles = false,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.fabContainer}>
      <Fab3D
        onPress={onSettingsPress}
        icon="format-size"
        size={40}
        iconSize={20}
      />
      <Fab3D
        onPress={onPress}
        icon={hasSubtitles ? "subtitles" : "subtitles-outline"}
        size={52}
        iconSize={26}
        active={hasSubtitles}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    bottom: 20,
    right: 16,
    alignItems: "center",
    gap: 10,
    zIndex: 20,
  },
  fab3dContainer: {
    position: "relative",
  },
  fabShadow: {
    position: "absolute",
    bottom: 0,
  },
  fabWrapper: {
    position: "absolute",
    top: 0,
  },
  fabButton: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
});

export default FloatingButton;
