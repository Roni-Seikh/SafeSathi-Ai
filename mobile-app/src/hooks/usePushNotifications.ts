import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '../services/pushNotifications';
import { navigate } from '../navigation/navigationRef';
import { useAppSelector } from '../store/hooks';

/**
 * Registers this device's push token with the backend once signed in, and
 * routes a tapped notification to the right screen — currently only
 * sos_alert / location_share_started, which both carry a sharerUserId and
 * open the live-location viewer. Other notification types just open the
 * app to wherever RootNavigator already has it (Home), since there's no
 * dedicated screen for them yet.
 */
export function usePushNotifications(): void {
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');

  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotifications().catch(() => undefined);
  }, [isAuthenticated]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { sharerUserId?: string; sosLogId?: string };
      if (data?.sharerUserId) {
        navigate('ViewLiveLocation', { sharerUserId: data.sharerUserId });
      }
    });
    return () => subscription.remove();
  }, []);
}
