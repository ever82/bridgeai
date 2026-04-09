/**
 * Sample test data for tests
 */

export const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.png',
  createdAt: new Date().toISOString(),
};

export const mockMediaItem = {
  id: 'media-1',
  type: 'image' as const,
  url: 'https://example.com/image.jpg',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  width: 1920,
  height: 1080,
  duration: null,
  createdAt: new Date().toISOString(),
  userId: 'user-1',
};

export const mockVideoItem = {
  id: 'media-2',
  type: 'video' as const,
  url: 'https://example.com/video.mp4',
  thumbnailUrl: 'https://example.com/video-thumb.jpg',
  width: 1920,
  height: 1080,
  duration: 30,
  createdAt: new Date().toISOString(),
  userId: 'user-1',
};

export const mockAlbum = {
  id: 'album-1',
  name: 'Test Album',
  coverUrl: 'https://example.com/cover.jpg',
  itemCount: 5,
  createdAt: new Date().toISOString(),
  userId: 'user-1',
};

export const mockLocation = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};
