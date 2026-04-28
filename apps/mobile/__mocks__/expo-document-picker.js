"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    getDocumentAsync: jest.fn(async () => ({
        canceled: false,
        assets: [
            {
                uri: 'mock-document-uri',
                name: 'test-document.pdf',
                mimeType: 'application/pdf',
                size: 1024,
            },
        ],
    })),
};
//# sourceMappingURL=expo-document-picker.js.map