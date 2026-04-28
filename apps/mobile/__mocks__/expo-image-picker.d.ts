declare const _default: {
    requestPermissionsAsync: jest.Mock<Promise<{
        status: string;
        granted: boolean;
    }>, [], any>;
    requestMediaLibraryPermissionsAsync: jest.Mock<Promise<{
        status: string;
        granted: boolean;
    }>, [], any>;
    launchImageLibraryAsync: jest.Mock<Promise<{
        canceled: boolean;
        assets: {
            uri: string;
            width: number;
            height: number;
        }[];
    }>, [], any>;
    launchCameraAsync: jest.Mock<Promise<{
        canceled: boolean;
        assets: {
            uri: string;
            width: number;
            height: number;
        }[];
    }>, [], any>;
    MediaTypeOptions: {
        All: string;
        Images: string;
        Videos: string;
    };
};
export default _default;
//# sourceMappingURL=expo-image-picker.d.ts.map