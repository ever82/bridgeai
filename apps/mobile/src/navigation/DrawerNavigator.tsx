import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';

import { DrawerMenu } from '../components/DrawerMenu/DrawerMenu';
import { theme } from '../theme';

import { MainTabNavigator } from './MainTabNavigator';

const Drawer = createDrawerNavigator();

export const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerMenu {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: 280,
          backgroundColor: theme.colors.background,
        },
        drawerType: 'front',
        overlayColor: theme.colors.overlay,
        swipeEnabled: true,
        swipeEdgeWidth: 100,
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabNavigator} />
    </Drawer.Navigator>
  );
};
