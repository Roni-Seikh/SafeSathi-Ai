import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { useAppSelector } from '../store/hooks';
import { useAuth } from '../hooks/useAuth';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { SplashScreen } from '../screens/Splash/SplashScreen';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { navigationRef } from './navigationRef';
import { colors } from '../constants/theme';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    primary: colors.primary,
    text: colors.textPrimary,
    border: colors.glassBorder,
  },
};

export function RootNavigator() {
  const { isInitializing } = useAuth();
  const authStatus = useAppSelector((state) => state.auth.status);
  usePushNotifications();

  if (isInitializing) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {authStatus === 'authenticated' ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
