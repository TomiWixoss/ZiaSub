/**
 * Expo Config Plugin to increase AsyncStorage database size on Android
 * Default is 6MB, this increases it to 200MB
 */
const { withGradleProperties } = require("expo/config-plugins");

const withAsyncStorageSize = (config, { size = 200 } = {}) => {
  return withGradleProperties(config, (config) => {
    // Remove existing AsyncStorage_db_size_in_MB if present
    config.modResults = config.modResults.filter(
      (item) => item.key !== "AsyncStorage_db_size_in_MB"
    );

    // Add new size configuration
    config.modResults.push({
      type: "property",
      key: "AsyncStorage_db_size_in_MB",
      value: String(size),
    });

    return config;
  });
};

module.exports = withAsyncStorageSize;
