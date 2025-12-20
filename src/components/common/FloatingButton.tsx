import React, { useRef, useEffect } from "react";
import { Animated, Pressable, StyleSheet, View, Easing } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@src/contexts";

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
  isChatLoading?: boolean;
  hasUpdate?: boolean;
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
  const { colors, isDark } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const handlePressIn = () => animatedValue.setValue(1);
  const handlePressOut = () => animatedValue.setValue(0);
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SHADOW_HEIGHT],
  });
  const bgColor = active ? colors.primary : colors.surface;
  const shadowColor = active
    ? colors.primaryDark
    : isDark
    ? colors.background
    : colors.border;
  const borderColor = active
    ? colors.primaryDark
    : isDark
    ? colors.border
    : colors.borderLight;
  // Always use white for active state icon
  const iconColor = active ? "#FFFFFF" : colors.text;

  return (
    <View
      style={{
        width: size,
        height: size + SHADOW_HEIGHT,
        position: "relative",
      }}
    >
      <View
        style={{
          position: "absolute",
          bottom: 0,
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: shadowColor,
        }}
      />
      <Animated.View
        style={{ position: "absolute", top: 0, transform: [{ translateY }] }}
      >
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={{
            width: size,
            height: size,
            borderRadius: size * 0.3,
            backgroundColor: bgColor,
            borderColor,
            borderWidth: 2,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <MaterialCommunityIcons
            name={icon}
            size={iconSize}
            color={iconColor}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const ChatFab: React.FC<{ onPress: () => void; isLoading: boolean }> = ({
  onPress,
  isLoading,
}) => {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isLoading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isLoading]);
  if (!isLoading)
    return (
      <Fab3D onPress={onPress} icon="robot-outline" size={40} iconSize={20} />
    );
  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });
  const glowScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });
  return (
    <Pressable onPress={onPress}>
      <View style={styles.chatLoadingContainer}>
        <Animated.View
          style={[
            styles.chatGlowEffect,
            {
              backgroundColor: colors.primary,
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        <View
          style={[
            styles.chatLoadingFab,
            {
              backgroundColor: colors.primary,
              borderColor: colors.primaryDark,
            },
          ]}
        >
          <MaterialCommunityIcons name="robot" size={20} color="#FFFFFF" />
        </View>
      </View>
    </Pressable>
  );
};

const TranslatingFab: React.FC<{
  onPress: () => void;
  progress: { completed: number; total: number } | null;
}> = ({ onPress, progress }) => {
  const { colors, isDark } = useTheme();
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
        <Animated.View
          style={[
            styles.glowEffect,
            {
              backgroundColor: colors.primary,
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.translatingFab,
            { borderColor: colors.primary, opacity: borderOpacity },
          ]}
        >
          <View
            style={[
              styles.translatingFabInner,
              {
                backgroundColor: isDark
                  ? colors.surfaceElevated
                  : colors.surface,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="creation"
              size={26}
              color={colors.primary}
            />
          </View>
        </Animated.View>
        {progress && progress.total > 1 && (
          <View
            style={[styles.progressBadge, { backgroundColor: colors.success }]}
          >
            <Animated.Text style={[styles.progressText, { color: "#FFFFFF" }]}>
              {progressText}
            </Animated.Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const FloatingButton: React.FC<FloatingButtonProps> = (props) => {
  const { colors } = useTheme();
  const {
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
    isChatLoading = false,
    hasUpdate = false,
  } = props;
  const bottomPosition = isVideoPage ? 20 : 80;
  return (
    <>
      <View style={[styles.fabColumnLeft, { bottom: bottomPosition }]}>
        <View style={styles.settingsBtnWrapper}>
          <Fab3D onPress={onSettingsPress} icon="cog" size={40} iconSize={20} />
          {hasUpdate && (
            <View
              style={[styles.updateBadge, { backgroundColor: colors.error }]}
            />
          )}
        </View>
        <View style={styles.queueRow}>
          <View style={styles.queueBtnWrapper}>
            <Fab3D
              onPress={onQueuePress}
              icon="playlist-play"
              size={40}
              iconSize={20}
            />
            {queueCount > 0 && (
              <View
                style={[styles.queueBadge, { backgroundColor: colors.primary }]}
              >
                <Animated.Text
                  style={[styles.queueBadgeText, { color: "#FFFFFF" }]}
                >
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
      <View style={[styles.fabColumnRight, { bottom: bottomPosition }]}>
        <ChatFab onPress={onChatPress} isLoading={isChatLoading} />
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
  settingsBtnWrapper: { position: "relative" },
  updateBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  queueRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  queueBtnWrapper: { position: "relative" },
  queueBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  queueBadgeText: { fontSize: 10, fontWeight: "700" },
  translatingContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  glowEffect: { position: "absolute", width: 56, height: 56, borderRadius: 18 },
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
    justifyContent: "center",
    alignItems: "center",
  },
  progressBadge: {
    position: "absolute",
    bottom: -4,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  progressText: { fontSize: 9, fontWeight: "700" },
  chatLoadingContainer: {
    width: 44,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  chatGlowEffect: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  chatLoadingFab: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default FloatingButton;
