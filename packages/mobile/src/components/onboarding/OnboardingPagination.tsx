import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@src/contexts";

interface OnboardingPaginationProps {
  totalSteps: number;
  currentStep: number;
}

export const OnboardingPagination: React.FC<OnboardingPaginationProps> = ({
  totalSteps,
  currentStep,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor:
                index === currentStep ? colors.primary : colors.border,
              width: index === currentStep ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
