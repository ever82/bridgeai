/**
 * Navigation types for the app
 */

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
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

export type JobStackParamList = {
  JobList: undefined;
  JobPosting: { jobId?: string } | undefined;
  JobDetail: { jobId: string };
  ReceivedResumes: { jobId: string };
  CompanyVerification: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
