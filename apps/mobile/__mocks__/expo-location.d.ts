declare const _default: {
    requestPermissionsAsync: jest.Mock<Promise<{
        status: string;
        granted: boolean;
    }>, [], any>;
    getPermissionsAsync: jest.Mock<Promise<{
        status: string;
        granted: boolean;
    }>, [], any>;
    getCurrentPositionAsync: jest.Mock<Promise<{
        coords: {
            latitude: number;
            longitude: number;
            altitude: number;
            accuracy: number;
            altitudeAccuracy: number;
            heading: number;
            speed: number;
        };
        timestamp: number;
    }>, [], any>;
    watchPositionAsync: jest.Mock<Promise<{
        remove: jest.Mock<any, any, any>;
    }>, [], any>;
    Accuracy: {
        Lowest: number;
        Low: number;
        Balanced: number;
        High: number;
        Highest: number;
        BestForNavigation: number;
    };
};
export default _default;
//# sourceMappingURL=expo-location.d.ts.map