const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = Array.from(
  new Set([...config.resolver.sourceExts, 'geojson', 'cjs', 'mjs']),
);

module.exports = config;
