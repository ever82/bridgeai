"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    setItem: jest.fn(async () => { }),
    getItem: jest.fn(async () => null),
    removeItem: jest.fn(async () => { }),
    getAllKeys: jest.fn(async () => []),
    multiGet: jest.fn(async () => []),
    multiSet: jest.fn(async () => { }),
    multiRemove: jest.fn(async () => { }),
    mergeItem: jest.fn(async () => { }),
    clear: jest.fn(async () => { }),
    useAsyncStorage: jest.fn((_key) => ({
        getItem: jest.fn(async () => null),
        setItem: jest.fn(async () => { }),
        removeItem: jest.fn(async () => { }),
        mergeItem: jest.fn(async () => { }),
    })),
};
//# sourceMappingURL=async-storage.js.map