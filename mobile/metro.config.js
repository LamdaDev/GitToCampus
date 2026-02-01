/**
 * Purpose: Metro configuration for React Native
 * A .geojson file is basically JSON, but the extension is not always in Metro’s “known source extensions”. If Metro doesn’t recognize it, you’ll see errors like:
 * - "Unable to resolve module ./campus.geojson"
 * - or it treats it as a non-source asset and doesn’t load it like JSON
 */

const { getDefaultConfig } = require("@expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow importing `.geojson` files (treated like JSON)
config.resolver.sourceExts.push("geojson");

module.exports = config;