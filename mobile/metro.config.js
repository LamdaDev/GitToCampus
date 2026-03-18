const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');

config.resolver.sourceExts = Array.from(
  new Set([...config.resolver.sourceExts, 'svg', 'geojson', 'cjs', 'mjs']),
);

module.exports = config;
