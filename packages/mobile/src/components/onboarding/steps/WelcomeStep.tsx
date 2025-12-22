import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import Button3D from "@components/common/Button3D";
import { Ionicons } from "@expo/vector-icons";

interface StepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const WelcomeStep: React.FC<StepProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.surfaceLight },
          ]}
        >
          <Ionicons name="sparkles" size={64} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {t("onboarding.welcome.title")}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t("onboarding.welcome.subtitle")}
        </Text>

        <View style={styles.features}>
          {["feature1", "feature2", "feature3"].map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View
                style={[styles.featureDot, { backgroundColor: colors.primary }]}
              />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                {t(`onboarding.welcome.${feature}`)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button3D
          title={t("onboarding.getStarted")}
          onPress={onNext}
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  features: {
    alignSelf: "stretch",
    gap: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  footer: {
    paddingTop: 24,
  },
  button: {
    width: "100%",
  },
});
