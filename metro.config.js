const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable Expo Router - this project uses React Navigation with index.ts entry
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
