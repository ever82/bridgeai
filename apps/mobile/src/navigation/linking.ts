import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

/**
 * Deep linking configuration for the app
 * Supports universal links and custom URL schemes
 */
export const linking: LinkingOptions<RootStackParamList> = {
  // URL prefixes that the app will handle
  prefixes: [
    'visionshare://', // Custom URL scheme
    'https://visionshare.app', // Universal link (production)
    'https://staging.visionshare.app', // Universal link (staging)
    'https://dev.visionshare.app', // Universal link (development)
  ],

  // Navigation configuration for deep links
  config: {
    // Initial route name when accessed via deep link
    initialRouteName: 'Main',

    // Screen configuration
    screens: {
      // Auth screens
      Auth: {
        path: 'auth',
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
        },
      },

      // Main app with tab navigation
      Main: {
        path: '',
        screens: {
          Home: 'home',
          Messages: 'messages',
          Discover: 'discover',
          Profile: 'profile',
        },
      },

      // Drawer navigation
      Drawer: 'menu',
    },
  },

  // Custom function to get the initial URL
  getInitialURL: async () => {
    // The native handling will be used by default
    // This can be customized if needed for specific platforms
    return null;
  },

  // Subscribe to incoming links
  subscribe: (listener) => {
    // The default subscription is handled by React Navigation
    // Return unsubscribe function
    return () => {
      // Cleanup if needed
    };
  },

  // Custom function to check if a URL can be handled
  getStateFromPath: (path, config) => {
    // Handle special cases or custom path parsing
    // For example: handle /user/:id or /moment/:id patterns

    // Check for user profile deep link: /user/:userId
    const userMatch = path.match(/^\/user\/([^\/]+)$/);
    if (userMatch) {
      return {
        routes: [
          {
            name: 'Main',
            state: {
              routes: [
                {
                  name: 'Home',
                  state: {
                    routes: [
                      {
                        name: 'UserProfile',
                        params: { userId: userMatch[1] },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      };
    }

    // Check for moment detail deep link: /moment/:momentId
    const momentMatch = path.match(/^\/moment\/([^\/]+)$/);
    if (momentMatch) {
      return {
        routes: [
          {
            name: 'Main',
            state: {
              routes: [
                {
                  name: 'Home',
                  state: {
                    routes: [
                      {
                        name: 'MomentDetail',
                        params: { momentId: momentMatch[1] },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      };
    }

    // Check for chat deep link: /chat/:conversationId
    const chatMatch = path.match(/^\/chat\/([^\/]+)$/);
    if (chatMatch) {
      return {
        routes: [
          {
            name: 'Main',
            state: {
              routes: [
                {
                  name: 'Messages',
                  state: {
                    routes: [
                      {
                        name: 'Chat',
                        params: { conversationId: chatMatch[1] },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      };
    }

    // Default handling
    return undefined;
  },
};
