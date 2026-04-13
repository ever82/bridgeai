/**
 * Navigation types for the app
 */

import { NavigatorScreenParams } from '@react-navigation/native';

// Root Stack Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Drawer: undefined;
  MomentDetail: { momentId: string };
  UserProfile: { userId: string };
  Settings: undefined;
  EditProfile: undefined;
  Chat: { conversationId: string; userId?: string; userName?: string };
};

// Auth Stack Navigator
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Messages: undefined;
  Discover: undefined;
  Profile: undefined;
};

// Home Stack Navigator
export type HomeStackParamList = {
  HomeMain: undefined;
  MomentDetail: { momentId: string };
  UserProfile: { userId: string };
};

// Messages Stack Navigator
export type MessagesStackParamList = {
  MessagesList: undefined;
  Chat: { conversationId: string; userId: string; userName: string };
};

// Discover Stack Navigator
export type DiscoverStackParamList = {
  DiscoverMain: undefined;
  Search: undefined;
  CategoryMoments: { categoryId: string; categoryName: string };
};

// Profile Stack Navigator
export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
  EditProfile: undefined;
  MyMoments: undefined;
  LikedMoments: undefined;
  AgentList: undefined;
  CreateAgent: undefined;
};

// Deep linking configuration types
export type LinkingConfig = {
  prefixes: string[];
  config: {
    screens: {
      Auth: string;
      Main: {
        screens: {
          Home: string;
          Messages: string;
          Discover: string;
          Profile: string;
        };
      };
      MomentDetail: string;
      UserProfile: string;
      Chat: string;
      Settings: string;
    };
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
