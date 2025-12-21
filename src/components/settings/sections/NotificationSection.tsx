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

    // Nếu không được cấp quyền, mở settings
    if (!granted && Platform.OS === "android") {
      Linking.openSettings();
    }
  };

  const handleToggle = (value: boolean) => {
    onNotificationChange({ ...notificationSettings, enabled: value });
  };

  return (
    <View style={styles.container}>
      {/* Toggle bật/tắt */}
      <View style={themedStyles.toggleRow}>
        <View style={styles.toggleInfo}>
          <MaterialCommunityIcons
            name="bell-outline"
            size={20}
            color={
              notificationSettings.enabled ? colors.success : colors.textMuted
            }
          />
          <View style={styles.textContainer}>
            <Text style={themedStyles.settingLabel}>
              {t("settings.notification.enabled")}
            </Text>
            <Text style={themedStyles.settingHint}>
              {t("settings.notification.enabledHint")}
            </Text>
          </View>
        </View>
        <Switch
          value={notificationSettings.enabled}
          onValueChange={handleToggle}
          trackColor={{ false: colors.border, true: colors.success }}
          thumbColor={
            notificationSettings.enabled ? "#FFFFFF" : colors.surfaceElevated
          }
        />
      </View>

      {/* Trạng thái quyền */}
      {notificationSettings.enabled && hasPermission === false && (
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

      {notificationSettings.enabled && hasPermission === true && (
        <Text style={themedStyles.permissionGranted}>
          {t("settings.notification.permissionGranted")}
        </Text>
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
});

const notificationThemedStyles = createThemedStyles((colors) => ({
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  settingHint: {
    color: colors.textMuted,
    fontSize: 12,
    flexShrink: 1,
  },
  permissionWarning: {
    backgroundColor: `${colors.warning}20`,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: colors.warning,
  },
  permissionGranted: {
    fontSize: 12,
    color: colors.success,
  },
}));

export default NotificationSection;
