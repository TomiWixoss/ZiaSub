import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text as RNText,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
} from "react-native";
import { alert, confirmDestructive } from "../CustomAlert";
import Button3D from "../Button3D";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { COLORS } from "@constants/colors";
import {
  SubtitleSettings,
  BatchSettings,
  saveSubtitleSettings,
  saveBatchSettings,
  saveApiKeys,
} from "@utils/storage";
import { keyManager } from "@services/keyManager";

interface GeneralTabProps {
  subtitleSettings: SubtitleSettings;
  onSubtitleChange: (settings: SubtitleSettings) => void;
  batchSettings: BatchSettings;
  onBatchChange: (settings: BatchSettings) => void;
  apiKeys: string[];
  onApiKeysChange: (keys: string[]) => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({
  subtitleSettings,
  onSubtitleChange,
  batchSettings,
  onBatchChange,
  apiKeys,
  onApiKeysChange,
}) => {
  const [newKey, setNewKey] = useState("");
  const [showKeys, setShowKeys] = useState(false);

  const handleFontSizeChange = (value: number) => {
    const newSettings = { ...subtitleSettings, fontSize: Math.round(value) };
    onSubtitleChange(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const toggleBold = () => {
    const newSettings = {
      ...subtitleSettings,
      fontWeight: subtitleSettings.fontWeight === "bold" ? "normal" : "bold",
    } as SubtitleSettings;
    onSubtitleChange(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const toggleItalic = () => {
    const newSettings = {
      ...subtitleSettings,
      fontStyle: subtitleSettings.fontStyle === "italic" ? "normal" : "italic",
    } as SubtitleSettings;
    onSubtitleChange(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const handleBatchDurationChange = (value: number) => {
    const newSettings = { ...batchSettings, maxVideoDuration: value };
    onBatchChange(newSettings);
    saveBatchSettings(newSettings);
  };

  const handleConcurrentChange = (value: number) => {
    const newSettings = { ...batchSettings, maxConcurrentBatches: value };
    onBatchChange(newSettings);
    saveBatchSettings(newSettings);
  };

  const handleOffsetChange = (value: number) => {
    const newSettings = { ...batchSettings, batchOffset: value };
    onBatchChange(newSettings);
    saveBatchSettings(newSettings);
  };

  const handleAddKey = async () => {
    const key = newKey.trim();
    if (!key) return;
    if (apiKeys.includes(key)) {
      alert("Lỗi", "API Key này đã tồn tại.");
      return;
    }
    const newKeys = [...apiKeys, key];
    onApiKeysChange(newKeys);
    await saveApiKeys(newKeys);
    keyManager.initialize(newKeys);
    setNewKey("");
  };

  const handleDeleteKey = (index: number) => {
    confirmDestructive(
      "Xác nhận",
      "Bạn có chắc muốn xóa API Key này?",
      async () => {
        const newKeys = apiKeys.filter((_, i) => i !== index);
        onApiKeysChange(newKeys);
        await saveApiKeys(newKeys);
        keyManager.initialize(newKeys);
      }
    );
  };

  const maskKey = (key: string) => {
    if (key.length < 12) return "***";
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* API Keys Section */}
      <Text style={styles.sectionTitle}>API Keys</Text>
      <View style={styles.sectionHintRow}>
        <Text style={styles.sectionHint}>
          Thêm nhiều key để tự động xoay vòng khi bị rate limit.{" "}
        </Text>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL("https://aistudio.google.com/app/apikey")
          }
        >
          <Text style={styles.linkText}>Lấy key tại đây</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.apiKeysContainer}>
        {apiKeys.map((key, index) => (
          <View key={index} style={styles.apiKeyItem}>
            <View style={styles.apiKeyInfo}>
              <MaterialCommunityIcons
                name="key"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.apiKeyText}>
                {showKeys ? key : maskKey(key)}
              </Text>
              {index === keyManager.getCurrentKeyIndex() - 1 && (
                <View style={styles.activeKeyBadge}>
                  <Text style={styles.activeKeyText}>Đang dùng</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteKey(index)}
              style={styles.deleteKeyBtn}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={18}
                color={COLORS.error}
              />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.addKeyRow}>
          <TextInput
            style={styles.addKeyInput}
            value={newKey}
            onChangeText={setNewKey}
            placeholder="Nhập API Key mới..."
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showKeys}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => setShowKeys(!showKeys)}
            style={styles.eyeBtn}
          >
            <MaterialCommunityIcons
              name={showKeys ? "eye-off" : "eye"}
              size={20}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
          <View style={styles.addKeyBtnWrapper}>
            <Button3D
              icon="plus"
              variant="primary"
              onPress={handleAddKey}
              style={styles.addKeyBtn}
            />
          </View>
        </View>
      </View>

      {/* Subtitle Section */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Phụ đề</Text>

      <View style={styles.previewContainer}>
        <RNText
          style={[
            styles.previewText,
            {
              fontSize: subtitleSettings.fontSize,
              fontWeight:
                subtitleSettings.fontWeight === "bold" ? "700" : "400",
              fontStyle: subtitleSettings.fontStyle,
            },
          ]}
        >
          Xem trước phụ đề
        </RNText>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          Cỡ chữ: {subtitleSettings.fontSize}px
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={10}
          maximumValue={28}
          value={subtitleSettings.fontSize}
          onValueChange={handleFontSizeChange}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>

      <View style={[styles.styleButtonsRow, { marginBottom: 20 }]}>
        <Button3D
          onPress={toggleBold}
          icon="format-bold"
          title="Đậm"
          variant="secondary"
          active={subtitleSettings.fontWeight === "bold"}
          style={styles.styleButton}
        />
        <Button3D
          onPress={toggleItalic}
          icon="format-italic"
          title="Nghiêng"
          variant="secondary"
          active={subtitleSettings.fontStyle === "italic"}
          style={styles.styleButton}
        />
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          Vị trí (dọc): {subtitleSettings.portraitBottom ?? 100}px từ dưới
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={500}
          step={10}
          value={subtitleSettings.portraitBottom ?? 100}
          onValueChange={(value) => {
            const newSettings = { ...subtitleSettings, portraitBottom: value };
            onSubtitleChange(newSettings);
            saveSubtitleSettings(newSettings);
          }}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          Vị trí (ngang/fullscreen): {subtitleSettings.landscapeBottom ?? 8}px
          từ dưới
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={60}
          step={2}
          value={subtitleSettings.landscapeBottom ?? 8}
          onValueChange={(value) => {
            const newSettings = { ...subtitleSettings, landscapeBottom: value };
            onSubtitleChange(newSettings);
            saveSubtitleSettings(newSettings);
          }}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>

      {/* Batch Section */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Dịch video</Text>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          Thời lượng mỗi batch:{" "}
          {Math.floor(batchSettings.maxVideoDuration / 60)} phút
        </Text>
        <Text style={styles.settingHint}>
          Video dài hơn sẽ được chia thành nhiều phần
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={300}
          maximumValue={1800}
          step={60}
          value={batchSettings.maxVideoDuration}
          onValueChange={handleBatchDurationChange}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          Batch đồng thời: {batchSettings.maxConcurrentBatches}
        </Text>
        <Text style={styles.settingHint}>
          Số API call chạy song song (cao = nhanh nhưng tốn quota)
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={batchSettings.maxConcurrentBatches}
          onValueChange={handleConcurrentChange}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          Offset dung sai: {Math.floor((batchSettings.batchOffset ?? 60) / 60)}{" "}
          phút {(batchSettings.batchOffset ?? 60) % 60}s
        </Text>
        <Text style={styles.settingHint}>
          Video dài hơn batch tối đa nhưng trong khoảng offset sẽ không bị tách
          (VD: 10p + 1p offset = video 11p vẫn dịch 1 lần)
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={300}
          step={30}
          value={batchSettings.batchOffset ?? 60}
          onValueChange={handleOffsetChange}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sectionHint: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  sectionHintRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 12,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 12,
    textDecorationLine: "underline",
  },
  apiKeysContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  apiKeyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  apiKeyInfo: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  apiKeyText: { color: COLORS.text, fontSize: 13, flex: 1 },
  activeKeyBadge: {
    backgroundColor: COLORS.success,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeKeyText: { color: COLORS.background, fontSize: 10, fontWeight: "600" },
  deleteKeyBtn: { padding: 4 },
  addKeyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    gap: 8,
    paddingTop: 4,
  },
  addKeyInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    height: 52,
    color: COLORS.text,
    fontSize: 13,
  },
  eyeBtn: { padding: 8, height: 52, justifyContent: "center" },
  addKeyBtnWrapper: {
    width: 56,
  },
  addKeyBtn: {
    // Don't override height - let Button3D use default
  },
  previewContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    minHeight: 60,
    justifyContent: "center",
  },
  previewText: {
    color: COLORS.text,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  settingRow: { marginBottom: 16 },
  settingGroup: { marginBottom: 16 },
  settingLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  settingHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  slider: { width: "100%", height: 40 },
  styleButtonsRow: { flexDirection: "row", gap: 12 },
  styleButton: { flex: 1 },
});

export default GeneralTab;
