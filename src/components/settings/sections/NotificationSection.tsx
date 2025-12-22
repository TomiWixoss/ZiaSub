import React from "react";
import { View, StyleSheet, Switch, Linking, Platform } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { NotificationSettings } from "@src/types";
import Button3D from "@components/common/Button3D";
import { notificationService } from "@services/notificationService";

interface NotificationSectionProps {
  notificationSettings: NotificationSettings;
  onNotificationChange: (settings: NotificationSettings) => void;
}

interface ToggleRowProps {
  icon: string;
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const NotificationSection: React.FC<NotificationSectionProps> = ({
  notificationSettings,
  onNotificationChange,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(notificationThemedStyles);
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(
    null
  );

  React.useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const permission = await notificationService.checkPermission();
    setHasPermission(permission);
  };

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setHasPermission(granted);
    if (!granted && Platform.OS === "android") {
      Linking.openSettings();
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    onNotificationChange({ ...notificationSettings, [key]: value });
  };

  const ToggleRow: React.FC<ToggleRowProps> = ({
    icon,
    label,
    hint,
    value,
    onValueChange,
    disabled,
  }) => (
    <View style={[themedStyles.toggleRow, disabled && styles.disabled]}>
      <View style={styles.toggleInfo}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={value && !disabled ? colors.success : colors.textMuted}
        />
        <View style={styles.textContainer}>
          <Text style={themedStyles.settingLabel}>{label}</Text>
          {hint && <Text style={themedStyles.settingHint}>{hint}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.success }}
        thumbColor={value ? "#FFFFFF" : colors.surfaceElevated}
      />
    </View>
  );

  const isEnabled = notificationSettings.enabled;

  return (
    <View style={styles.container}>
      {/* Toggle bật/tắt chung */}
      <ToggleRow
        icon="bell-outline"
        label={t("settings.notification.enabled")}
        hint={t("settings.notification.enabledHint")}
        value={notificationSettings.enabled}
        onValueChange={(v) => updateSetting("enabled", v)}
      />

      {/* Trạng thái quyền */}
      {isEnabled && hasPermission === false && (
        <View style={themedStyles.permissionWarning}>
          <Text style={themedStyles.warningText}>
            {t("settings.notification.noPermission")}
          </Text>
          <Button3D
            title={t("settings.notification.grantPermission")}
            icon="bell-ring"
            onPress={handleRequestPermission}
            variant="primary"
            size="small"
          />
        </View>
      )}

      {isEnabled && hasPermission === true && (
        <>
          <Text style={themedStyles.permissionGranted}>
            {t("settings.notification.permissionGranted")}
          </Text>

          {/* Nguồn thông báo */}
          <Text style={themedStyles.sectionTitle}>
            {t("settings.notification.sourceTitle")}
          </Text>

          <ToggleRow
            icon="playlist-play"
            label={t("settings.notification.fromQueue")}
            hint={t("settings.notification.fromQueueHint")}
            value={notificationSettings.fromQueue}
            onValueChange={(v) => updateSetting("fromQueue", v)}
          />

          <ToggleRow
            icon="translate"
            label={t("settings.notification.fromDirect")}
            hint={t("settings.notification.fromDirectHint")}
            value={notificationSettings.fromDirect}
            onValueChange={(v) => updateSetting("fromDirect", v)}
          />

          {/* Loại thông báo */}
          <Text style={themedStyles.sectionTitle}>
            {t("settings.notification.typeTitle")}
          </Text>

          <ToggleRow
            icon="check-circle-outline"
            label={t("settings.notification.onComplete")}
            hint={t("settings.notification.onCompleteHint")}
            value={notificationSettings.onComplete}
            onValueChange={(v) => updateSetting("onComplete", v)}
          />

          <ToggleRow
            icon="progress-check"
            label={t("settings.notification.onBatchComplete")}
            hint={t("settings.notification.onBatchCompleteHint")}
            value={notificationSettings.onBatchComplete}
            onValueChange={(v) => updateSetting("onBatchComplete", v)}
          />

          <ToggleRow
            icon="alert-circle-outline"
            label={t("settings.notification.onError")}
            hint={t("settings.notification.onErrorHint")}
            value={notificationSettings.onError}
            onValueChange={(v) => updateSetting("onError", v)}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
});

const notificationThemedStyles = createThemedStyles((colors) => ({
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  settingHint: {
    color: colors.textMuted,
    fontSize: 12,
    flexShrink: 1,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  permissionWarning: {
    backgroundColor: `${colors.warning}20`,
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 13,
    color: colors.warning,
  },
  permissionGranted: {
    fontSize: 12,
    color: colors.success,
    marginBottom: 16,
  },
}));

export default NotificationSection;
