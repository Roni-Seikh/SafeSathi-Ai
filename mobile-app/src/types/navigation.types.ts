export type AuthStackParamList = {
  Onboarding: undefined;
  Register: undefined;
  Login: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
  PersonalInfo: undefined;
  MedicalInfo: undefined;
  SafetyPreferences: undefined;
  Contacts: undefined;
  AddEditContact: { contactId?: string } | undefined;
  SOSActive: undefined;
  ShareLocation: undefined;
  ViewLiveLocation: { sharerUserId: string; sharerName?: string };
  ReportIncident: undefined;
  CommunityAlerts: undefined;
  SafeRoute: undefined;
  RiskZones: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  App: undefined;
};
