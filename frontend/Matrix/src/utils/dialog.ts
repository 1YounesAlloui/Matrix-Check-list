import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog that works on Web (window.confirm)
 * and Native iOS/Android (Alert.alert).
 */
export const confirmAction = (
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmText: string = 'Delete'
) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        onConfirm();
      }
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: confirmText,
        style: 'destructive',
        onPress: () => {
          onConfirm();
        },
      },
    ]);
  }
};
