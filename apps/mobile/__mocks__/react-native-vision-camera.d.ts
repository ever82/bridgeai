export declare const VisionCameraProxy: {
    getFrameProcessorPlugin: jest.Mock<{
        call: jest.Mock<any, any, any>;
    }, [], any>;
};
export declare const Camera: {
    getCameraPermissionStatus: jest.Mock<any, any, any>;
    requestCameraPermission: jest.Mock<any, any, any>;
    getMicrophonePermissionStatus: jest.Mock<any, any, any>;
    requestMicrophonePermission: jest.Mock<any, any, any>;
    takePhoto: jest.Mock<any, any, any>;
    startRecording: jest.Mock<any, any, any>;
    stopRecording: jest.Mock<any, any, any>;
};
export declare const useCameraDevices: jest.Mock<{
    back: {
        id: string;
        position: string;
    };
    front: {
        id: string;
        position: string;
    };
}, [], any>;
export declare const useFrameProcessor: jest.Mock<any, [callback: any], any>;
declare const _default: {
    VisionCameraProxy: {
        getFrameProcessorPlugin: jest.Mock<{
            call: jest.Mock<any, any, any>;
        }, [], any>;
    };
    Camera: {
        getCameraPermissionStatus: jest.Mock<any, any, any>;
        requestCameraPermission: jest.Mock<any, any, any>;
        getMicrophonePermissionStatus: jest.Mock<any, any, any>;
        requestMicrophonePermission: jest.Mock<any, any, any>;
        takePhoto: jest.Mock<any, any, any>;
        startRecording: jest.Mock<any, any, any>;
        stopRecording: jest.Mock<any, any, any>;
    };
    useCameraDevices: jest.Mock<{
        back: {
            id: string;
            position: string;
        };
        front: {
            id: string;
            position: string;
        };
    }, [], any>;
    useFrameProcessor: jest.Mock<any, [callback: any], any>;
};
export default _default;
//# sourceMappingURL=react-native-vision-camera.d.ts.map