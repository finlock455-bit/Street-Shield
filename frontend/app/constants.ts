import { Dimensions } from 'react-native';
import * as Notifications from 'expo-notifications';

// Suppress known Expo Go warnings that don't affect functionality
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  if (args[0]?.includes?.('React.Fragment')) return;
  if (args[0]?.includes?.('expo-router')) return;
  if (args[0]?.includes?.('Unexpected text node')) return;
  originalError(...args);
};

console.warn = (...args: any[]) => {
  if (args[0]?.includes?.('expo-notifications')) return;
  if (args[0]?.includes?.('remote notifications')) return;
  originalWarn(...args);
};

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const ALERT_COOLDOWNS: Record<string, number> = {
  default: 60000,
  weather_update: 300000,
  proximity: 30000,
  critical_alert: 0,
  info_request: 0,
};
