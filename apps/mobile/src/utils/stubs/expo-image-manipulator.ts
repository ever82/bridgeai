/**
 * Stub for expo-image-manipulator (package not installed)
 */
export const SaveFormat = {
  JPEG: 'jpeg',
  PNG: 'png',
  WEBP: 'webp',
} as const;

export const manipulateAsync = async (
  _uri: string,
  _actions: any[],
  _saveOptions?: any,
): Promise<{ uri: string; width: number; height: number }> => {
  throw new Error('expo-image-manipulator is not installed');
};
