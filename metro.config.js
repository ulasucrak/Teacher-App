// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const existingBlockList = config.resolver.blockList;
const claudePath = `${__dirname}/.claude`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

config.resolver.blockList = [
  ...(Array.isArray(existingBlockList) ? existingBlockList : existingBlockList ? [existingBlockList] : []),
  new RegExp(`^${claudePath}(?:[/\\\\]|$)`),
];

module.exports = config;
