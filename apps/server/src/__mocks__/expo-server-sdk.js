/**
 * Mock for expo-server-sdk
 */
const Expo = jest.fn().mockImplementation(() => ({
    sendPushNotificationsAsync: jest.fn().mockResolvedValue([]),
}));
export { Expo };
export default { Expo };
//# sourceMappingURL=expo-server-sdk.js.map