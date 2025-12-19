import React, { useRef, useEffect } from "react";
import { Animated, Pressable, StyleSheet, View, Easing } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";

interface FloatingButtonProps {
  onPress: () => void;
  onSettingsPress: () => void;
  onQueuePress: () => void;
  onChatPress: () => void;
  onAddToQueuePress?: () => void;
  isVideoPage: boolean;
  hasSubtitles?: boolean;
  isTranslating?: boolean;
  translationProgress?: { completed: number; total: number } | null;
  queueCount?: number;
  isInQueue?: boolean;
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

  const handlePressIn = () => animatedValue.setValue(1);
  const handlePressOut = () => animatedValue.setValue(0);

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
              borderColor,
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
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const borderOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const glowScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const progressText = progress
    ? `${progress.completed}/${progress.total}`
    : "";

  return (
    <Pressable onPress={onPress}>
      <View style={styles.translatingContainer}>
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.glowEffect,
            { opacity: glowOpacity, transform: [{ scale: glowScale }] },
          ]}
        />
        {/* Main button with animated border */}
        <Animated.View
          style={[
            styles.translatingFab,
            { borderColor: COLORS.primary, opacity: borderOpacity },
          ]}
        >
          <View style={styles.translatingFabInner}>
            <MaterialCommunityIcons
              name="creation"
              size={26}
              color={COLORS.text}
            />
          </View>
        </Animated.View>
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
  onQueuePress,
  onChatPress,
  onAddToQueuePress,
  isVideoPage,
  hasSubtitles = false,
  isTranslating = false,
  translationProgress = null,
  queueCount = 0,
  isInQueue = false,
}) => {
  // Higher position when on list page to avoid YouTube nav bar
  const bottomPosition = isVideoPage ? 20 : 80;
  const rowHeight = 44 + 10; // button height + gap

  return (
    <>
      {/* Left column: Settings on top, Queue+Add below */}
      <View style={[styles.fabColumnLeft, { bottom: bottomPosition }]}>
        <Fab3D onPress={onSettingsPress} icon="cog" size={40} iconSize={20} />
        <View style={styles.queueRow}>
          <View style={styles.queueBtnWrapper}>
            <Fab3D
              onPress={onQueuePress}
              icon="playlist-play"
              size={40}
              iconSize={20}
            />
            {queueCount > 0 && (
              <View style={styles.queueBadge}>
                <Animated.Text style={styles.queueBadgeText}>
                  {queueCount}
                </Animated.Text>
              </View>
            )}
          </View>
          {isVideoPage && onAddToQueuePress && (
            <Fab3D
              onPress={onAddToQueuePress}
              icon={isInQueue ? "playlist-check" : "playlist-plus"}
              size={40}
              iconSize={20}
              active={isInQueue}
            />
          )}
        </View>
      </View>

      {/* Right column: AI (aligned with bottom row when no video, or above Sub when video) */}
      <View style={[styles.fabColumnRight, { bottom: bottomPosition }]}>
        <Fab3D
          onPress={onChatPress}
          icon="robot-outline"
          size={40}
          iconSize={20}
        />
        {isVideoPage &&
          (isTranslating ? (
            <TranslatingFab onPress={onPress} progress={translationProgress} />
          ) : (
            <Fab3D
              onPress={onPress}
              icon={hasSubtitles ? "subtitles" : "subtitles-outline"}
              size={52}
              iconSize={26}
              active={hasSubtitles}
            />
          ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  fabColumnLeft: {
    position: "absolute",
    left: 16,
    alignItems: "flex-start",
    gap: 10,
    zIndex: 20,
  },
  fabColumnRight: {
    position: "absolute",
    right: 16,
    alignItems: "center",
    gap: 10,
    zIndex: 20,
  },
  queueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  queueBtnWrapper: { position: "relative" },
  queueBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  queueBadgeText: { color: COLORS.background, fontSize: 10, fontWeight: "700" },
  fab3dContainer: { position: "relative" },
  fabShadow: { position: "absolute", bottom: 0 },
  fabWrapper: { position: "absolute", top: 0 },
  fabButton: { justifyContent: "center", alignItems: "center", borderWidth: 2 },
  translatingContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  glowEffect: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
  },
  translatingFab: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  translatingFabInner: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
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
