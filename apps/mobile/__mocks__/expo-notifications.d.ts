declare const _default: {
    getPermissionsAsync: jest.Mock<Promise<{
        status: string;
        granted: boolean;
    }>, [], any>;
    requestPermissionsAsync: jest.Mock<Promise<{
        status: string;
        granted: boolean;
    }>, [], any>;
    scheduleNotificationAsync: jest.Mock<Promise<string>, [], any>;
    cancelScheduledNotificationAsync: jest.Mock<Promise<void>, [], any>;
    setNotificationHandler: jest.Mock<any, any, any>;
    addNotificationReceivedListener: jest.Mock<{
        remove: jest.Mock<any, any, any>;
    }, [], any>;
    addNotificationResponseReceivedListener: jest.Mock<{
        remove: jest.Mock<any, any, any>;
    }, [], any>;
    removeNotificationSubscription: jest.Mock<any, any, any>;
    getExpoPushTokenAsync: jest.Mock<Promise<{
        data: string;
    }>, [], any>;
    setNotificationChannelAsync: jest.Mock<Promise<void>, [], any>;
    AndroidImportance: {
        DEFAULT: number;
        HIGH: number;
        LOW: number;
        MAX: number;
        MIN: number;
        NONE: number;
        UNSPECIFIED: number;
    };
};
export default _default;
//# sourceMappingURL=expo-notifications.d.ts.map