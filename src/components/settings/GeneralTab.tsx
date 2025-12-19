import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import type { SubtitleSettings, BatchSettings, TTSSettings } from "@src/types";
import {
  ApiKeysSection,
  SubtitleSection,
  BatchSection,
  TTSSection,
} from "./sections";

interface GeneralTabProps {
  subtitleSettings: SubtitleSettings;
  onSubtitleChange: (settings: SubtitleSettings) => void;
  batchSettings: BatchSettings;
  onBatchChange: (settings: BatchSettings) => void;
  apiKeys: string[];
  onApiKeysChange: (keys: string[]) => void;
  ttsSettings: TTSSettings;
  onTTSChange: (settings: TTSSettings) => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({
  subtitleSettings,
  onSubtitleChange,
  batchSettings,
  onBatchChange,
  apiKeys,
  onApiKeysChange,
  ttsSettings,
  onTTSChange,
}) => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ApiKeysSection apiKeys={apiKeys} onApiKeysChange={onApiKeysChange} />

      <SubtitleSection
        subtitleSettings={subtitleSettings}
        onSubtitleChange={onSubtitleChange}
      />

      <BatchSection
        batchSettings={batchSettings}
        onBatchChange={onBatchChange}
      />

      <TTSSection ttsSettings={ttsSettings} onTTSChange={onTTSChange} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default GeneralTab;
