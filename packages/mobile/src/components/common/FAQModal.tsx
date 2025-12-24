import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
  Linking,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

const GITHUB_URL = "https://github.com/TomiWixoss/ZiaSub";
const FACEBOOK_URL = "https://www.facebook.com/TomiSakaeAnime/";
const ZALO_URL = "https://zalo.me/0762605309";
const AUTHOR = "TomiSakae";

interface FAQModalProps {
  visible: boolean;
  onClose: () => void;
}

interface FAQItem {
  id: string;
  questionKey: string;
  answerKey: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "ad_warning",
    questionKey: "faq.adWarning.question",
    answerKey: "faq.adWarning.answer",
    icon: "advertisements-off",
  },
  {
    id: "video_error",
    questionKey: "faq.videoError.question",
    answerKey: "faq.videoError.answer",
    icon: "alert-circle-outline",
  },
  {
    id: "how_translate",
    questionKey: "faq.howTranslate.question",
    answerKey: "faq.howTranslate.answer",
    icon: "translate",
  },
  {
    id: "api_key",
    questionKey: "faq.apiKey.question",
    answerKey: "faq.apiKey.answer",
    icon: "key-outline",
  },
  {
    id: "queue",
    questionKey: "faq.queue.question",
    answerKey: "faq.queue.answer",
    icon: "playlist-play",
  },
  {
    id: "subtitle_position",
    questionKey: "faq.subtitlePosition.question",
    answerKey: "faq.subtitlePosition.answer",
    icon: "subtitles-outline",
  },
];

const FAQModal: React.FC<FAQModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const themedStyles = useThemedStyles(faqThemedStyles);
  const [expandedId, setExpandedId] = useState<string | null>("video_error");

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

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenGithub = () => {
    Linking.openURL(GITHUB_URL);
  };

  const handleOpenFacebook = () => {
    Linking.openURL(FACEBOOK_URL);
  };

  const handleOpenZalo = () => {
    Linking.openURL(ZALO_URL);
  };

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalBackdrop,
            themedStyles.modalBackdrop,
            { opacity: fadeAnim },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomSheet,
            themedStyles.bottomSheet,
            {
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={[styles.dragHandle, themedStyles.dragHandle]} />
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <MaterialCommunityIcons
                  name="help-circle"
                  size={22}
                  color={colors.primary}
                />
                <Text style={themedStyles.title}>{t("faq.title")}</Text>
              </View>
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
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {FAQ_ITEMS.map((item) => (
              <View
                key={item.id}
                style={[styles.faqItem, themedStyles.faqItem]}
              >
                <Pressable
                  onPress={() => toggleExpand(item.id)}
                  style={styles.questionRow}
                >
                  <View style={styles.questionLeft}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={20}
                      color={
                        expandedId === item.id
                          ? colors.primary
                          : colors.textMuted
                      }
                    />
                    <Text
                      style={[
                        themedStyles.questionText,
                        expandedId === item.id && themedStyles.questionActive,
                      ]}
                    >
                      {t(item.questionKey)}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={
                      expandedId === item.id ? "chevron-up" : "chevron-down"
                    }
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
                {expandedId === item.id && (
                  <View
                    style={[
                      styles.answerContainer,
                      themedStyles.answerContainer,
                    ]}
                  >
                    <Text style={themedStyles.answerText}>
                      {t(item.answerKey)}
                    </Text>
                  </View>
                )}
              </View>
            ))}

            {/* Author & GitHub */}
            <View style={[styles.aboutSection, themedStyles.aboutSection]}>
              <View style={styles.aboutRow}>
                <MaterialCommunityIcons
                  name="account"
                  size={18}
                  color={colors.textMuted}
                />
                <Text style={themedStyles.aboutLabel}>{t("faq.madeBy")}</Text>
                <Text style={themedStyles.aboutValue}>{AUTHOR}</Text>
              </View>
              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={handleOpenGithub}
                >
                  <MaterialCommunityIcons
                    name="github"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={themedStyles.socialText}>GitHub</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={handleOpenFacebook}
                >
                  <MaterialCommunityIcons
                    name="facebook"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={themedStyles.socialText}>Facebook</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={handleOpenZalo}
                >
                  <MaterialCommunityIcons
                    name="chat"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={themedStyles.socialText}>Zalo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    width: "100%",
    height: SHEET_HEIGHT,
    borderTopWidth: 1,
  },
  sheetHeader: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 16,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  faqItem: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  questionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  answerContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 12,
    marginHorizontal: 14,
    marginLeft: 46,
    borderTopWidth: 1,
  },
  aboutSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});

const faqThemedStyles = createThemedStyles((colors) => ({
  modalBackdrop: { backgroundColor: colors.overlay },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  dragHandle: { backgroundColor: colors.borderLight },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  faqItem: {
    backgroundColor: colors.surfaceLight,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  questionActive: {
    color: colors.primary,
  },
  answerContainer: {
    borderTopColor: colors.border,
  },
  answerText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  aboutSection: {
    borderTopColor: colors.border,
  },
  aboutLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  aboutValue: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text,
  },
  socialText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.primary,
  },
}));

export default FAQModal;
