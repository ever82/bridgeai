"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPEN_CREATE = exports.OPEN_READWRITE = exports.DEBUG = exports.openDatabase = void 0;
const mockRows = {
    length: 0,
    item: jest.fn((_index) => ({ count: 0 })),
    raw: jest.fn(() => []),
};
const mockDatabase = {
    executeSql: jest.fn().mockResolvedValue([{ rows: mockRows }]),
    close: jest.fn().mockResolvedValue(undefined),
};
exports.openDatabase = jest.fn().mockResolvedValue(mockDatabase);
exports.DEBUG = jest.fn();
exports.OPEN_READWRITE = 2;
exports.OPEN_CREATE = 8;
exports.default = {
    openDatabase: exports.openDatabase,
    DEBUG: exports.DEBUG,
    OPEN_READWRITE: exports.OPEN_READWRITE,
    OPEN_CREATE: exports.OPEN_CREATE,
};
//# sourceMappingURL=react-native-sqlite-storage.js.map