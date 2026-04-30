const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const stubsDir = path.join(projectRoot, 'src/utils/stubs');

const config = getDefaultConfig(projectRoot);

// In pnpm monorepo, find-yarn-workspace-root returns null, so we need to manually
// add the node_modules paths for Metro module resolution
// The monorepo uses pnpm --filter (not yarn workspaces), so we force the monorepo root
const monorepoRoot = path.resolve(projectRoot, '../..');

// Watch the shared package directory and the monorepo root node_modules so
// Metro can discover hoisted dependencies (e.g. @babel/runtime/helpers/*)
// installed at the monorepo root under pnpm's hoisted node-linker mode.
config.watchFolders = [
  path.join(workspaceRoot, 'packages/shared'),
  path.join(monorepoRoot, 'node_modules'),
];

config.resolver.nodeModulesPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(monorepoRoot, 'node_modules'),
];

// Keep Metro's hierarchical lookup enabled so deep imports like
// `@babel/runtime/helpers/interopRequireDefault` can fall back to the
// hoisted monorepo root node_modules when not present in apps/mobile.
config.resolver.disableHierarchicalLookup = false;

// Explicitly map @babel/runtime to the hoisted copy at the monorepo root so
// deep helper imports always resolve even if Metro's nodeModulesPaths
// fallback misses them under pnpm hoisted mode.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@babel/runtime': path.join(monorepoRoot, 'node_modules/@babel/runtime'),
};

// Resolve @bridgeai/shared workspace package to its source
const sharedSrc = path.join(workspaceRoot, 'packages/shared/src');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@bridgeai/shared')) {
    const subpath = moduleName.replace('@bridgeai/shared/', '');
    if (moduleName === '@bridgeai/shared') {
      return {
        filePath: path.join(sharedSrc, 'index.ts'),
        type: 'sourceFile',
      };
    }
    if (!subpath.includes('/')) {
      return {
        filePath: path.join(sharedSrc, `${subpath}.ts`),
        type: 'sourceFile',
      };
    }
    const resolved = path.join(sharedSrc, `${subpath}.ts`);
    return {
      filePath: resolved,
      type: 'sourceFile',
    };
  }

  // Stub expo-secure-store on web platform
  if (platform === 'web' && moduleName === 'expo-secure-store') {
    return {
      filePath: path.join(stubsDir, 'expo-secure-store.ts'),
      type: 'sourceFile',
    };
  }

  // Stub @react-native-async-storage/async-storage on web platform
  if (platform === 'web' && moduleName === '@react-native-async-storage/async-storage') {
    return {
      filePath: path.join(stubsDir, 'async-storage.ts'),
      type: 'sourceFile',
    };
  }

  // Stub packages that are referenced in code but not installed
  const missingNativePackages = [
    'react-native-fast-tflite',
    'react-native-vision-camera',
    'react-native-sqlite-storage',
    'react-native-fs',
    'expo-crypto',
    'expo-image-manipulator',
    'dotenv',
    'dotenv-expand',
  ];
  if (missingNativePackages.includes(moduleName)) {
    const stubFile = path.join(stubsDir, `${moduleName}.ts`);
    return {
      filePath: stubFile,
      type: 'sourceFile',
    };
  }

  // Fall back to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
