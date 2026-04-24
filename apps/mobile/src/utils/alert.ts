import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert that works on both React Native and Web.
 *
 * On native: uses Alert.alert
 * On web: uses window.alert (title + message concatenated)
 */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}
