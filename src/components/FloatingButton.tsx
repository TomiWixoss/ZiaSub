import React, { useRef, useEffect } from "react";
import { Animated, Pressable, StyleSheet, View, Easing } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";

interface FloatingButtonProps {
  onPress: () => void;
  onSettingsPress: () => void;
  visible: boolean;
  hasSubtitles?: boolean;
  isTranslating?: boolean;
  translationProgress?: { completed: number; total: number } | null;
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
  const shadowColor = active ? COLORS.primaryDark : COLORS.background;
  const borderColor = active ? COLORS.primaryDark : COLORS.border;

  return (
    <View
      style={[
        styles.fab3dContainer,
        { width: size, height: size + SHADOW_HEIGHT },
      ]}
    >
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
        style={[styles.fabWrapper, { transform: [{ translateY }] }]}
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
          <MaterialCommunityIcons
            name={icon}
            size={iconSize}
            color={COLORS.text}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
};

interface TranslatingFabProps {
  onPress: () => void;
  progress: { completed: number; total: number } | null;
}

const TranslatingFab: React.FC<TranslatingFabProps> = ({
  onPress,
  progress,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Rotate border animation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Glow pulse animation
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );

    rotate.start();
    glow.start();

    return () => {
      rotate.stop();
      glow.stop();
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  const progressText = progress
    ? `${progress.completed}/${progress.total}`
    : "";

  return (
    <Pressable onPress={onPress}>
      <View style={styles.translatingContainer}>
        {/* Rotating border */}
        <Animated.View
          style={[styles.rotatingBorder, { transform: [{ rotate: spin }] }]}
        />
        {/* Glow effect */}
        <Animated.View style={[styles.glowEffect, { opacity: glowOpacity }]} />
        {/* Main button */}
        <View style={styles.translatingFab}>
          <MaterialCommunityIcons
            name="creation"
            size={26}
            color={COLORS.text}
          />
        </View>
        {/* Progress badge */}
        {progress && progress.total > 1 && (
          <View style={styles.progressBadge}>
            <Animated.Text style={styles.progressText}>
              {progressText}
            </Animated.Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const FloatingButton: React.FC<FloatingButtonProps> = ({
  onPress,
  onSettingsPress,
  visible,
  hasSubtitles = false,
  isTranslating = false,
  translationProgress = null,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.fabContainer}>
      <Fab3D onPress={onSettingsPress} icon="cog" size={40} iconSize={20} />
      {isTranslating ? (
        <TranslatingFab onPress={onPress} progress={translationProgress} />
      ) : (
        <Fab3D
          onPress={onPress}
          icon={hasSubtitles ? "subtitles" : "subtitles-outline"}
          size={52}
          iconSize={26}
          active={hasSubtitles}
        />
      )}
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
  translatingContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  rotatingBorder: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "transparent",
    borderTopColor: COLORS.primary,
    borderRightColor: COLORS.primaryLight,
  },
  glowEffect: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  translatingFab: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  progressBadge: {
    position: "absolute",
    bottom: -4,
    backgroundColor: COLORS.success,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  progressText: {
    color: COLORS.background,
    fontSize: 9,
    fontWeight: "700",
  },
});

export default FloatingButton;
