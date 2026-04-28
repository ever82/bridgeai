/**
 * Navigation types for the app
 */

import { NavigationProp } from '@react-navigation/native';
import { Agent } from '@bridgeai/shared';

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
  Messages: undefined;
  Discover: undefined;
  Profile: undefined;
};

export type DiscoverStackParamList = {
  DiscoverMain: undefined;
  Search: undefined;
  CategoryMoments: { categoryId: string; categoryName: string };
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
  CreateAgent: { agent?: Agent } | undefined;
  EditAgent: { agentId: string };
  TransactionList: undefined;
  TransactionDetail: { transactionId: string };
  PointsTransactionDetail: { transactionId?: string; transaction?: { id: string } };
  PointsWallet: undefined;
  RefundList: undefined;
  RefundDetail: { refundId: string };
  CreateRefund: { transactionId: string };
  CreateAppeal: { refundId: string };
  Activity: undefined;
};

export type MessagesStackParamList = {
  MessagesList: undefined;
  Chat: { conversationId: string; userName: string };
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

export type MessagesStackParamList = {
  MessagesList: undefined;
  Chat: { conversationId: string; userName: string };
  MessageSearch: undefined;
  NewChat: undefined;
  NotificationDetail: { notificationId: string };
  MessageSettings: undefined;
};

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export type RootStackNavigationProp = NavigationProp<RootStackParamList>;
