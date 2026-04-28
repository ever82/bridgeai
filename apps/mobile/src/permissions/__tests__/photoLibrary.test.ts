import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';

import { PhotoLibraryPermissionManager, PhotoPermissionState } from '../photoLibrary';

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
  PERMISSIONS: {
    IOS: {
      PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
      PHOTO_LIBRARY_ADD_ONLY: 'ios.permission.PHOTO_LIBRARY_ADD_ONLY',
    },
    ANDROID: {
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
      READ_MEDIA_VIDEO: 'android.permission.READ_MEDIA_VIDEO',
    },
  },
  RESULTS: {
    UNAVAILABLE: 'unavailable',
    DENIED: 'denied',
    LIMITED: 'limited',
    GRANTED: 'granted',
    BLOCKED: 'blocked',
  },
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '15.0',
    select: jest.fn((obj: { ios?: unknown; android?: unknown }) => obj.ios),
  },
  PermissionsAndroid: {
    request: jest.fn(),
    check: jest.fn(),
    PERMISSIONS: {
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
    },
  },
}));

describe('PhotoLibraryPermissionManager', () => {
  let manager: PhotoLibraryPermissionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (
      PhotoLibraryPermissionManager as unknown as { instance: PhotoLibraryPermissionManager | null }
    ).instance = null;
    manager = PhotoLibraryPermissionManager.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = PhotoLibraryPermissionManager.getInstance();
      const instance2 = PhotoLibraryPermissionManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('checkPermission', () => {
    it('returns granted state when permission is granted', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const state = await manager.checkPermission();

      expect(state.status).toBe('granted');
      expect(state.hasFullAccess).toBe(true);
      expect(state.hasPartialAccess).toBe(false);
      expect(state.canAskAgain).toBe(false);
    });

    it('returns limited state for iOS 14+ limited access', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.LIMITED);

      const state = await manager.checkPermission();

      expect(state.status).toBe('limited');
      expect(state.hasFullAccess).toBe(false);
      expect(state.hasPartialAccess).toBe(true);
      // LIMITED maps to canAskAgain=false in mapIOSStatus (only DENIED is true)
      expect(state.canAskAgain).toBe(false);
    });

    it('returns denied state when permission is denied', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const state = await manager.checkPermission();

      expect(state.status).toBe('denied');
      expect(state.hasFullAccess).toBe(false);
      expect(state.hasPartialAccess).toBe(false);
      expect(state.canAskAgain).toBe(true);
    });

    it('returns blocked state when permission is blocked', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.BLOCKED);

      const state = await manager.checkPermission();

      expect(state.status).toBe('blocked');
      expect(state.hasFullAccess).toBe(false);
      expect(state.hasPartialAccess).toBe(false);
      expect(state.canAskAgain).toBe(false);
    });

    it('returns unavailable state when permission is unavailable', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.UNAVAILABLE);

      const state = await manager.checkPermission();

      expect(state.status).toBe('unavailable');
    });
  });

  describe('requestPermission', () => {
    it('requests full photo library access', async () => {
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const state = await manager.requestPermission();

      expect(request).toHaveBeenCalledWith(PERMISSIONS.IOS.PHOTO_LIBRARY);
      expect(state.status).toBe('granted');
    });

    it('handles limited access on iOS 14+', async () => {
      (request as jest.Mock).mockResolvedValue(RESULTS.LIMITED);

      const state = await manager.requestPermission();

      expect(state.status).toBe('limited');
      expect(state.hasPartialAccess).toBe(true);
    });

    it('returns denied when user rejects permission', async () => {
      (request as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const state = await manager.requestPermission();

      expect(state.status).toBe('denied');
      expect(state.canAskAgain).toBe(true);
    });
  });

  describe('Permission Status Management', () => {
    it('notifies listeners when permission state changes via request', async () => {
      const listener = jest.fn();
      manager.subscribe(listener);

      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);
      await manager.requestPermission();

      expect(listener).toHaveBeenCalled();
      const state = listener.mock.calls[0][0] as PhotoPermissionState;
      expect(state.status).toBe('granted');
    });

    it('allows unsubscribing listeners', async () => {
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);

      unsubscribe();

      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);
      await manager.checkPermission();

      // Should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });

    it('stores current state after check', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      await manager.checkPermission();

      // getCurrentState should return the last checked state
      const cached = manager.getCurrentState();
      expect(cached).not.toBeNull();
      expect(cached!.status).toBe('granted');
    });
  });

  describe('Permission Denial Handling', () => {
    it('reports blocked state correctly', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.BLOCKED);

      const state = await manager.checkPermission();

      expect(state.status).toBe('blocked');
      expect(state.canAskAgain).toBe(false);
      expect(state.hasFullAccess).toBe(false);
    });

    it('reports denied state with canAskAgain', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const state = await manager.checkPermission();

      expect(state.status).toBe('denied');
      expect(state.canAskAgain).toBe(true);
    });
  });

  describe('Partial Access Support (iOS 14+)', () => {
    it('detects partial access correctly', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.LIMITED);

      const state = await manager.checkPermission();

      expect(state.hasPartialAccess).toBe(true);
      expect(state.hasFullAccess).toBe(false);
    });

    it('allows upgrading from limited to full access', async () => {
      // Start with limited access
      (check as jest.Mock).mockResolvedValue(RESULTS.LIMITED);
      await manager.checkPermission();

      // Request full access
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);
      const newState = await manager.requestPermission();

      expect(newState.status).toBe('granted');
      expect(newState.hasFullAccess).toBe(true);
      expect(newState.hasPartialAccess).toBe(false);
    });
  });

  describe('Android Permissions', () => {
    beforeEach(() => {
      (Platform.OS as string) = 'android';
      (Platform.Version as number) = 33;
    });

    it('requests media images and video permissions on Android 33+', async () => {
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const state = await manager.requestPermission();

      expect(state.status).toBe('granted');
      expect(request).toHaveBeenCalledWith(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
      expect(request).toHaveBeenCalledWith(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO);
    });

    it('requests external storage permission on older Android', async () => {
      (Platform.Version as number) = 30;
      (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      const state = await manager.requestPermission();

      expect(state.status).toBe('granted');
      expect(request).toHaveBeenCalledWith(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
    });
  });
});
