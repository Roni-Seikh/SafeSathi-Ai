module.exports = ({ config }) => ({
  ...config,

  extra: {
    ...config.extra,

    apiBaseUrl: process.env.API_BASE_URL,
    socketUrl: process.env.SOCKET_URL,

    firebaseApiKey: process.env.FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.FIREBASE_APP_ID,

    mapTilerApiKey: process.env.MAPTILER_API_KEY,

    defaultVoiceDetectionEnabled:
      process.env.DEFAULT_VOICE_DETECTION_ENABLED === 'true',

    defaultMotionDetectionEnabled:
      process.env.DEFAULT_MOTION_DETECTION_ENABLED === 'true',

    defaultAutoSosEnabled:
      process.env.DEFAULT_AUTO_SOS_ENABLED === 'true',
  },
});
