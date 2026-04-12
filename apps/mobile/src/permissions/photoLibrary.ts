import {
  Platform,
  PermissionsAndroid,
  type PermissionStatus as AndroidPermissionStatus,
} from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  type PermissionStatus as IOSPermissionStatus,
} from 'react-native-permissions';

export type PhotoPermissionStatus =
  | 'granted'
  | 'denied'
  | 'limited'
  | 'blocked'
  | 'unavailable';

export interface PhotoPermissionState {
  status: PhotoPermissionStatus;
  hasFullAccess: boolean;
  hasPartialAccess: boolean;
  canAskAgain: boolean;
}

const IOS_PHOTO_PERMISSIONS = {
  full: PERMISSIONS.IOS.PHOTO_LIBRARY,
  addOnly: PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY,
};

const ANDROID_PHOTO_PERMISSIONS = {
  read: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
  readImages: PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
  readVideo: PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
};

export class PhotoLibraryPermissionManager {
  private static instance: PhotoLibraryPermissionManager;
  private currentState: PhotoPermissionState | null = null;
  private listeners: Set<(state: PhotoPermissionState) => void> = new Set();

  static getInstance(): PhotoLibraryPermissionManager {
    if (!PhotoLibraryPermissionManager.instance) {
      PhotoLibraryPermissionManager.instance = new PhotoLibraryPermissionManager();
    }
    return PhotoLibraryPermissionManager.instance;
  }

  async checkPermission(): Promise<PhotoPermissionState> {
    if (Platform.OS === 'ios') {
      return this.checkIOSPermission();
    } else {
      return this.checkAndroidPermission();
    }
  }

  private async checkIOSPermission(): Promise<PhotoPermissionState> {
    const status = await check(IOS_PHOTO_PERMISSIONS.full);
    const state = this.mapIOSStatus(status);
    this.currentState = state;
    return state;
  }

  private async checkAndroidPermission(): Promise<PhotoPermissionState> {
    if (Platform.Version >= 33) {
      const [imagesStatus, videoStatus] = await Promise.all([
        check(ANDROID_PHOTO_PERMISSIONS.readImages),
        check(ANDROID_PHOTO_PERMISSIONS.readVideo),
      ]);

      const granted =
        imagesStatus === RESULTS.GRANTED && videoStatus === RESULTS.GRANTED;
      const denied =
        imagesStatus === RESULTS.DENIED || videoStatus === RESULTS.DENIED;
      const blocked =
        imagesStatus === RESULTS.BLOCKED || videoStatus === RESULTS.BLOCKED;

      const state: PhotoPermissionState = {
        status: granted
          ? 'granted'
          : blocked
            ? 'blocked'
            : denied
              ? 'denied'
              : 'unavailable',
        hasFullAccess: granted,
        hasPartialAccess: false,
        canAskAgain: denied && !blocked,
      };
      this.currentState = state;
      return state;
    } else {
      const status = await check(ANDROID_PHOTO_PERMISSIONS.read);
      const state = this.mapAndroidStatus(status);
      this.currentState = state;
      return state;
    }
  }

  async requestPermission(): Promise<PhotoPermissionState> {
    if (Platform.OS === 'ios') {
      return this.requestIOSPermission();
    } else {
      return this.requestAndroidPermission();
    }
  }

  private async requestIOSPermission(): Promise<PhotoPermissionState> {
    const status = await request(IOS_PHOTO_PERMISSIONS.full);
    const state = this.mapIOSStatus(status);
    this.currentState = state;
    this.notifyListeners(state);
    return state;
  }

  private async requestAndroidPermission(): Promise<PhotoPermissionState> {
    if (Platform.Version >= 33) {
      const [imagesStatus, videoStatus] = await Promise.all([
        request(ANDROID_PHOTO_PERMISSIONS.readImages),
        request(ANDROID_PHOTO_PERMISSIONS.readVideo),
      ]);

      const granted =
        imagesStatus === RESULTS.GRANTED && videoStatus === RESULTS.GRANTED;
      const denied =
        imagesStatus === RESULTS.DENIED || videoStatus === RESULTS.DENIED;
      const blocked =
        imagesStatus === RESULTS.BLOCKED || videoStatus === RESULTS.BLOCKED;

      const state: PhotoPermissionState = {
        status: granted
          ? 'granted'
          : blocked
            ? 'blocked'
            : denied
              ? 'denied'
              : 'unavailable',
        hasFullAccess: granted,
        hasPartialAccess: false,
        canAskAgain: denied && !blocked,
      };
      this.currentState = state;
      this.notifyListeners(state);
      return state;
    } else {
      const status = await request(ANDROID_PHOTO_PERMISSIONS.read);
      const state = this.mapAndroidStatus(status);
      this.currentState = state;
      this.notifyListeners(state);
      return state;
    }
  }

  private mapIOSStatus(status: IOSPermissionStatus): PhotoPermissionState {
    const isLimited = status === RESULTS.LIMITED;
    const isGranted = status === RESULTS.GRANTED || isLimited;

    return {
      status:
        status === RESULTS.GRANTED
          ? 'granted'
          : status === RESULTS.LIMITED
            ? 'limited'
            : status === RESULTS.DENIED
              ? 'denied'
              : status === RESULTS.BLOCKED
                ? 'blocked'
                : 'unavailable',
      hasFullAccess: status === RESULTS.GRANTED,
      hasPartialAccess: isLimited,
      canAskAgain: status === RESULTS.DENIED,
    };
  }

  private mapAndroidStatus(status: AndroidPermissionStatus): PhotoPermissionState {
    return {
      status:
        status === RESULTS.GRANTED
          ? 'granted'
          : status === RESULTS.DENIED
            ? 'denied'
            : status === RESULTS.BLOCKED
              ? 'blocked'
              : 'unavailable',
      hasFullAccess: status === RESULTS.GRANTED,
      hasPartialAccess: false,
      canAskAgain: status === RESULTS.DENIED,
    };
  }

  getCurrentState(): PhotoPermissionState | null {
    return this.currentState;
  }

  subscribe(listener: (state: PhotoPermissionState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(state: PhotoPermissionState): void {
    this.listeners.forEach(listener => listener(state));
  }

  async requestLimitedAccessUpgrade(): Promise<PhotoPermissionState> {
    if (Platform.OS !== 'ios') {
      return this.currentState || await this.checkPermission();
    }
    return this.requestIOSPermission();
  }
}

export const photoLibraryPermission = PhotoLibraryPermissionManager.getInstance();
