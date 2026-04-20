export const PERMISSIONS = {
  ANDROID: {
    CAMERA: 'android.permission.CAMERA',
    READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
    WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
    READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
    POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
  },
  IOS: {
    CAMERA: 'ios.permission.CAMERA',
    PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
    LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
    NOTIFICATIONS: 'ios.permission.NOTIFICATIONS',
    MICROPHONE: 'ios.permission.MICROPHONE',
  },
};

export const check = jest.fn().mockResolvedValue('granted');
export const request = jest.fn().mockResolvedValue('granted');
export const openSettings = jest.fn().mockResolvedValue(true);
export const checkNotifications = jest.fn().mockResolvedValue({ status: 'granted' });
export const requestNotifications = jest.fn().mockResolvedValue({ status: 'granted' });

export default {
  PERMISSIONS,
  check,
  request,
  openSettings,
  checkNotifications,
  requestNotifications,
};
