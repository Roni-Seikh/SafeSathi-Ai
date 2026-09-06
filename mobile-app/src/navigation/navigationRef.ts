import { createNavigationContainerRef } from '@react-navigation/native';
import { AppStackParamList } from '../types/navigation.types';

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

export function navigate<RouteName extends keyof AppStackParamList>(
  name: RouteName,
  params: AppStackParamList[RouteName]
): void {
  if (navigationRef.isReady()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigationRef.navigate(name as any, params as any);
  }
}
