/**
 * Stub for react-native-fs (package not installed)
 */
export const DocumentDirectoryPath = '';
export const CachesDirectoryPath = '';
export const MainBundlePath = '';

export const readFile = async (_path: string): Promise<string> => {
  throw new Error('react-native-fs is not installed');
};
export const writeFile = async (_path: string, _content: string): Promise<void> => {
  throw new Error('react-native-fs is not installed');
};
export const exists = async (_path: string): Promise<boolean> => false;
export const mkdir = async (_path: string): Promise<void> => {};
export const unlink = async (_path: string): Promise<void> => {};
export const readDir = async (_path: string): Promise<any[]> => [];
export const copyFile = async (_from: string, _to: string): Promise<void> => {};
export const moveFile = async (_from: string, _to: string): Promise<void> => {};
export default {
  DocumentDirectoryPath,
  CachesDirectoryPath,
  MainBundlePath,
  readFile,
  writeFile,
  exists,
  mkdir,
  unlink,
  readDir,
  copyFile,
  moveFile,
};
