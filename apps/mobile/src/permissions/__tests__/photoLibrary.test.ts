import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { PermissionsAndroid, Platform } from 'react-native';

import {
  PhotoLibraryPermissionManager,
  PhotoPermissionState,
  PhotoPermissionStatus,
} from '../photoLibrary';

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
    (PhotoLibraryPermissionManager as unknown as { instance: PhotoLibraryPermissionManager | null }).instance = null;
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
      expect(state.canAskAgain).toBe(true);
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
    it('notifies listeners when permission state changes', async () => {
      const listener = jest.fn();
      manager.subscribe(listener);

      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);
      await manager.checkPermission();

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

    it('returns cached state if available and not expired', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

      // First check
      await manager.checkPermission();

      // Second check should use cache
      const state = await manager.checkPermission();

      // check should only be called once due to caching
      expect(check).toHaveBeenCalledTimes(1);
      expect(state.status).toBe('granted');
    });
  });

  describe('Permission Denial Handling', () => {
    it('provides guidance when permission is blocked', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.BLOCKED);

      const state = await manager.checkPermission();
      const guidance = manager.getPermissionGuidance(state.status);

      expect(guidance.canOpenSettings).toBe(true);
      expect(guidance.message).toContain('Settings');
    });

    it('provides appropriate message for denied permission', async () => {
      (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);

      const state = await manager.checkPermission();
      const guidance = manager.getPermissionGuidance(state.status);

      expect(guidance.canRequestAgain).toBe(true);
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
      (Platform.Version as number) = 13;
    });

    it('requests media images permission on Android 13+', async () => {
      (PermissionsAndroid.request as jest.Mock).mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);

      await manager.requestPermission();

      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
      );
    });
  });
});
