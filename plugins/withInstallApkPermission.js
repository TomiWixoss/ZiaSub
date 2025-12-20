const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withInstallApkPermission(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Add REQUEST_INSTALL_PACKAGES permission
    const permissions = androidManifest.manifest["uses-permission"] || [];

    const hasPermission = permissions.some(
      (p) =>
        p.$["android:name"] === "android.permission.REQUEST_INSTALL_PACKAGES"
    );

    if (!hasPermission) {
      permissions.push({
        $: {
          "android:name": "android.permission.REQUEST_INSTALL_PACKAGES",
        },
      });
    }

    androidManifest.manifest["uses-permission"] = permissions;

    return config;
  });
};
