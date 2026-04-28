"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoDigestAlgorithm = void 0;
exports.digestStringAsync = digestStringAsync;
exports.getRandomBytesAsync = getRandomBytesAsync;
exports.CryptoDigestAlgorithm = {
    SHA1: 'SHA-1',
    SHA256: 'SHA-256',
    SHA384: 'SHA-384',
    SHA512: 'SHA-512',
};
async function digestStringAsync(_algorithm, data, _options) {
    // Simple mock: return a deterministic hex string based on input
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0').substring(0, 64);
}
async function getRandomBytesAsync(length) {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
}
//# sourceMappingURL=expo-crypto.js.map