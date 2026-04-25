/**
 * Stub for expo-crypto (package not installed)
 */
export const digestStringAsync = async (
  _algorithm: string,
  _data: string,
  _options?: any,
): Promise<string> => {
  throw new Error('expo-crypto is not installed');
};

export const getRandomValuesAsync = async (length: number): Promise<Uint8Array> => {
  return new Uint8Array(length);
};

export const CryptoEncoding = {
  HEX: 'hex',
  BASE64: 'base64',
};
