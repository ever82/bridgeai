"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTailwind = void 0;
// NativeWind mock
exports.useTailwind = jest.fn(() => ({
    className: (_className) => ({
        style: {},
    }),
}));
exports.default = {
    useTailwind: exports.useTailwind,
};
//# sourceMappingURL=nativewind.js.map