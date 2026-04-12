/**
 * Navigation types for the app
 */

import { NavigationProp } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Purchase: { couponId: string };
  CouponList: undefined;
  CouponStatistics: undefined;
  Rating: {
    couponId: string;
    rateeId: string;
    raterType: 'CONSUMER' | 'MERCHANT';
    merchantName: string;
  };
  MerchantRedeem: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Create: undefined;
  Activity: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  MomentDetail: { momentId: string };
  UserProfile: { userId: string };
};

export type ExploreStackParamList = {
  ExploreMain: undefined;
  Search: undefined;
  CategoryMoments: { categoryId: string; categoryName: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
  EditProfile: undefined;
  MyMoments: undefined;
  LikedMoments: undefined;
  AgentList: undefined;
  CreateAgent: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export type RootStackNavigationProp = NavigationProp<RootStackParamList>;
