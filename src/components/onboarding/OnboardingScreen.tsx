import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
} from "react-native";
import { useTheme } from "@src/contexts";
import { WelcomeStep } from "./steps/WelcomeStep";
import { StorageStep } from "./steps/StorageStep";
import { ThemeStep } from "./steps/ThemeStep";
import { LanguageStep } from "./steps/LanguageStep";
import { ApiKeyStep } from "./steps/ApiKeyStep";
import { OnboardingPagination } from "./OnboardingPagination";

const { width } = Dimensions.get("window");

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
}) => {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const steps = [
    { key: "welcome", component: WelcomeStep },
    { key: "storage", component: StorageStep },
    { key: "theme", component: ThemeStep },
    { key: "language", component: LanguageStep },
    { key: "apiKey", component: ApiKeyStep },
  ];

  const goToNext = () => {
    if (currentIndex < steps.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onComplete();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1 });
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderStep = ({
    item,
    index,
  }: {
    item: (typeof steps)[0];
    index: number;
  }) => {
    const StepComponent = item.component;
    return (
      <View style={[styles.stepContainer, { width }]}>
        <StepComponent
          onNext={goToNext}
          onPrevious={goToPrevious}
          onSkip={onComplete}
          isFirst={index === 0}
          isLast={index === steps.length - 1}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={steps}
        renderItem={renderStep}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEnabled={false}
      />
      <OnboardingPagination
        totalSteps={steps.length}
        currentStep={currentIndex}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
});
