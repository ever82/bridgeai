import { NavigatorScreenParams } from '@react-navigation/native';

// Main Tab Navigation
export type MainTabParamList = {
  Home: undefined;
  Tasks: undefined;
  VisionShare: NavigatorScreenParams<VisionShareStackParamList>;
  Profile: undefined;
};

// VisionShare Stack Navigation
export type VisionShareStackParamList = {
  VisionShareHome: undefined;
  TaskDetail: {
    taskId: string;
  };
  Camera: {
    taskId?: string;
    maxPhotos?: number;
    fromScreen?: string;
  };
  PhotoEdit: {
    photos: Array<{
      uri: string;
      width?: number;
      height?: number;
      timestamp?: number;
    }>;
    taskId?: string;
    fromScreen?: string;
  };
  ImportPhotos: {
    taskId?: string;
    maxPhotos?: number;
    fromScreen?: string;
  };
};

// Root Stack Navigation
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  VisionShare: NavigatorScreenParams<VisionShareStackParamList>;
};

// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
