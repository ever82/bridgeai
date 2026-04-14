/**
 * Job Stack Navigator
 *
 * Navigation stack for job-related screens including
 * job listings, recommendations, and candidate management
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { JobStackParamList } from '../../types/navigation';

import { JobListScreen } from './JobListScreen';
import { JobPostingScreen } from './JobPostingScreen';
import { ReceivedResumesScreen } from './ReceivedResumesScreen';
import { CompanyVerificationScreen } from './CompanyVerificationScreen';
import { JobRecommendationsScreen } from './JobRecommendationsScreen';
import { CandidateRecommendationsScreen } from './CandidateRecommendationsScreen';

const Stack = createNativeStackNavigator<JobStackParamList>();

export const JobStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="JobList" component={JobListScreen} />
      <Stack.Screen name="JobPosting" component={JobPostingScreen} />
      <Stack.Screen name="JobDetail" component={JobPostingScreen} />
      <Stack.Screen name="ReceivedResumes" component={ReceivedResumesScreen} />
      <Stack.Screen name="CompanyVerification" component={CompanyVerificationScreen} />
      <Stack.Screen name="JobRecommendations" component={JobRecommendationsScreen} />
      <Stack.Screen name="CandidateRecommendations" component={CandidateRecommendationsScreen} />
    </Stack.Navigator>
  );
};
