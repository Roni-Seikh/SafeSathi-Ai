import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/navigation.types';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { PersonalInfoScreen } from '../screens/Profile/PersonalInfoScreen';
import { MedicalInfoScreen } from '../screens/Profile/MedicalInfoScreen';
import { SafetyPreferencesScreen } from '../screens/Profile/SafetyPreferencesScreen';
import { ContactsScreen } from '../screens/Contacts/ContactsScreen';
import { AddEditContactScreen } from '../screens/Contacts/AddEditContactScreen';
import { SOSActiveScreen } from '../screens/SOS/SOSActiveScreen';
import { ShareLocationScreen } from '../screens/Location/ShareLocationScreen';
import { ViewLiveLocationScreen } from '../screens/Location/ViewLiveLocationScreen';
import { ReportIncidentScreen } from '../screens/Reports/ReportIncidentScreen';
import { CommunityAlertsScreen } from '../screens/Community/CommunityAlertsScreen';
import { SafeRouteScreen } from '../screens/SafeRoute/SafeRouteScreen';
import { RiskZonesScreen } from '../screens/RiskZones/RiskZonesScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { useBackgroundDetection } from '../hooks/useBackgroundDetection';
import { colors, typography } from '../constants/theme';

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * A single stack, not yet the bottom-tab shell shown in
 * docs/architecture/WIREFRAMES.md — Map and Chat only become real tabs in
 * Phases 5–6 once Safe Route/Heatmap and the AI Chatbot exist. Adding
 * those tabs now would mean either faking their content or shipping an
 * empty "coming soon" tab, and a single stack navigated from Home's
 * quick-action tiles is a more honest, equally usable shell until then.
 */
export function AppNavigator() {
  useBackgroundDetection();

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
        headerTitleStyle: typography.h3,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} options={{ title: 'Personal Information' }} />
      <Stack.Screen name="MedicalInfo" component={MedicalInfoScreen} options={{ title: 'Medical Information' }} />
      <Stack.Screen
        name="SafetyPreferences"
        component={SafetyPreferencesScreen}
        options={{ title: 'Safety Preferences' }}
      />
      <Stack.Screen name="Contacts" component={ContactsScreen} options={{ title: 'Emergency Contacts' }} />
      <Stack.Screen
        name="AddEditContact"
        component={AddEditContactScreen}
        options={{ title: 'Emergency Contact' }}
      />
      <Stack.Screen
        name="SOSActive"
        component={SOSActiveScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="ShareLocation" component={ShareLocationScreen} options={{ title: 'Share Live Location' }} />
      <Stack.Screen
        name="ViewLiveLocation"
        component={ViewLiveLocationScreen}
        options={{ title: 'Live Location' }}
      />
      <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} options={{ title: 'Report an Incident' }} />
      <Stack.Screen name="CommunityAlerts" component={CommunityAlertsScreen} options={{ title: 'Community Alerts' }} />
      <Stack.Screen name="SafeRoute" component={SafeRouteScreen} options={{ title: 'Safe Route' }} />
      <Stack.Screen name="RiskZones" component={RiskZonesScreen} options={{ title: 'Risk Zones' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}
