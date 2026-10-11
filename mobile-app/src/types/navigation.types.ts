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
  AutoSOSCountdown: {
    source: 'voice_keyword' | 'tone' | 'shake';
    keyword?: 'help' | 'save_me' | 'bachao' | 'chere_din' | 'stop' | 'none';
    transcript?: string;
    confidence?: number;
    language?: 'en' | 'hi' | 'bn';
    screamScore?: number;
    seconds: number;
  };
  SathiChat: { prefill?: string } | undefined;
  GuardianJourney: undefined;
  SafeHaven: undefined;
  FakeCall: undefined;
  EvidenceVault: { sosId?: string } | undefined;
  VoiceTest: undefined;
  SecurityPins: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  App: undefined;
};
