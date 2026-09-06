import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerFcmToken } from './userApi';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Gets the device's *native* push token (FCM on Android, APNs on iOS) via
 * expo-notifications — not an Expo push token — because the backend sends
 * pushes directly through firebase-admin's messaging().send(), which needs
 * a real platform token. This only resolves in a custom dev/production
 * build with a real google-services.json; it will not work in Expo Go on
 * Android, since Expo Go's package name doesn't match your Firebase
 * Android app. See mobile-app/README.md §1.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sos-alerts', {
      name: 'SOS & Safety Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  const { data: token } = await Notifications.getDevicePushTokenAsync();
  await registerFcmToken(token);
  return token;
}
