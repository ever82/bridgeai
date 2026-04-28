"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    useVideoPlayer: jest.fn(() => ({
        play: jest.fn(),
        pause: jest.fn(),
        seekBy: jest.fn(),
        replay: jest.fn(),
    })),
    VideoView: jest.fn(() => null),
    VideoPlayer: jest.fn(),
    useEvent: jest.fn(() => ({})),
};
//# sourceMappingURL=expo-av.js.map