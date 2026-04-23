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
  SecuritySettings: undefined;
  DeviceManagement: undefined;
  PrivacySettings: undefined;
  BlockedUsers: undefined;
  DisclosureSettings: { agentId?: string };
  DisclosurePreview: { agentId?: string; fields?: { fieldName: string; currentLevel: string }[] };
  MyMoments: undefined;
  LikedMoments: undefined;
  ReviewList: undefined;
  ReviewDetail: { reviewId: string };
  WriteReview: {
    matchId: string;
    rateeId: string;
    rateeName: string;
    matchTitle: string;
  };
  AgentList: undefined;
  CreateAgent: undefined;
};

export type JobStackParamList = {
  JobList: undefined;
  JobPosting: { jobId?: string } | undefined;
  JobDetail: { jobId: string };
  ReceivedResumes: { jobId: string };
  CompanyVerification: undefined;
  JobRecommendations: undefined;
  CandidateRecommendations: { jobId?: string } | undefined;
};

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export type RootStackNavigationProp = NavigationProp<RootStackParamList>;
