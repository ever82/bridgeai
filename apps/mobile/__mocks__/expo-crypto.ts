export const CryptoDigestAlgorithm = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA384: 'SHA-384',
  SHA512: 'SHA-512',
};

export async function digestStringAsync(
  _algorithm: string,
  data: string,
  _options?: { encoding?: string }
): Promise<string> {
  // Simple mock: return a deterministic hex string based on input
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0').substring(0, 64);
}

export async function getRandomBytesAsync(length: number): Promise<Uint8Array> {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}
