import React from "react";
import { View, StyleSheet, Switch, Linking, Platform } from "react-native";
import { Text } from "react-native-paper";
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
      <View style={themedStyles.row}>
        <View style={styles.labelContainer}>
          <Text style={themedStyles.label}>
            {t("settings.notification.enabled")}
          </Text>
          <Text style={themedStyles.hint}>
            {t("settings.notification.enabledHint")}
          </Text>
        </View>
        <Switch
          value={notificationSettings.enabled}
          onValueChange={handleToggle}
          trackColor={{ false: colors.border, true: `${colors.primary}80` }}
          thumbColor={
            notificationSettings.enabled ? colors.primary : colors.textMuted
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
    gap: 16,
  },
  labelContainer: {
    flex: 1,
  },
});

const notificationThemedStyles = createThemedStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
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
