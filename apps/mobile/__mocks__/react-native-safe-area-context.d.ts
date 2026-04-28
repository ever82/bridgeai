export declare const SafeAreaProvider: jest.Mock<any, [any], any>;
export declare const SafeAreaView: jest.Mock<any, [any], any>;
export declare const SafeAreaInsetsContext: {
    Consumer: jest.Mock<any, [any], any>;
    Provider: jest.Mock<any, [any], any>;
};
export declare const SafeAreaFrameContext: {
    Consumer: jest.Mock<any, [any], any>;
    Provider: jest.Mock<any, [any], any>;
};
export declare const useSafeAreaInsets: jest.Mock<{
    top: number;
    right: number;
    bottom: number;
    left: number;
}, [], any>;
export declare const useSafeAreaFrame: jest.Mock<{
    x: number;
    y: number;
    width: number;
    height: number;
}, [], any>;
export declare const initialWindowMetrics: {
    frame: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    insets: {
        top: number;
        left: number;
        right: number;
        bottom: number;
    };
};
export declare const initialWindowMetricsAsync: jest.Mock<Promise<{
    frame: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    insets: {
        top: number;
        left: number;
        right: number;
        bottom: number;
    };
}>, [], any>;
//# sourceMappingURL=react-native-safe-area-context.d.ts.map